import { Router } from 'express'
import mongoose from 'mongoose'
import { dbState } from '../configs/db.js'
import { Notification, toNotification } from '../models/Notification.js'
import { DURATIONS, OFFER_IDS, Registration, STATUSES, TRANSITIONS, toApplication } from '../models/Registration.js'
import { publish, subscribe } from '../services/adminEvents.js'
import {
  adminConfigured,
  changePassword,
  checkPassword,
  clearFailures,
  closeSession,
  createResetToken,
  isAuthenticated,
  isCurrentPassword,
  loadAdminAccount,
  loginBlocked,
  openSession,
  recordFailure,
  requireAdmin,
  resetPassword,
  resetTokenState,
} from '../services/adminAuth.js'
import { passwordProblem } from '../services/password.js'
import { appUrl, deliverResetLink, resetEmailConfigured } from '../services/resetDelivery.js'

export const adminRouter = Router()

const HEARTBEAT_MS = 25_000
const PAGE_MAX = 100
const DAILY_DAYS = 30
const SORTS = { createdAt: 'createdAt', amount: 'amount', name: 'lastName', city: 'city', status: 'status' }

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const param = (value) => (typeof value === 'string' ? value : '')
const intIn = (value, min, max, fallback) => {
  const n = Number.parseInt(param(value), 10)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

const timeZone = (value) => {
  const zone = param(value)
  try {
    return zone ? new Intl.DateTimeFormat('en', { timeZone: zone }).resolvedOptions().timeZone : 'UTC'
  } catch {
    return 'UTC'
  }
}

const notFound = (res) => res.status(404).json({ error: 'Application not found' })

const unreadCount = () => Notification.countDocuments({ readAt: null })

const hits = new Map()
const throttled = (key, max, windowMs) => {
  const now = Date.now()
  const recent = (hits.get(key) || []).filter((at) => now - at < windowMs)
  recent.push(now)
  hits.set(key, recent)
  return recent.length > max
}

adminRouter.use((_req, res, next) => {
  res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' })
  next()
})

/* ── Session ── */

adminRouter.get('/session', async (req, res, next) => {
  try {
    await loadAdminAccount()
    res.json({ configured: adminConfigured(), authenticated: isAuthenticated(req) })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/session', async (req, res, next) => {
  try {
    await loadAdminAccount()
    if (!adminConfigured()) return res.status(503).json({ error: 'Admin not configured' })
    const key = req.ip || 'unknown'
    if (loginBlocked(key)) return res.status(429).json({ error: 'Too many attempts' })
    if (!(await checkPassword(req.body?.password))) {
      recordFailure(key)
      await wait(400)
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    clearFailures(key)
    openSession(req, res)
    res.json({ authenticated: true })
  } catch (error) {
    next(error)
  }
})

adminRouter.delete('/session', (_req, res) => {
  closeSession(res)
  res.status(204).end()
})

/* ── Password reset (link valid 30 minutes, single use) ── */

const RESET_WINDOW_MS = 15 * 60_000

adminRouter.post('/password/forgot', async (req, res, next) => {
  try {
    await loadAdminAccount()
    if (!adminConfigured()) return res.status(503).json({ error: 'Admin not configured' })
    if (throttled(`forgot:${req.ip}`, 5, RESET_WINDOW_MS)) return res.status(429).json({ error: 'Too many requests' })
    const locale = ['fr', 'en', 'ar'].includes(req.body?.locale) ? req.body.locale : 'fr'
    const issued = await createResetToken()
    // The token travels in the URL fragment, so it never reaches server logs or Referer headers.
    const channel = issued ? await deliverResetLink(`${appUrl()}/admin/reset#token=${issued.token}`, locale) : resetEmailConfigured() ? 'email' : 'console'
    res.status(202).json({ sent: true, channel, minutes: 30 })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/password/verify', async (req, res, next) => {
  try {
    await loadAdminAccount()
    if (throttled(`reset:${req.ip}`, 20, RESET_WINDOW_MS)) return res.status(429).json({ error: 'Too many requests' })
    const { state, expiresAt } = resetTokenState(req.body?.token)
    if (state !== 'valid') return res.status(410).json({ error: state })
    res.json({ valid: true, expiresAt })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/password/reset', async (req, res, next) => {
  try {
    await loadAdminAccount()
    if (throttled(`reset:${req.ip}`, 20, RESET_WINDOW_MS)) return res.status(429).json({ error: 'Too many requests' })
    const { token, password, confirm } = req.body || {}
    const { state } = resetTokenState(token)
    if (state !== 'valid') return res.status(410).json({ error: state })
    const fields = {}
    const problem = passwordProblem(password)
    if (problem) fields.password = problem
    else if (await isCurrentPassword(password)) fields.password = 'reused'
    if (confirm !== password) fields.confirm = 'mismatch'
    if (Object.keys(fields).length) return res.status(422).json({ error: 'Invalid password', fields })
    if (!(await resetPassword(token, password))) return res.status(410).json({ error: 'invalid' })
    closeSession(res)
    console.log('[admin] Administrator password changed - all sessions signed out')
    res.json({ reset: true })
  } catch (error) {
    next(error)
  }
})

adminRouter.use(requireAdmin)

/* ── Settings: change password (signed in, current password required) ── */

adminRouter.post('/password/change', async (req, res, next) => {
  try {
    const key = req.ip || 'unknown'
    if (loginBlocked(key)) return res.status(429).json({ error: 'Too many attempts' })
    const { current, password, confirm } = req.body || {}
    if (!(await checkPassword(current))) {
      recordFailure(key)
      await wait(400)
      return res.status(422).json({ error: 'Invalid password', fields: { current: 'wrong' } })
    }
    const fields = {}
    const problem = passwordProblem(password)
    if (problem) fields.password = problem
    else if (password === current || (await isCurrentPassword(password))) fields.password = 'reused'
    if (confirm !== password) fields.confirm = 'mismatch'
    if (Object.keys(fields).length) return res.status(422).json({ error: 'Invalid password', fields })
    if (!(await changePassword(password))) return res.status(503).json({ error: 'Admin not configured' })
    clearFailures(key)
    openSession(req, res)
    console.log('[admin] Administrator password changed from Settings - other sessions signed out')
    res.json({ changed: true })
  } catch (error) {
    next(error)
  }
})

/* ── Real-time stream (Server-Sent Events) ── */

adminRouter.get('/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
  res.flushHeaders()
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  res.write('retry: 4000\n\n')
  send('ready', { at: Date.now() })
  const unsubscribe = subscribe(send)
  const heartbeat = setInterval(() => {
    if (isAuthenticated(req)) return res.write(': ping\n\n')
    send('expired', {})
    res.end()
  }, HEARTBEAT_MS)
  req.on('close', () => {
    clearInterval(heartbeat)
    unsubscribe()
  })
})

adminRouter.use((_req, res, next) => (dbState() === 'connected' ? next() : res.status(503).json({ error: 'Database unavailable' })))

/* ── Applications ── */

const buildFilter = (query, { withStatus = true } = {}) => {
  const filter = {}
  const status = param(query.status)
  const offer = param(query.offer)
  const duration = param(query.duration)
  if (withStatus && STATUSES.includes(status)) filter.status = status
  if (OFFER_IDS.includes(offer)) filter.offer = offer
  if (DURATIONS.includes(duration)) filter.duration = duration
  const terms = param(query.q).trim().slice(0, 80).split(/\s+/).filter(Boolean).slice(0, 5)
  if (terms.length) {
    filter.$and = terms.map((term) => {
      const pattern = new RegExp(escapeRegex(term), 'i')
      return { $or: [{ firstName: pattern }, { lastName: pattern }, { city: pattern }, { email: pattern }, { phone: pattern }] }
    })
  }
  return filter
}

adminRouter.get('/registrations', async (req, res, next) => {
  try {
    const limit = intIn(req.query.limit, 1, PAGE_MAX, 20)
    const sortKey = SORTS[param(req.query.sort)] || 'createdAt'
    const order = param(req.query.order) === 'asc' ? 1 : -1
    const filter = buildFilter(req.query)
    const total = await Registration.countDocuments(filter)
    const pages = Math.max(1, Math.ceil(total / limit))
    const page = intIn(req.query.page, 1, pages, 1)
    const [docs, grouped] = await Promise.all([
      Registration.find(filter)
        .sort({ [sortKey]: order, _id: order })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Registration.aggregate([{ $match: buildFilter(req.query, { withStatus: false }) }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    ])
    const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]))
    grouped.forEach(({ _id, count }) => {
      if (_id in counts) counts[_id] = count
    })
    res.json({ items: docs.map(toApplication), total, page, pages, limit, counts })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/registrations/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res)
    const doc = await Registration.findById(req.params.id).lean()
    if (!doc) return notFound(res)
    res.json({ item: toApplication(doc), transitions: TRANSITIONS[doc.status] || [] })
  } catch (error) {
    next(error)
  }
})

adminRouter.patch('/registrations/:id', async (req, res, next) => {
  try {
    const status = param(req.body?.status)
    if (!STATUSES.includes(status)) return res.status(422).json({ error: 'Invalid status' })
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res)
    const doc = await Registration.findById(req.params.id)
    if (!doc) return notFound(res)
    if (doc.status !== status) {
      if (!TRANSITIONS[doc.status]?.includes(status)) return res.status(409).json({ error: 'Invalid status change' })
      doc.history.push({ from: doc.status, status, at: new Date() })
      doc.status = status
      await doc.save()
    }
    const item = toApplication(doc)
    publish('application', item)
    res.json({ item, transitions: TRANSITIONS[doc.status] || [] })
  } catch (error) {
    next(error)
  }
})

/* ── Statistics (computed from the database on every request) ── */

adminRouter.get('/stats', async (req, res, next) => {
  try {
    const tz = timeZone(req.query.tz)
    const since = new Date(Date.now() - (DAILY_DAYS + 1) * 86_400_000)
    const [byStatus, byOffer, byDuration, daily, latest] = await Promise.all([
      Registration.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
      Registration.aggregate([{ $group: { _id: '$offer', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
      Registration.aggregate([{ $group: { _id: '$duration', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
      Registration.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Registration.find().sort({ createdAt: -1 }).limit(6).lean(),
    ])
    const group = (rows, keys) =>
      Object.fromEntries(
        keys.map((key) => {
          const row = rows.find((item) => item._id === key)
          return [key, { count: row?.count || 0, amount: row?.amount || 0 }]
        }),
      )
    const statuses = group(byStatus, STATUSES)
    res.json({
      total: STATUSES.reduce((sum, key) => sum + statuses[key].count, 0),
      amount: STATUSES.reduce((sum, key) => sum + statuses[key].amount, 0),
      statuses,
      offers: group(byOffer, OFFER_IDS),
      durations: group(byDuration, DURATIONS),
      daily: daily.map(({ _id, count, amount }) => ({ day: _id, count, amount })),
      days: DAILY_DAYS,
      timeZone: tz,
      latest: latest.map(toApplication),
      generatedAt: Date.now(),
    })
  } catch (error) {
    next(error)
  }
})

/* ── Notifications ── */

adminRouter.get('/notifications', async (req, res, next) => {
  try {
    const filter = param(req.query.filter) === 'unread' ? { readAt: null } : {}
    const limit = intIn(req.query.limit, 1, PAGE_MAX, 40)
    const [docs, unread, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
      unreadCount(),
      Notification.countDocuments(),
    ])
    res.json({ items: docs.map(toNotification), unread, total })
  } catch (error) {
    next(error)
  }
})

adminRouter.post('/notifications/read', async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => mongoose.isValidObjectId(id)).slice(0, PAGE_MAX) : []
    if (!req.body?.all && !ids.length) return res.status(422).json({ error: 'Nothing to update' })
    const filter = req.body?.all ? { readAt: null } : { _id: { $in: ids }, readAt: null }
    await Notification.updateMany(filter, { $set: { readAt: new Date() } })
    const unread = await unreadCount()
    publish('notifications', { unread, read: req.body?.all ? 'all' : ids })
    res.json({ unread })
  } catch (error) {
    next(error)
  }
})

adminRouter.patch('/notifications/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Notification not found' })
    const read = req.body?.read !== false
    const doc = await Notification.findByIdAndUpdate(req.params.id, { $set: { readAt: read ? new Date() : null } }, { new: true }).lean()
    if (!doc) return res.status(404).json({ error: 'Notification not found' })
    const unread = await unreadCount()
    const item = toNotification(doc)
    publish('notifications', { unread, item })
    res.json({ item, unread })
  } catch (error) {
    next(error)
  }
})
