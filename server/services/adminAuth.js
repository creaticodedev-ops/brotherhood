import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { dbState } from '../configs/db.js'
import { AdminAccount } from '../models/AdminAccount.js'
import { StaffAccount, toStaff } from '../models/StaffAccount.js'
import { hashPassword, MIN_PASSWORD, verifyPassword } from './password.js'

const COOKIE = 'usb_admin'
const COOKIE_PATH = '/api/admin'
const SESSION_MS = 12 * 3_600_000
const FAILURE_WINDOW_MS = 15 * 60_000
const MAX_FAILURES = 8
const RESET_TTL_MS = 30 * 60_000
const RESET_COOLDOWN_MS = 60_000

const failures = new Map()

// In-memory copy of the account document; every change goes through this module.
let account = null
let loading = null

const sha256 = (value) => createHash('sha256').update(String(value)).digest()
const safeEqual = (a, b) => timingSafeEqual(sha256(a), sha256(b))

/**
 * Loads the administrator account. On first start it is created from ADMIN_PASSWORD, which is hashed
 * immediately; from then on the database hash is the only credential and the variable can be removed.
 */
export const loadAdminAccount = () => {
  if (account || dbState() !== 'connected') return Promise.resolve(account)
  loading ||= (async () => {
    try {
      let doc = await AdminAccount.findOne({ key: 'primary' }).lean()
      const initial = process.env.ADMIN_PASSWORD?.trim() || ''
      if (!doc && initial.length >= MIN_PASSWORD) {
        doc = (await AdminAccount.create({ passwordHash: await hashPassword(initial), sessionSecret: randomBytes(32).toString('base64url') })).toObject()
        console.log('[admin] Administrator account created - the password is stored hashed; ADMIN_PASSWORD can now be removed from server/.env')
      } else if (doc && initial) {
        console.warn('[admin] ADMIN_PASSWORD is ignored: the account already exists. Remove it from server/.env and use "Forgot password" to change it.')
      }
      account = doc
      return account
    } finally {
      loading = null
    }
  })()
  return loading
}

export const adminConfigured = () => Boolean(account?.passwordHash)

const secret = () => process.env.ADMIN_SESSION_SECRET?.trim() || account.sessionSecret

const sign = (payload) => createHmac('sha256', secret()).update(payload).digest('base64url')

export const checkPassword = async (candidate) => adminConfigured() && verifyPassword(candidate, account.passwordHash)

const splitToken = (token) => {
  const cut = String(token || '').lastIndexOf('.')
  if (cut < 0) return null
  const payload = token.slice(0, cut)
  return { payload, signature: token.slice(cut + 1), parts: payload.split('.') }
}

const signatureOk = (token) => {
  const parsed = splitToken(token)
  return Boolean(parsed && Number(parsed.parts[1]) > Date.now() && safeEqual(parsed.signature, sign(parsed.payload)))
}

const verifyToken = (token) => {
  const parsed = splitToken(token)
  if (!parsed || !signatureOk(token)) return false
  if (parsed.parts[0] === 'v2') return Number(parsed.parts[2]) === account.sessionVersion
  return parsed.parts[0] === 'v3'
}

const readCookie = (req, name) => {
  for (const part of (req.headers.cookie || '').split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='))
      } catch {
        return ''
      }
    }
  }
  return ''
}

export const isAuthenticated = (req) => adminConfigured() && verifyToken(readCookie(req, COOKIE))

const isHttps = (req) => req.secure || req.get('x-forwarded-proto')?.split(',')[0].trim() === 'https'

const writeSession = (req, res, payload) => {
  res.cookie(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isHttps(req),
    path: COOKIE_PATH,
    maxAge: SESSION_MS,
  })
}

export const openSession = (req, res) => writeSession(req, res, `v2.${Date.now() + SESSION_MS}.${account.sessionVersion}`)

export const openStaffSession = (req, res, staff) => writeSession(req, res, `v3.${Date.now() + SESSION_MS}.${staff._id}.${staff.sessionVersion}`)

/** The password-only account is the Super Admin: the only actor that manages accounts and permissions. */
const PRIMARY = { role: 'superadmin', id: 'primary', name: 'Super Admin', permissions: ['*'], superAdmin: true }

/** The signed-in person. Primary admin cookies stay valid. Staff cookies are checked against the account. */
export const currentActor = async (req) => {
  const parsed = splitToken(readCookie(req, COOKIE))
  if (!parsed || !signatureOk(readCookie(req, COOKIE)) || !adminConfigured()) return null
  if (parsed.parts[0] === 'v2') return Number(parsed.parts[2]) === account.sessionVersion ? PRIMARY : null
  if (parsed.parts[0] !== 'v3') return null
  const doc = await StaffAccount.findById(parsed.parts[2]).lean()
  if (!doc?.active || Number(parsed.parts[3]) !== doc.sessionVersion) return null
  const staff = toStaff(doc)
  return { role: staff.role, id: staff.id, name: staff.name, permissions: staff.permissions, superAdmin: false }
}

export const can = (actor, permission) =>
  Boolean(Array.isArray(actor?.permissions) && (actor.permissions.includes('*') || actor.permissions.includes(permission)))

export const isSuperAdmin = (actor) => Boolean(actor?.superAdmin === true && actor.id === 'primary')

export const superAdminOnly = (req, res, next) => (isSuperAdmin(req.actor) ? next() : res.status(403).json({ error: 'Forbidden' }))

export const requirePermission = (permission) => (req, res, next) => (can(req.actor, permission) ? next() : res.status(403).json({ error: 'Forbidden' }))

/** Applications, portraits, and notifications include member names and contact details. */
export const canSeeMembers = (actor) => can(actor, 'recruitment.review') || can(actor, 'recruitment.decide') || can(actor, 'members.read')

export const closeSession = (res) => res.clearCookie(COOKIE, { path: COOKIE_PATH })

const recentFailures = (key) => {
  const now = Date.now()
  const list = (failures.get(key) || []).filter((at) => now - at < FAILURE_WINDOW_MS)
  if (!failures.has(key) && failures.size >= 4000) failures.delete(failures.keys().next().value)
  failures.set(key, list)
  return list
}

export const loginBlocked = (key) => recentFailures(key).length >= MAX_FAILURES
export const recordFailure = (key) => recentFailures(key).push(Date.now())
export const clearFailures = (key) => failures.delete(key)

export const requireAdmin = (req, res, next) => {
  if (!adminConfigured()) return res.status(503).json({ error: 'Admin not configured' })
  if (!isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' })
  next()
}

/**
 * Requires a session and reloads the account. A staff cookie for a deactivated
 * account, or one issued before the session was rotated, is rejected here.
 */
export const requireActor = async (req, res, next) => {
  if (!adminConfigured()) return res.status(503).json({ error: 'Admin not configured' })
  try {
    const actor = await currentActor(req)
    if (!actor) return res.status(401).json({ error: 'Unauthorized' })
    req.actor = actor
    next()
  } catch (error) {
    next(error)
  }
}

/* ── Password reset ── */

const tokenHash = (token) => sha256(`udbonds-reset:${token}`).toString('hex')

/**
 * Issues a single-use reset token (only its hash is stored) and returns it, or null while a recent
 * request is still in its cooldown. A new request replaces any previous token.
 */
export const createResetToken = async () => {
  if (!adminConfigured()) return null
  const now = Date.now()
  if (account.resetRequestedAt && now - new Date(account.resetRequestedAt).getTime() < RESET_COOLDOWN_MS) return null
  const token = randomBytes(32).toString('base64url')
  const update = { resetTokenHash: tokenHash(token), resetExpiresAt: new Date(now + RESET_TTL_MS), resetRequestedAt: new Date(now) }
  account = await AdminAccount.findOneAndUpdate({ key: 'primary' }, { $set: update }, { new: true }).lean()
  return { token, expiresAt: update.resetExpiresAt }
}

const tokenMatches = (token) =>
  typeof token === 'string' &&
  token.length >= 32 &&
  token.length <= 128 &&
  Boolean(account?.resetTokenHash) &&
  safeEqual(tokenHash(token), account.resetTokenHash)

/** 'valid', 'expired' or 'invalid'. */
export const resetTokenState = (token) => {
  if (!tokenMatches(token)) return { state: 'invalid' }
  const expiresAt = new Date(account.resetExpiresAt)
  return expiresAt.getTime() > Date.now() ? { state: 'valid', expiresAt } : { state: 'expired' }
}

export const isCurrentPassword = (password) => checkPassword(password)

/** Consumes the token atomically, stores the new hash and signs out every open session. */
export const resetPassword = async (token, password) => {
  if (resetTokenState(token).state !== 'valid') return false
  const passwordHash = await hashPassword(password)
  const doc = await AdminAccount.findOneAndUpdate(
    { key: 'primary', resetTokenHash: tokenHash(token), resetExpiresAt: { $gt: new Date() } },
    {
      $set: { passwordHash, passwordChangedAt: new Date(), resetTokenHash: null, resetExpiresAt: null, sessionSecret: randomBytes(32).toString('base64url') },
      $inc: { sessionVersion: 1 },
    },
    { new: true },
  ).lean()
  if (!doc) return false
  account = doc
  failures.clear()
  return true
}

/**
 * Changes the password from a signed-in session: stores the new hash, cancels any pending reset link
 * and signs out the other sessions. The caller re-issues the current session cookie.
 */
export const changePassword = async (password) => {
  const passwordHash = await hashPassword(password)
  const doc = await AdminAccount.findOneAndUpdate(
    { key: 'primary' },
    {
      $set: { passwordHash, passwordChangedAt: new Date(), resetTokenHash: null, resetExpiresAt: null, sessionSecret: randomBytes(32).toString('base64url') },
      $inc: { sessionVersion: 1 },
    },
    { new: true },
  ).lean()
  if (!doc) return false
  account = doc
  return true
}
