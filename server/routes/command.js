import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import mongoose from 'mongoose'
import { AuditEvent, recordAudit, toAudit } from '../models/AuditEvent.js'
import { FinanceBook, loadBook } from '../models/FinanceBook.js'
import { LEDGER_KINDS, LedgerEntry, toEntry } from '../models/LedgerEntry.js'
import { MISSION_STATUSES, OpsMission, toMission } from '../models/OpsMission.js'
import { Registration, toApplication } from '../models/Registration.js'
import { ADMIN_ONLY_PERMISSIONS, ALL_PERMISSIONS, PERMISSION_GROUPS, STAFF_ROLES, StaffAccount, grantableFor, toStaff } from '../models/StaffAccount.js'
import { can, canSeeMembers, currentActor, superAdminOnly } from '../services/adminAuth.js'
import { missionFigures, summarize } from '../services/ledger.js'
import { hashPassword, passwordProblem, verifyPassword } from '../services/password.js'

export const commandRouter = Router()

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const money = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}
const day = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const gate = (permission) => async (req, res, next) => {
  try {
    const actor = await currentActor(req)
    if (!actor) return res.status(401).json({ error: 'Unauthorized' })
    if (permission && !can(actor, permission)) return res.status(403).json({ error: 'Forbidden' })
    req.actor = actor
    next()
  } catch (error) {
    next(error)
  }
}

commandRouter.use(gate())

const missionWithFigures = async (doc, entries) => toMission(doc, missionFigures(doc, entries))

commandRouter.get('/summary', async (req, res, next) => {
  try {
    const from = day(req.query.from)
    const to = day(req.query.to)
    const dateFilter = {}
    if (from) dateFilter.$gte = from
    if (to) dateFilter.$lte = to
    const entryQuery = Object.keys(dateFilter).length ? { date: dateFilter } : {}
    const [book, entries, missions, members, recentAudit] = await Promise.all([
      loadBook(),
      LedgerEntry.find(entryQuery).lean(),
      OpsMission.find().sort({ plannedAt: 1, createdAt: -1 }).lean(),
      Registration.countDocuments({ kind: 'membership', status: { $in: ['approved', 'accepted', 'active'] } }),
      AuditEvent.find().sort({ createdAt: -1 }).limit(8).lean(),
    ])
    const financeAllowed = can(req.actor, 'finance.record') || can(req.actor, 'finance.approve')
    const finance = financeAllowed ? summarize(book.opening, entries) : null
    const byStatus = Object.fromEntries(MISSION_STATUSES.map((status) => [status, missions.filter((item) => item.status === status).length]))
    const missionRows = missions.map((mission) => toMission(mission, financeAllowed ? missionFigures(mission, entries) : null))
    const deadlines = missionRows
      .filter((mission) => mission.plannedAt && mission.status !== 'archived' && mission.status !== 'completed')
      .slice(0, 6)
    res.json({
      finance: finance ? { ...finance, currency: book.currency || 'MAD', period: Boolean(from || to) } : null,
      missions: { total: missions.length, ...byStatus, items: missionRows.slice(0, 8) },
      members,
      deadlines,
      activity: can(req.actor, 'audit.read') ? recentAudit.map(toAudit) : [],
      pendingExpenses: financeAllowed ? entries.filter((entry) => entry.kind === 'expense' && entry.status === 'posted' && !entry.approvedAt).length : 0,
    })
  } catch (error) {
    next(error)
  }
})

commandRouter.get('/search', async (req, res, next) => {
  try {
    const q = text(req.query.q, 80)
    if (q.length < 2) return res.json({ applications: [], missions: [] })
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const [applications, missions] = await Promise.all([
      canSeeMembers(req.actor)
        ? Registration.find({ $or: [{ firstName: pattern }, { lastName: pattern }, { city: pattern }, { email: pattern }] })
            .sort({ createdAt: -1 })
            .limit(8)
            .lean()
        : [],
      OpsMission.find({ $or: [{ title: pattern }, { location: pattern }, { category: pattern }] })
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean(),
    ])
    res.json({
      applications: applications.map((doc) => ({ id: String(doc._id), name: `${doc.firstName} ${doc.lastName}`, city: doc.city, status: doc.status })),
      missions: missions.map((doc) => ({ id: String(doc._id), title: doc.title, status: doc.status })),
    })
  } catch (error) {
    next(error)
  }
})

commandRouter.get('/missions', async (req, res, next) => {
  try {
    const status = text(req.query.status, 20)
    const filter = MISSION_STATUSES.includes(status) ? { status } : {}
    const [docs, entries] = await Promise.all([OpsMission.find(filter).sort({ plannedAt: 1, createdAt: -1 }).lean(), LedgerEntry.find().lean()])
    const items = docs.map((doc) => toMission(doc, missionFigures(doc, entries)))
    if (!can(req.actor, 'missions.manage')) {
      const name = req.actor.name.toLowerCase()
      return res.json({ items: items.filter((item) => item.assignees.some((person) => person.toLowerCase() === name)) })
    }
    res.json({ items })
  } catch (error) {
    next(error)
  }
})

commandRouter.post('/missions', gate('missions.manage'), async (req, res, next) => {
  try {
    const title = text(req.body?.title, 140)
    if (title.length < 3) return res.status(422).json({ error: 'Invalid mission' })
    const status = MISSION_STATUSES.includes(req.body?.status) ? req.body.status : 'upcoming'
    const doc = await OpsMission.create({
      title,
      description: text(req.body?.description, 4000),
      objectives: text(req.body?.objectives, 2000),
      category: text(req.body?.category, 80),
      plannedAt: day(req.body?.plannedAt),
      location: text(req.body?.location, 160),
      status,
      assignees: Array.isArray(req.body?.assignees) ? req.body.assignees.map((item) => text(item, 80)).filter(Boolean).slice(0, 20) : [],
      budget: Math.max(0, money(req.body?.budget) || 0),
      limit: Math.max(0, money(req.body?.limit) || 0),
    })
    if (text(req.body?.note, 2000)) doc.timeline.push({ actor: req.actor.name, text: text(req.body.note, 2000) })
    await doc.save()
    await recordAudit(req.actor, 'mission.create', 'mission', doc._id, title)
    const entries = await LedgerEntry.find({ mission: doc._id }).lean()
    res.status(201).json({ item: await missionWithFigures(doc, entries) })
  } catch (error) {
    next(error)
  }
})

commandRouter.patch('/missions/:id', gate('missions.manage'), async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Mission not found' })
    const doc = await OpsMission.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Mission not found' })
    const fields = ['title', 'description', 'objectives', 'category', 'location', 'report']
    fields.forEach((key) => {
      if (typeof req.body?.[key] === 'string') doc[key] = text(req.body[key], key === 'description' ? 4000 : key === 'report' ? 8000 : 2000)
    })
    if (req.body?.plannedAt !== undefined) doc.plannedAt = req.body.plannedAt ? day(req.body.plannedAt) : null
    if (MISSION_STATUSES.includes(req.body?.status)) doc.status = req.body.status
    if (Array.isArray(req.body?.assignees)) doc.assignees = req.body.assignees.map((item) => text(item, 80)).filter(Boolean).slice(0, 20)
    if (req.body?.budget !== undefined) doc.budget = Math.max(0, money(req.body.budget) || 0)
    if (req.body?.limit !== undefined) doc.limit = Math.max(0, money(req.body.limit) || 0)
    if (text(req.body?.note, 2000)) doc.timeline.push({ at: new Date(), actor: req.actor.name, text: text(req.body.note, 2000) })
    await doc.save()
    await recordAudit(req.actor, 'mission.update', 'mission', doc._id, doc.title)
    const entries = await LedgerEntry.find({ mission: doc._id }).lean()
    res.json({ item: toMission(doc, missionFigures(doc, entries)) })
  } catch (error) {
    next(error)
  }
})

commandRouter.get('/ledger', async (req, res, next) => {
  try {
    if (!can(req.actor, 'finance.record') && !can(req.actor, 'finance.approve')) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const filter = { status: { $in: ['posted', 'reversed'] } }
    if (LEDGER_KINDS.includes(req.query.kind)) filter.kind = req.query.kind
    if (mongoose.isValidObjectId(req.query.mission)) filter.mission = req.query.mission
    if (text(req.query.category, 80)) filter.category = text(req.query.category, 80)
    if (text(req.query.actor, 80)) filter.actor = text(req.query.actor, 80)
    const from = day(req.query.from)
    const to = day(req.query.to)
    if (from || to) filter.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) }
    const [book, docs] = await Promise.all([loadBook(), LedgerEntry.find(filter).sort({ date: -1, createdAt: -1 }).limit(400).lean()])
    const all = await LedgerEntry.find().lean()
    res.json({ book: { opening: book.opening, currency: book.currency || 'MAD' }, summary: summarize(book.opening, all), items: docs.map(toEntry) })
  } catch (error) {
    next(error)
  }
})

commandRouter.post('/book', async (req, res, next) => {
  try {
    if (!can(req.actor, 'finance.approve')) return res.status(403).json({ error: 'Forbidden' })
    const opening = money(req.body?.opening)
    if (!Number.isFinite(opening) || opening < 0) return res.status(422).json({ error: 'Invalid amount' })
    const existing = await LedgerEntry.countDocuments()
    if (existing) return res.status(409).json({ error: 'Opening balance is locked once movements exist' })
    const doc = await FinanceBook.findOneAndUpdate({ key: 'caisse' }, { $set: { opening, currency: 'MAD' } }, { upsert: true, new: true }).lean()
    await recordAudit(req.actor, 'finance.opening', 'book', 'caisse', String(opening))
    res.json({ opening: doc.opening, currency: doc.currency })
  } catch (error) {
    next(error)
  }
})

commandRouter.post('/ledger', async (req, res, next) => {
  try {
    if (!can(req.actor, 'finance.record')) return res.status(403).json({ error: 'Forbidden' })
    const kind = req.body?.kind
    if (!['income', 'expense', 'transfer'].includes(kind)) return res.status(422).json({ error: 'Invalid transaction' })
    const amount = money(req.body?.amount)
    const description = text(req.body?.description, 500)
    const date = day(req.body?.date) || new Date()
    if (!Number.isFinite(amount) || amount <= 0 || description.length < 3) return res.status(422).json({ error: 'Invalid transaction' })
    if (kind === 'transfer' && !mongoose.isValidObjectId(req.body?.mission)) return res.status(422).json({ error: 'A transfer needs a mission' })
    const mission = mongoose.isValidObjectId(req.body?.mission) ? req.body.mission : null
    const doc = await LedgerEntry.create({
      kind,
      amount,
      date,
      description,
      category: text(req.body?.category, 80),
      mission,
      method: text(req.body?.method, 40),
      receipt: text(req.body?.receipt, 500),
      actor: req.actor.name,
      actorId: req.actor.id,
    })
    await recordAudit(req.actor, `finance.${kind}`, 'ledger', doc._id, `${amount} MAD`)
    res.status(201).json({ item: toEntry(doc) })
  } catch (error) {
    next(error)
  }
})

commandRouter.post('/ledger/:id/approve', async (req, res, next) => {
  try {
    if (!can(req.actor, 'finance.approve')) return res.status(403).json({ error: 'Forbidden' })
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Transaction not found' })
    const doc = await LedgerEntry.findById(req.params.id)
    if (!doc || doc.status !== 'posted') return res.status(404).json({ error: 'Transaction not found' })
    doc.approvedAt = new Date()
    doc.approvedBy = req.actor.name
    await doc.save()
    await recordAudit(req.actor, 'finance.approve', 'ledger', doc._id, doc.description)
    res.json({ item: toEntry(doc) })
  } catch (error) {
    next(error)
  }
})

commandRouter.post('/ledger/:id/reverse', async (req, res, next) => {
  try {
    if (!can(req.actor, 'finance.approve')) return res.status(403).json({ error: 'Forbidden' })
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Transaction not found' })
    const reason = text(req.body?.reason, 300)
    if (reason.length < 3) return res.status(422).json({ error: 'A reason is required' })
    const doc = await LedgerEntry.findById(req.params.id)
    if (!doc || doc.status !== 'posted' || doc.kind === 'reversal') return res.status(409).json({ error: 'This transaction cannot be reversed' })
    const direction = doc.kind === 'expense' ? 'in' : 'out'
    const reversal = await LedgerEntry.create({
      kind: 'reversal',
      direction: doc.kind === 'transfer' ? '' : direction,
      amount: doc.amount,
      date: new Date(),
      description: reason,
      category: doc.category,
      mission: doc.mission,
      method: doc.method,
      actor: req.actor.name,
      actorId: req.actor.id,
      reverses: doc._id,
    })
    doc.status = 'reversed'
    await doc.save()
    if (doc.kind === 'transfer') {
      reversal.status = 'reversed'
      await reversal.save()
    }
    await recordAudit(req.actor, 'finance.reverse', 'ledger', doc._id, reason)
    res.json({ item: toEntry(doc), reversal: toEntry(reversal) })
  } catch (error) {
    next(error)
  }
})

commandRouter.get('/ledger.csv', async (req, res, next) => {
  try {
    if (!can(req.actor, 'finance.record')) return res.status(403).json({ error: 'Forbidden' })
    const docs = await LedgerEntry.find().sort({ date: 1 }).lean()
    const lines = ['date,kind,amount,currency,description,category,mission,method,actor,status']
    docs.forEach((doc) => {
      const cells = [doc.date?.toISOString() || '', doc.kind, doc.amount, doc.currency, doc.description, doc.category, doc.mission || '', doc.method, doc.actor, doc.status]
      lines.push(cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    })
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="caisse.csv"' })
    res.send(lines.join('\n'))
  } catch (error) {
    next(error)
  }
})

commandRouter.get('/audit', async (req, res, next) => {
  try {
    if (!can(req.actor, 'audit.read')) return res.status(403).json({ error: 'Forbidden' })
    const q = text(req.query.q, 80)
    const filter = q ? { $or: [{ action: new RegExp(q, 'i') }, { actor: new RegExp(q, 'i') }, { detail: new RegExp(q, 'i') }] } : {}
    const docs = await AuditEvent.find(filter).sort({ createdAt: -1 }).limit(200).lean()
    res.json({ items: docs.map(toAudit) })
  } catch (error) {
    next(error)
  }
})

/* ── Team accounts: only the Super Admin creates accounts or changes roles and permissions ── */

/** Returns the requested list when every entry exists and may be granted to `role`, otherwise null. */
const readPermissions = (value, role) => {
  if (!Array.isArray(value) || value.length > ALL_PERMISSIONS.length * 2) return null
  const list = [...new Set(value.filter((item) => typeof item === 'string'))]
  const allowed = grantableFor(role)
  return list.length === value.length && list.every((item) => allowed.includes(item)) ? list : null
}

const catalog = { groups: PERMISSION_GROUPS, adminOnly: ADMIN_ONLY_PERMISSIONS, roles: STAFF_ROLES }

commandRouter.get('/staff', superAdminOnly, async (_req, res, next) => {
  try {
    const docs = await StaffAccount.find().sort({ createdAt: -1 }).lean()
    res.json({ items: docs.map(toStaff), catalog })
  } catch (error) {
    next(error)
  }
})

commandRouter.post('/staff', superAdminOnly, async (req, res, next) => {
  try {
    const name = text(req.body?.name, 80)
    const email = text(req.body?.email, 254).toLowerCase()
    const role = req.body?.role === undefined ? 'staff' : req.body.role
    if (!STAFF_ROLES.includes(role)) return res.status(422).json({ error: 'role' })
    const problem = name.length < 2 ? 'name' : !EMAIL.test(email) ? 'email' : passwordProblem(req.body?.password)
    if (problem) return res.status(422).json({ error: problem })
    const permissions = readPermissions(req.body?.permissions ?? ['recruitment.review'], role)
    if (!permissions) return res.status(422).json({ error: 'permissions' })
    const doc = await StaffAccount.create({ name, email, role, permissions, permissionsSet: true, passwordHash: await hashPassword(req.body.password) })
    await recordAudit(req.actor, 'staff.create', 'staff', doc._id, `${name} ${role} [${permissions.join(', ')}]`)
    res.status(201).json({ item: toStaff(doc) })
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'Email already used' })
    next(error)
  }
})

commandRouter.patch('/staff/:id', superAdminOnly, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Account not found' })
    const doc = await StaffAccount.findById(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Account not found' })
    const before = toStaff(doc)
    const role = req.body?.role === undefined ? doc.role : req.body.role
    if (!STAFF_ROLES.includes(role)) return res.status(422).json({ error: 'role' })
    let permissions = null
    if (req.body?.permissions !== undefined) {
      permissions = readPermissions(req.body.permissions, role)
      if (!permissions) return res.status(422).json({ error: 'permissions' })
    } else if (role !== doc.role) {
      permissions = before.permissions.filter((item) => grantableFor(role).includes(item))
    }
    if (typeof req.body?.password === 'string' && req.body.password) {
      const problem = passwordProblem(req.body.password)
      if (problem) return res.status(422).json({ error: problem })
      doc.passwordHash = await hashPassword(req.body.password)
      doc.sessionVersion += 1
    }
    doc.role = role
    if (permissions) {
      doc.permissions = permissions
      doc.permissionsSet = true
    }
    if (typeof req.body?.active === 'boolean') {
      if (doc.active && !req.body.active) doc.sessionVersion += 1
      doc.active = req.body.active
    }
    await doc.save()
    const after = toStaff(doc)
    if (before.role !== after.role) await recordAudit(req.actor, 'staff.role', 'staff', doc._id, `${doc.email}: ${before.role} → ${after.role}`)
    if (before.permissions.join() !== after.permissions.join()) {
      await recordAudit(req.actor, 'staff.permissions', 'staff', doc._id, `${doc.email}: [${after.permissions.join(', ')}]`)
    }
    if (before.active !== after.active) await recordAudit(req.actor, after.active ? 'staff.activate' : 'staff.deactivate', 'staff', doc._id, doc.email)
    res.json({ item: after })
  } catch (error) {
    next(error)
  }
})

let unknownHash = null

export const loginStaff = async (email, password) => {
  const normalized = String(email || '').trim().toLowerCase().slice(0, 254)
  const doc = normalized.includes('@') ? await StaffAccount.findOne({ email: normalized }).lean() : null
  unknownHash ||= await hashPassword(randomBytes(32).toString('hex'))
  const matches = await verifyPassword(typeof password === 'string' ? password : '', doc?.passwordHash || unknownHash)
  if (!doc?.active || !matches) return null
  return doc
}
