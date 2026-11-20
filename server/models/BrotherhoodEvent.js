import mongoose from 'mongoose'
import { EVENT_STATUSES, EVENT_ZONE, PHASE_DAYS, TEAMS } from '../../shared/eventProgram.js'

const activitySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, maxlength: 40 },
    title: { type: String, required: true, maxlength: 160 },
    detail: { type: String, default: '', maxlength: 600 },
    start: { type: String, default: '', maxlength: 5 },
    end: { type: String, default: '', maxlength: 5 },
    team: { type: String, enum: ['', ...TEAMS], default: '' },
    visibility: { type: String, enum: ['public', 'internal'], default: 'public' },
  },
  { _id: false },
)

const phaseSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, maxlength: 40 },
    day: { type: String, enum: PHASE_DAYS, default: 'event' },
    title: { type: String, required: true, maxlength: 120 },
    start: { type: String, default: '', maxlength: 5 },
    end: { type: String, default: '', maxlength: 5 },
    visibility: { type: String, enum: ['public', 'internal'], default: 'public' },
    activities: { type: [activitySchema], default: [] },
  },
  { _id: false },
)

const eventSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    status: { type: String, enum: EVENT_STATUSES, default: 'draft', index: true },
    title: { type: String, required: true, maxlength: 140 },
    organizer: { type: String, default: '', maxlength: 120 },
    summary: { type: String, default: '', maxlength: 600 },
    location: { type: String, default: '', maxlength: 160 },
    eventDate: { type: String, default: '', maxlength: 10 },
    timeZone: { type: String, default: EVENT_ZONE, maxlength: 64 },
    parentInfo: { type: String, default: '', maxlength: 800 },
    banner: { type: String, default: '', maxlength: 80 },
    phases: { type: [phaseSchema], default: [] },
    publicUpdatedAt: { type: Date, default: null },
    updatedBy: { type: String, default: '', maxlength: 80 },
  },
  { timestamps: true },
)

export const BrotherhoodEvent = mongoose.models.BrotherhoodEvent || mongoose.model('BrotherhoodEvent', eventSchema)

export const toEvent = (doc) => ({
  id: String(doc._id),
  slug: doc.slug,
  status: doc.status,
  title: doc.title,
  organizer: doc.organizer,
  summary: doc.summary,
  location: doc.location,
  eventDate: doc.eventDate,
  timeZone: doc.timeZone,
  parentInfo: doc.parentInfo,
  banner: doc.banner,
  phases: doc.phases || [],
  publicUpdatedAt: doc.publicUpdatedAt,
  updatedAt: doc.updatedAt,
})
