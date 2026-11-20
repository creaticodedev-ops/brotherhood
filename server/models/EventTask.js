import mongoose from 'mongoose'
import { PHASE_DAYS, PRIORITIES, TASK_STATUSES, TEAMS } from '../../shared/eventProgram.js'

const checkSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, maxlength: 40 },
    label: { type: String, required: true, maxlength: 160 },
    done: { type: Boolean, default: false },
  },
  { _id: false },
)

const updateSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    byId: { type: String, default: '', maxlength: 40 },
    byName: { type: String, default: '', maxlength: 80 },
    text: { type: String, default: '', maxlength: 400 },
    status: { type: String, default: '', maxlength: 20 },
  },
  { _id: false },
)

const taskSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'BrotherhoodEvent', required: true, index: true },
    key: { type: String, default: '', maxlength: 40 },
    title: { type: String, required: true, maxlength: 160 },
    detail: { type: String, default: '', maxlength: 600 },
    team: { type: String, enum: ['', ...TEAMS], default: '' },
    assigneeId: { type: String, default: '', maxlength: 40 },
    assigneeName: { type: String, default: '', maxlength: 80 },
    day: { type: String, enum: PHASE_DAYS, default: 'event' },
    start: { type: String, default: '', maxlength: 5 },
    end: { type: String, default: '', maxlength: 5 },
    priority: { type: String, enum: PRIORITIES, default: 'normal' },
    status: { type: String, enum: TASK_STATUSES, default: 'todo', index: true },
    checklist: { type: [checkSchema], default: [] },
    notes: { type: String, default: '', maxlength: 800 },
    updates: { type: [updateSchema], default: [] },
    completedAt: { type: Date, default: null },
    sort: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const EventTask = mongoose.models.EventTask || mongoose.model('EventTask', taskSchema)

export const toTask = (doc) => ({
  id: String(doc._id),
  eventId: String(doc.event),
  key: doc.key,
  title: doc.title,
  detail: doc.detail,
  team: doc.team,
  assigneeId: doc.assigneeId,
  assigneeName: doc.assigneeName,
  day: doc.day,
  start: doc.start,
  end: doc.end,
  priority: doc.priority,
  status: doc.status,
  checklist: doc.checklist || [],
  notes: doc.notes,
  updates: (doc.updates || []).slice(-12),
  completedAt: doc.completedAt,
  sort: doc.sort,
})
