import { CHILDREN_DAY, SEED_TASKS, liveState, publicProgram } from '../../shared/eventProgram.js'
import { BrotherhoodEvent } from '../models/BrotherhoodEvent.js'
import { EventTask } from '../models/EventTask.js'

export const seedEvents = async () => {
  const existing = await BrotherhoodEvent.findOne({ slug: CHILDREN_DAY.slug }).select('_id').lean()
  if (existing) return
  const doc = await BrotherhoodEvent.create({
    ...CHILDREN_DAY,
    status: 'published',
    publicUpdatedAt: new Date(),
    updatedBy: 'programme',
  })
  await EventTask.insertMany(
    SEED_TASKS.map((task, index) => ({
      event: doc._id,
      ...task,
      sort: (index + 1) * 10,
    })),
  )
  console.log("[events] Seeded the Children's Day program")
}

export const eventOps = (event, tasks, notices, now = new Date()) => {
  const live = liveState(event, now, { includeInternal: false })
  const counts = { total: tasks.length, todo: 0, progress: 0, blocked: 0, done: 0 }
  tasks.forEach((task) => {
    counts[task.status] = (counts[task.status] || 0) + 1
  })
  return {
    activities: (event.phases || []).reduce((sum, phase) => sum + (phase.activities?.length || 0), 0),
    publicActivities: (publicProgram(event)?.phases || []).reduce((sum, phase) => sum + phase.activities.length, 0),
    tasks: counts,
    notices: notices.length,
    urgent: notices.filter((notice) => notice.urgent).length,
    current: live.current,
    next: live.next,
  }
}
