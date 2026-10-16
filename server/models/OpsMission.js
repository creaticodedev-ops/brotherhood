import mongoose from 'mongoose'

export const MISSION_STATUSES = ['upcoming', 'ongoing', 'completed', 'archived']

const noteSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    actor: { type: String, maxlength: 80, default: '' },
    text: { type: String, maxlength: 2000, required: true },
  },
  { _id: false },
)

const missionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    objectives: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: String, trim: true, maxlength: 80, default: '' },
    plannedAt: { type: Date, default: null },
    location: { type: String, trim: true, maxlength: 160, default: '' },
    status: { type: String, enum: MISSION_STATUSES, default: 'upcoming', index: true },
    assignees: { type: [String], default: [] },
    budget: { type: Number, min: 0, max: 100_000_000, default: 0 },
    limit: { type: Number, min: 0, max: 100_000_000, default: 0 },
    currency: { type: String, default: 'MAD', maxlength: 3 },
    report: { type: String, trim: true, maxlength: 8000, default: '' },
    timeline: { type: [noteSchema], default: [] },
  },
  { timestamps: true },
)

export const OpsMission = mongoose.models.OpsMission || mongoose.model('OpsMission', missionSchema)

export const toMission = (doc, figures = null) => ({
  id: String(doc._id),
  title: doc.title,
  description: doc.description || '',
  objectives: doc.objectives || '',
  category: doc.category || '',
  plannedAt: doc.plannedAt,
  location: doc.location || '',
  status: doc.status,
  assignees: doc.assignees || [],
  budget: doc.budget || 0,
  limit: doc.limit || 0,
  currency: doc.currency || 'MAD',
  report: doc.report || '',
  timeline: (doc.timeline || []).map(({ at, actor, text }) => ({ at, actor, text })),
  figures,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
})
