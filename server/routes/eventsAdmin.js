import express, { Router } from 'express'
import mongoose from 'mongoose'
import { canUpdateTask, liveState, publicChanged, publicProgram, readProgram } from '../../shared/eventProgram.js'
import { recordAudit } from '../models/AuditEvent.js'
import { BrotherhoodEvent, toEvent } from '../models/BrotherhoodEvent.js'
import { EventNotice, toNotice } from '../models/EventNotice.js'
import { EventTask, toTask } from '../models/EventTask.js'
import { StaffAccount, toStaff } from '../models/StaffAccount.js'
import { can } from '../services/adminAuth.js'
import { eventOps } from '../services/events.js'
import { STORY_IMAGE_LIMIT, STORY_IMAGE_TYPES } from '../models/StoryImage.js'
import { markAttached, releaseUploads, storeStoryImage, uploadIdOf } from '../services/storyMedia.js'

export const eventsAdminRouter = Router()

const manage = (req, res, next) => (can(req.actor, 'events.manage') ? next() : res.status(403).json({ error: 'Forbidden' }))
const operate = (req, res, next) => (can(req.actor, 'events.manage') || can(req.actor, 'events.operate') ? next() : res.status(403).json({ error: 'Forbidden' }))
const slugOf = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)

const load = async (id) => (mongoose.isValidObjectId(id) ? BrotherhoodEvent.findById(id) : null)

const bundle = async (doc, actor) => {
  const [tasks, notices] = await Promise.all([
    EventTask.find({ event: doc._id }).sort({ sort: 1, createdAt: 1 }).lean(),
    EventNotice.find({ event: doc._id }).sort({ createdAt: -1 }).limit(40).lean(),
  ])
  const event = toEvent(doc)
  const taskItems = tasks.map(toTask)
  const noticeItems = notices.map((item) => toNotice(item, actor.id))
  return {
    event,
    tasks: taskItems,
    notices: noticeItems,
    ops: eventOps(event, taskItems, noticeItems),
    live: liveState(event, new Date(), { includeInternal: true }),
    serverNow: new Date().toISOString(),
  }
}

eventsAdminRouter.use(operate)

eventsAdminRouter.get('/', async (req, res, next) => {
  try {
    const docs = await BrotherhoodEvent.find().sort({ updatedAt: -1 }).lean()
    res.json({ items: docs.map(toEvent) })
  } catch (error) {
    next(error)
  }
})

eventsAdminRouter.get('/preview/:slug', async (req, res, next) => {
  try {
    const doc = await BrotherhoodEvent.findOne({ slug: String(req.params.slug || '').slice(0, 80) }).lean()
    if (!doc) return res.status(404).json({ error: 'Not found' })
    const event = toEvent(doc)
    res.json({ program: publicProgram({ ...event, status: 'published' }), status: event.status, serverNow: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})

eventsAdminRouter.get('/roster', manage, async (_req, res, next) => {
  try {
    const docs = await StaffAccount.find({ active: true }).sort({ name: 1 }).lean()
    const people = docs.map(toStaff).filter((person) => person.permissions.includes('events.operate') || person.permissions.includes('events.manage'))
    res.json({ people: people.map((person) => ({ id: person.id, name: person.name, role: person.role })) })
  } catch (error) {
    next(error)
  }
})

eventsAdminRouter.get('/:id', async (req, res, next) => {
  try {
    const doc = await load(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    const payload = await bundle(doc, req.actor)
    if (!can(req.actor, 'events.manage')) {
      payload.event = {
        ...payload.event,
        phases: payload.event.phases,
      }
    }
    res.json(payload)
  } catch (error) {
    next(error)
  }
})

eventsAdminRouter.post('/', manage, async (req, res, next) => {
  try {
    const { data, errors, warnings } = readProgram(req.body || {})
    if (errors.length) return res.status(422).json({ error: 'Invalid event', errors })
    const slug = slugOf(req.body?.slug || data.title)
    if (!slug) return res.status(422).json({ error: 'Invalid event', errors: [{ path: 'slug', code: 'required' }] })
    const doc = await BrotherhoodEvent.create({ ...data, slug, status: 'draft', updatedBy: req.actor.name })
    await recordAudit(req.actor, 'event.create', 'event', doc._id, doc.title)
    res.status(201).json({ event: toEvent(doc), warnings })
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'slug' })
    next(error)
  }
})

eventsAdminRouter.patch('/:id', manage, async (req, res, next) => {
  try {
    const doc = await load(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    const { data, errors, warnings } = readProgram(req.body || {})
    if (errors.length) return res.status(422).json({ error: 'Invalid event', errors })
    const before = toEvent(doc)
    const changed = publicChanged(before, { ...before, ...data })
    if (doc.status === 'published' && changed && req.body?.confirmPublic !== true) return res.status(409).json({ error: 'confirm', warnings })
    const previousBanner = doc.banner
    Object.assign(doc, data, { updatedBy: req.actor.name })
    if (doc.status === 'published' && changed) doc.publicUpdatedAt = new Date()
    await doc.save()
    const kept = uploadIdOf(doc.banner)
    if (kept) await markAttached([kept])
    const removed = uploadIdOf(previousBanner)
    if (removed && removed !== kept) await releaseUploads([removed])
    await recordAudit(req.actor, 'event.update', 'event', doc._id, doc.title)
    res.json({ ...(await bundle(doc, req.actor)), warnings })
  } catch (error) {
    next(error)
  }
})

const setStatus = (status) => async (req, res, next) => {
  try {
    const doc = await load(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    doc.status = status
    if (status === 'published') doc.publicUpdatedAt = new Date()
    doc.updatedBy = req.actor.name
    await doc.save()
    await recordAudit(req.actor, `event.${status}`, 'event', doc._id, doc.title)
    res.json(await bundle(doc, req.actor))
  } catch (error) {
    next(error)
  }
}

eventsAdminRouter.post('/:id/publish', manage, setStatus('published'))
eventsAdminRouter.post('/:id/unpublish', manage, setStatus('draft'))
eventsAdminRouter.post('/:id/archive', manage, setStatus('archived'))

eventsAdminRouter.post('/:id/duplicate', manage, async (req, res, next) => {
  try {
    const doc = await load(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    const base = slugOf(`${doc.slug}-copie`)
    let slug = base
    for (let n = 2; await BrotherhoodEvent.exists({ slug }); n += 1) slug = `${base}-${n}`
    const source = toEvent(doc)
    delete source.id
    delete source.updatedAt
    const copy = await BrotherhoodEvent.create({ ...source, slug, title: `${doc.title} — copie`, status: 'draft', publicUpdatedAt: null, updatedBy: req.actor.name })
    await recordAudit(req.actor, 'event.duplicate', 'event', copy._id, copy.title)
    res.status(201).json({ event: toEvent(copy) })
  } catch (error) {
    next(error)
  }
})

eventsAdminRouter.post('/:id/banner', manage, express.raw({ type: STORY_IMAGE_TYPES, limit: STORY_IMAGE_LIMIT + 1024 }), async (req, res, next) => {
  try {
    const doc = await load(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    if (doc.status === 'published' && req.headers['x-confirm-public'] !== 'yes') return res.status(409).json({ error: 'confirm' })
    const type = String(req.headers['content-type'] || '').split(';')[0]
    const stored = await storeStoryImage(type, req.body, req.actor)
    if (!stored) return res.status(422).json({ error: 'image' })
    const previous = uploadIdOf(doc.banner)
    const nextId = uploadIdOf(stored.src)
    doc.banner = stored.src
    doc.updatedBy = req.actor.name
    if (doc.status === 'published') doc.publicUpdatedAt = new Date()
    await doc.save()
    if (nextId) await markAttached([nextId])
    if (previous && previous !== nextId) await releaseUploads([previous])
    await recordAudit(req.actor, 'event.update', 'event', doc._id, 'banner')
    res.json({ banner: doc.banner })
  } catch (error) {
    next(error)
  }
})

eventsAdminRouter.delete('/:id/banner', manage, async (req, res, next) => {
  try {
    const doc = await load(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    if (doc.status === 'published' && req.headers['x-confirm-public'] !== 'yes') return res.status(409).json({ error: 'confirm' })
    const previous = uploadIdOf(doc.banner)
    doc.banner = ''
    doc.updatedBy = req.actor.name
    if (doc.status === 'published' && previous) doc.publicUpdatedAt = new Date()
    await doc.save()
    if (previous) await releaseUploads([previous])
    await recordAudit(req.actor, 'event.update', 'event', doc._id, 'banner-removed')
    res.json({ banner: '' })
  } catch (error) {
    next(error)
  }
})

eventsAdminRouter.post('/:id/tasks', manage, async (req, res, next) => {
  try {
    const doc = await load(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    const { data, errors } = readTask(req.body)
    if (errors.length) return res.status(422).json({ error: 'Invalid task', errors })
    const count = await EventTask.countDocuments({ event: doc._id })
    const task = await EventTask.create({ ...data, event: doc._id, sort: (count + 1) * 10 })
    await recordAudit(req.actor, 'event.task', 'event', doc._id, task.title)
    res.status(201).json({ task: toTask(task) })
  } catch (error) {
    next(error)
  }
})

eventsAdminRouter.patch('/:id/tasks/:taskId', async (req, res, next) => {
  try {
    const doc = await load(req.params.id)
    const task = mongoose.isValidObjectId(req.params.taskId) ? await EventTask.findOne({ _id: req.params.taskId, event: doc?._id }) : null
    if (!doc || !task) return res.status(404).json({ error: 'Not found' })
    if (!canUpdateTask(req.actor, task)) return res.status(403).json({ error: 'Forbidden' })
    const managing = can(req.actor, 'events.manage')
    const { data, errors } = readTask(req.body, { partial: true, operateOnly: !managing })
    if (errors.length) return res.status(422).json({ error: 'Invalid task', errors })
    const previous = task.status
    Object.assign(task, data)
    if (data.status && data.status !== previous) {
      task.completedAt = data.status === 'done' ? new Date() : null
      task.updates.push({ at: new Date(), byId: req.actor.id, byName: req.actor.name, text: clean(req.body?.update, 400), status: data.status })
    } else if (req.body?.update) {
      task.updates.push({ at: new Date(), byId: req.actor.id, byName: req.actor.name, text: clean(req.body.update, 400), status: task.status })
    }
    if (task.updates.length > 20) task.updates = task.updates.slice(-20)
    await task.save()
    await recordAudit(req.actor, 'event.task', 'event', doc._id, `${task.title} · ${task.status}`)
    res.json({ task: toTask(task) })
  } catch (error) {
    next(error)
  }
})

eventsAdminRouter.delete('/:id/tasks/:taskId', manage, async (req, res, next) => {
  try {
    const doc = await load(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    const result = await EventTask.deleteOne({ _id: req.params.taskId, event: doc._id })
    if (!result.deletedCount) return res.status(404).json({ error: 'Not found' })
    await recordAudit(req.actor, 'event.task', 'event', doc._id, 'removed')
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

eventsAdminRouter.post('/:id/notices', manage, async (req, res, next) => {
  try {
    const doc = await load(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    const title = clean(req.body?.title, 140)
    const body = clean(req.body?.body, 800)
    if (title.length < 2 || body.length < 2) return res.status(422).json({ error: 'Invalid notice' })
    const notice = await EventNotice.create({ event: doc._id, title, body, urgent: req.body?.urgent === true, requiresAck: req.body?.requiresAck === true, author: req.actor.name })
    await recordAudit(req.actor, 'event.notice', 'event', doc._id, title)
    res.status(201).json({ notice: toNotice(notice, req.actor.id) })
  } catch (error) {
    next(error)
  }
})

eventsAdminRouter.post('/:id/notices/:noticeId/ack', async (req, res, next) => {
  try {
    const notice = mongoose.isValidObjectId(req.params.noticeId) ? await EventNotice.findOne({ _id: req.params.noticeId, event: req.params.id }) : null
    if (!notice) return res.status(404).json({ error: 'Not found' })
    if (!notice.acks.some((ack) => ack.staffId === req.actor.id)) notice.acks.push({ staffId: req.actor.id, name: req.actor.name, at: new Date() })
    await notice.save()
    res.json({ notice: toNotice(notice, req.actor.id) })
  } catch (error) {
    next(error)
  }
})

const clean = (value, max) => String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, max)
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/

const readTask = (body = {}, { partial = false, operateOnly = false } = {}) => {
  const errors = []
  const data = {}
  if (!operateOnly) {
    if (body.title !== undefined || !partial) {
      data.title = clean(body.title, 160)
      if (data.title.length < 2) errors.push({ path: 'title', code: 'required' })
    }
    if (body.detail !== undefined) data.detail = clean(body.detail, 600)
    if (body.team !== undefined) data.team = ['reception', 'entertainment', 'workshops', 'logistics', 'gifts', 'photography', 'dismantling'].includes(body.team) ? body.team : ''
    if (body.assigneeId !== undefined) data.assigneeId = clean(body.assigneeId, 40)
    if (body.assigneeName !== undefined) data.assigneeName = clean(body.assigneeName, 80)
    if (body.day !== undefined) data.day = ['friday', 'saturday', 'event', 'after'].includes(body.day) ? body.day : 'event'
    if (body.start !== undefined) {
      data.start = CLOCK.test(body.start || '') || body.start === '' ? body.start || '' : ''
      if (body.start && !CLOCK.test(body.start)) errors.push({ path: 'start', code: 'clock' })
    }
    if (body.end !== undefined) {
      data.end = CLOCK.test(body.end || '') || body.end === '' ? body.end || '' : ''
      if (body.end && !CLOCK.test(body.end)) errors.push({ path: 'end', code: 'clock' })
    }
    if (body.priority !== undefined) data.priority = ['normal', 'high', 'urgent'].includes(body.priority) ? body.priority : 'normal'
  }
  if (body.status !== undefined) {
    data.status = ['todo', 'progress', 'blocked', 'done'].includes(body.status) ? body.status : ''
    if (!data.status) errors.push({ path: 'status', code: 'status' })
  }
  if (body.notes !== undefined) data.notes = clean(body.notes, 800)
  if (Array.isArray(body.checklist)) {
    data.checklist = body.checklist.slice(0, 20).map((item, index) => ({
      id: clean(item?.id, 40) || `check-${index + 1}`,
      label: clean(item?.label, 160),
      done: item?.done === true,
    })).filter((item) => item.label)
  }
  return { data, errors }
}
