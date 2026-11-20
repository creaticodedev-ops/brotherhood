import 'dotenv/config'
import express from 'express'
import { AuditEvent } from '../models/AuditEvent.js'
import { BrotherhoodEvent } from '../models/BrotherhoodEvent.js'
import { EventNotice } from '../models/EventNotice.js'
import { EventTask } from '../models/EventTask.js'
import { eventsRouter } from '../routes/events.js'
import { eventsAdminRouter } from '../routes/eventsAdmin.js'
import { connectDB, disconnectDB } from '../configs/db.js'
import { publicProgram } from '../../shared/eventProgram.js'
import { seedEvents } from '../services/events.js'

const MARK = 'readiness-check'
const actor = { id: 'readiness', name: 'Readiness', permissions: ['*'], role: 'admin' }
const staff = { id: 'readiness-staff', name: 'Readiness staff', permissions: ['events.operate'], role: 'staff' }
const other = { id: 'readiness-other', name: 'Other', permissions: ['events.operate'], role: 'staff' }

const listen = (app) =>
  new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
  })

const json = async (response) => {
  const text = await response.text()
  const data = text ? JSON.parse(text) : {}
  if (!response.ok) throw Object.assign(new Error(`${response.status} ${data.error || ''}`), { status: response.status, data })
  return data
}

const main = async () => {
  if (!process.env.MONGODB_URI?.trim()) {
    console.error('MONGODB_URI is not configured on this machine.')
    process.exitCode = 2
    return
  }
  const countsBefore = {}
  if (!(await connectDB())) {
    process.exitCode = 2
    return
  }
  const watched = ['registrations', 'stories', 'staffaccounts', 'portraits', 'ledgerentries', 'adminaccounts']
  for (const name of watched) {
    const exists = await BrotherhoodEvent.db.db.listCollections({ name }).hasNext()
    countsBefore[name] = exists ? await BrotherhoodEvent.db.db.collection(name).countDocuments() : 0
  }
  await seedEvents()
  const original = await BrotherhoodEvent.findOne({ slug: 'childrens-day' })
  if (!original) throw new Error('missing childrens-day')
  const snapshot = {
    status: original.status,
    eventDate: original.eventDate,
    location: original.location,
    phases: JSON.parse(JSON.stringify(original.phases)),
    publicUpdatedAt: original.publicUpdatedAt,
  }
  const app = express()
  app.use(express.json())
  app.use('/api/events', eventsRouter)
  app.use('/api/admin/events', (req, res, next) => {
    req.actor = req.headers['x-actor'] === 'staff' ? staff : req.headers['x-actor'] === 'other' ? other : actor
    next()
  }, eventsAdminRouter)
  const server = await listen(app)
  const base = `http://127.0.0.1:${server.address().port}`
  let taskId = ''
  let noticeId = ''
  try {
    const created = await json(await fetch(`${base}/api/admin/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Contrôle temporaire', summary: 'Vérification, à retirer.' }) }))
    const draftId = created.event.id
    await json(await fetch(`${base}/api/admin/events/${draftId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...created.event, location: 'Lieu de contrôle', eventDate: '2026-12-01' }) }))
    await BrotherhoodEvent.deleteOne({ _id: draftId })

    const current = await json(await fetch(`${base}/api/admin/events/${original._id}`))
    const event = current.event
    const reordered = { ...event, phases: [...event.phases].reverse(), eventDate: '2026-12-01', location: 'Lieu de contrôle', confirmPublic: true }
    await json(await fetch(`${base}/api/admin/events/${original._id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(reordered) }))
    await json(await fetch(`${base}/api/admin/events/${original._id}/unpublish`, { method: 'POST' }))
    const hidden = await fetch(`${base}/api/events/childrens-day`)
    if (hidden.status !== 404) throw new Error(`unpublished page returned ${hidden.status}`)
    await json(await fetch(`${base}/api/admin/events/${original._id}/publish`, { method: 'POST' }))
    const published = await json(await fetch(`${base}/api/events/childrens-day`))
    const titles = published.program.phases.map((phase) => phase.title)
    const expected = [...snapshot.phases].reverse().filter((phase) => phase.visibility !== 'internal').map((phase) => phase.title)
    if (JSON.stringify(titles) !== JSON.stringify(expected)) throw new Error('reorder did not persist')
    if (published.program.location !== 'Lieu de contrôle' || published.program.eventDate !== '2026-12-01') throw new Error('date or location did not publish')
    if (JSON.stringify(published.program).includes('Démontage') || JSON.stringify(published.program).includes('Préparation')) throw new Error('internal program leaked')

    const task = await json(await fetch(`${base}/api/admin/events/${original._id}/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Contrôle de préparation', key: MARK, team: 'logistics', assigneeId: staff.id, assigneeName: staff.name, day: 'friday', start: '20:00', priority: 'high', checklist: [{ id: 'c1', label: 'Vérifier', done: false }] }),
    }))
    taskId = task.task.id
    const updated = await json(await fetch(`${base}/api/admin/events/${original._id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-actor': 'staff' },
      body: JSON.stringify({ status: 'progress', notes: 'Note interne', update: 'En cours', checklist: [{ id: 'c1', label: 'Vérifier', done: true }] }),
    }))
    if (updated.task.status !== 'progress' || !updated.task.checklist[0].done) throw new Error('task update did not persist')
    const denied = await fetch(`${base}/api/admin/events/${original._id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-actor': 'other' },
      body: JSON.stringify({ status: 'done' }),
    })
    if (denied.status !== 403) throw new Error(`other staff received ${denied.status}`)
    const notice = await json(await fetch(`${base}/api/admin/events/${original._id}/notices`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Contrôle', body: 'Annonce interne de vérification.', urgent: true, requiresAck: true }),
    }))
    noticeId = notice.notice.id
    const acked = await json(await fetch(`${base}/api/admin/events/${original._id}/notices/${noticeId}/ack`, { method: 'POST', headers: { 'x-actor': 'staff' } }))
    if (!acked.notice.acknowledged) throw new Error('acknowledgement did not persist')
    console.log('event workflow persisted and the public page stayed private')
  } finally {
    if (taskId) await EventTask.deleteOne({ _id: taskId })
    if (noticeId) await EventNotice.deleteOne({ _id: noticeId })
    await EventTask.deleteMany({ key: MARK })
    await EventNotice.deleteMany({ title: 'Contrôle', body: 'Annonce interne de vérification.' })
    await BrotherhoodEvent.deleteMany({ title: 'Contrôle temporaire' })
    original.status = snapshot.status
    original.eventDate = snapshot.eventDate
    original.location = snapshot.location
    original.phases = snapshot.phases
    original.publicUpdatedAt = snapshot.publicUpdatedAt
    original.updatedBy = original.updatedBy || 'programme'
    await original.save()
    await AuditEvent.deleteMany({ actorId: { $in: ['readiness', 'readiness-staff', 'readiness-other'] } })
    const again = await BrotherhoodEvent.findById(original._id).lean()
    const visible = publicProgram(again)
    const expectedTitles = snapshot.phases.filter((phase) => phase.visibility !== 'internal').map((phase) => phase.title)
    if (again.eventDate !== snapshot.eventDate || again.location !== snapshot.location || again.status !== snapshot.status) throw new Error('original event was not restored')
    if (snapshot.status === 'published' && JSON.stringify(visible?.phases?.map((phase) => phase.title)) !== JSON.stringify(expectedTitles)) throw new Error('public phases were not restored')
    for (const name of watched) {
      const exists = await BrotherhoodEvent.db.db.listCollections({ name }).hasNext()
      const count = exists ? await BrotherhoodEvent.db.db.collection(name).countDocuments() : 0
      if (count !== countsBefore[name]) throw new Error(`${name} count changed`)
    }
    server.close()
    await disconnectDB()
  }
}

main().catch(async (error) => {
  console.error(String(error?.message || error).replace(/mongodb(?:\+srv)?:\/\/\S+/gi, 'mongodb://[redacted]'))
  await disconnectDB().catch(() => {})
  process.exitCode = 1
})
