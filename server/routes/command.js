import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import mongoose from 'mongoose'
import { dbState } from '../configs/db.js'
import { AuditEvent, recordAudit, toAudit } from '../models/AuditEvent.js'
import { FinanceBook, loadBook } from '../models/FinanceBook.js'
import { LEDGER_KINDS, LedgerEntry, toEntry } from '../models/LedgerEntry.js'
import { MISSION_STATUSES, OpsMission, toMission } from '../models/OpsMission.js'
import { Registration } from '../models/Registration.js'
import { ADMIN_ONLY_PERMISSIONS, ALL_PERMISSIONS, PERMISSION_GROUPS, STAFF_ROLES, StaffAccount, grantableFor, toStaff } from '../models/StaffAccount.js'
import { Story } from '../models/Story.js'
import { can, canSeeMembers, currentActor, superAdminOnly } from '../services/adminAuth.js'
import { missionFigures, summarize } from '../services/ledger.js'
import { hashPassword, passwordProblem, verifyPassword } from '../services/password.js'
import { loadRegistrationWindow, resolveRegistration } from '../services/registrationWindow.js'

export const commandRouter = Router()

export const AUDIT_AREAS = {
  applications: /^(application|whatsapp)\./,
  missions: /^mission\./,
  finance: /^finance\./,
  team: /^staff\./,
  content: /^story\./,
  registration: /^registration\./,
}
const AUDIT_PAGE = 50

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const money = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}
/** A date sent as text ("2026-11-02" or ISO). Anything else, including null, means "no date". */
export const day = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const gate = (permission) => async (req, res, next) => {
  try {
    if (dbState() !== 'connected') return res.status(503).json({ error: 'Database unavailable' })
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

/** Without `missions.manage`, a person only sees the missions they are named on. */
export const missionsFor = (actor, docs) => {
  if (can(actor, 'missions.manage')) return docs
  const name = String(actor?.name || '').trim().toLowerCase()
  if (!name) return []
  return docs.filter((doc) => (doc.assignees || []).some((person) => person.trim().toLowerCase() === name))
}

const financeReader = (actor) => can(actor, 'finance.record') || can(actor, 'finance.approve')
/** Spending per mission comes from the ledger: treasurers and mission managers only. */
const figuresReader = (actor) => financeReader(actor) || can(actor, 'missions.manage')

/** Overview of the modules the signed-in person may open. A section is `null` when they may not. */
commandRouter.get('/summary', async (req, res, next) => {
  try {
    const actor = req.actor
    const finance = financeReader(actor)
    const figures = figuresReader(actor)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const [book, entries, allMissions, members, recentAudit, stories, windowDoc] = await Promise.all([
      finance ? loadBook() : null,
      figures ? LedgerEntry.find().lean() : [],
      OpsMission.find().sort({ plannedAt: 1, createdAt: -1 }).lean(),
      Registration.countDocuments({ kind: 'membership', status: { $in: ['approved', 'accepted', 'active'] } }),
      can(actor, 'audit.read') ? AuditEvent.find().sort({ createdAt: -1 }).limit(8).lean() : null,
      can(actor, 'content.manage') ? Story.find().select('kind published featured images cover updatedAt').lean() : null,
      loadRegistrationWindow(),
    ])
    const missions = missionsFor(actor, allMissions)
    const rows = missions.map((doc) => toMission(doc, figures ? missionFigures(doc, entries) : null))
    const open = rows.filter((mission) => mission.status === 'upcoming' || mission.status === 'ongoing')
    const deadlines = open
      .filter((mission) => mission.plannedAt)
      .sort((a, b) => new Date(a.plannedAt) - new Date(b.plannedAt))
      .slice(0, 6)
      .map(({ id, title, status, plannedAt, location }) => ({ id, title, status, plannedAt, location, overdue: status === 'upcoming' && new Date(plannedAt) < now }))
    const month = entries.filter((entry) => new Date(entry.date) >= monthStart)
    const registration = resolveRegistration(windowDoc, now)
    res.json({
      generatedAt: now.toISOString(),
      missions: {
        scope: can(actor, 'missions.manage') ? 'all' : 'assigned',
        total: rows.length,
        ...Object.fromEntries(MISSION_STATUSES.map((status) => [status, rows.filter((mission) => mission.status === status).length])),
        unscheduled: open.filter((mission) => !mission.plannedAt).length,
        overrun: rows.filter((mission) => mission.figures?.overrun && mission.status !== 'archived').map(({ id, title }) => ({ id, title })),
      },
      deadlines,
      members,
      finance: finance
        ? {
            ...summarize(book.opening, entries),
            month: summarize(0, month),
            currency: book.currency || 'MAD',
            entries: entries.length,
            unapproved: can(actor, 'finance.approve') ? entries.filter((entry) => entry.kind === 'expense' && entry.status === 'posted' && !entry.approvedAt).length : null,
          }
        : null,
      content: stories
        ? {
            published: stories.filter((story) => story.published).length,
            drafts: stories.filter((story) => !story.published).length,
            featured: stories.filter((story) => story.published && story.featured).length,
            withoutImages: stories.filter((story) => !story.cover && !(story.images || []).length).length,
            missions: stories.filter((story) => story.kind === 'mission').length,
            activities: stories.filter((story) => story.kind === 'activity').length,
          }
        : null,
      registration: { phase: registration.phase, override: registration.override, opensAt: registration.opensAt, closesAt: registration.closesAt },
      activity: recentAudit ? recentAudit.map(toAudit) : null,
    })
  } catch (error) {
    next(error)
  }
})

commandRouter.get('/search', async (req, res, next) => {
  try {
    const q = text(req.query.q, 80)
    if (q.length < 2) return res.json({ applications: [], missions: [], stories: [] })
    const pattern = new RegExp(escapeRegex(q), 'i')
    const [applications, missions, stories] = await Promise.all([
      canSeeMembers(req.actor)
        ? Registration.find({ $or: [{ firstName: pattern }, { lastName: pattern }, { city: pattern }, { email: pattern }] })
            .sort({ createdAt: -1 })
            .limit(6)
            .lean()
        : [],
      OpsMission.find({ $or: [{ title: pattern }, { location: pattern }, { category: pattern }] })
        .sort({ updatedAt: -1 })
        .limit(40)
        .lean(),
      can(req.actor, 'content.manage')
        ? Story.find({ $or: [{ title: pattern }, { slug: pattern }, { location: pattern }] })
            .sort({ updatedAt: -1 })
            .limit(6)
            .lean()
        : [],
    ])
    res.json({
      applications: applications.map((doc) => ({ id: String(doc._id), name: `${doc.firstName} ${doc.lastName}`, city: doc.city, status: doc.status })),
      missions: missionsFor(req.actor, missions)
        .slice(0, 6)
        .map((doc) => ({ id: String(doc._id), title: doc.title, status: doc.status, location: doc.location || '' })),
      stories: stories.map((doc) => ({ id: String(doc._id), title: doc.title, kind: doc.kind, published: doc.published })),
    })
  } catch (error) {
    next(error)
  }
})

commandRouter.get('/missions', async (req, res, next) => {
  try {
    const status = text(req.query.status, 20)
    const filter = MISSION_STATUSES.includes(status) ? { status } : {}
    const finance = financeReader(req.actor)
    const figures = figuresReader(req.actor)
    const [docs, entries] = await Promise.all([OpsMission.find(filter).sort({ plannedAt: 1, createdAt: -1 }).lean(), figures ? LedgerEntry.find().lean() : []])
    res.json({
      items: missionsFor(req.actor, docs).map((doc) => toMission(doc, figures ? missionFigures(doc, entries) : null)),
      scope: can(req.actor, 'missions.manage') ? 'all' : 'assigned',
      finance,
    })
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
    const [book, docs, all] = await Promise.all([loadBook(), LedgerEntry.find(filter).sort({ date: -1, createdAt: -1 }).limit(400).lean(), LedgerEntry.find().lean()])
    const inRange = (entry) => (!from || entry.date >= from) && (!to || entry.date <= to)
    res.json({
      book: { opening: book.opening, currency: book.currency || 'MAD', locked: all.length > 0 },
      summary: summarize(book.opening, all),
      period: from || to ? summarize(0, all.filter(inRange)) : null,
      items: docs.map(toEntry),
      truncated: docs.length === 400,
      can: { record: can(req.actor, 'finance.record'), approve: can(req.actor, 'finance.approve') },
    })
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
      receipt: /^https?:\/\/\S+$/i.test(text(req.body?.receipt, 500)) ? text(req.body.receipt, 500) : '',
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

/** Newest first, `AUDIT_PAGE` at a time. `before` is the id of the last row already shown. */
commandRouter.get('/audit', async (req, res, next) => {
  try {
    if (!can(req.actor, 'audit.read')) return res.status(403).json({ error: 'Forbidden' })
    const clauses = []
    const q = text(req.query.q, 80)
    if (q) {
      const pattern = new RegExp(escapeRegex(q), 'i')
      clauses.push({ $or: [{ action: pattern }, { actor: pattern }, { detail: pattern }] })
    }
    const area = text(req.query.area, 20)
    if (AUDIT_AREAS[area]) clauses.push({ action: AUDIT_AREAS[area] })
    const from = day(req.query.from)
    const to = day(req.query.to)
    if (from || to) clauses.push({ createdAt: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } })
    if (mongoose.isValidObjectId(req.query.before)) clauses.push({ _id: { $lt: new mongoose.Types.ObjectId(String(req.query.before)) } })
    const docs = await AuditEvent.find(clauses.length ? { $and: clauses } : {})
      .sort({ _id: -1 })
      .limit(AUDIT_PAGE + 1)
      .lean()
    res.json({ items: docs.slice(0, AUDIT_PAGE).map(toAudit), more: docs.length > AUDIT_PAGE })
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
