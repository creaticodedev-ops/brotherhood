import mongoose from 'mongoose'

export const OFFER_IDS = ['essential', 'advanced', 'premium', 'membership']
export const DURATIONS = ['15d', '1m', 'join']
export const KINDS = ['legacy', 'membership']
export const STATUSES = ['pending', 'approved', 'rejected', 'active', 'completed']

/** Status changes the admin may apply from a given status. */
export const TRANSITIONS = {
  pending: ['approved', 'rejected'],
  approved: ['active', 'rejected', 'pending'],
  rejected: ['pending'],
  active: ['completed'],
  completed: ['active'],
}

const historySchema = new mongoose.Schema(
  {
    from: { type: String, enum: STATUSES, required: true },
    status: { type: String, enum: STATUSES, required: true },
    at: { type: Date, required: true },
  },
  { _id: false },
)

const registrationSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: KINDS, default: 'legacy' },
    offer: { type: String, enum: OFFER_IDS, required: true },
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    // Not required at schema level: registrations sent before the field existed have no email.
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    // International format (+ country code), used for the WhatsApp confirmation. Same legacy caveat as email.
    phone: { type: String, trim: true, maxlength: 16 },
    phoneCountry: { type: String, trim: true, maxlength: 2 },
    amount: { type: Number, min: 0, max: 100_000_000, default: 0 },
    currency: { type: String, default: 'USD' },
    duration: { type: String, enum: DURATIONS, required: true },
    age: { type: Number, min: 0, max: 120 },
    organization: { type: String, trim: true, maxlength: 120, default: '' },
    domain: { type: String, trim: true, maxlength: 120, default: '' },
    motivation: { type: String, trim: true, maxlength: 2000, default: '' },
    contribution: { type: String, trim: true, maxlength: 2000, default: '' },
    squads: { type: [String], default: [] },
    challenges: { type: mongoose.Schema.Types.Mixed, default: {} },
    practical: { type: String, trim: true, maxlength: 2000, default: '' },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    locale: { type: String, enum: ['fr', 'en', 'ar'], default: 'fr' },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true },
)

registrationSchema.index({ createdAt: -1 })

export const Registration = mongoose.models.Registration || mongoose.model('Registration', registrationSchema)

/** Maps statuses from the first version of the form (new / contacted / closed) onto the admin workflow. */
export const migrateLegacyStatuses = async () => {
  const [pending, completed] = await Promise.all([
    Registration.updateMany({ status: { $in: ['new', 'contacted'] } }, { $set: { status: 'pending' } }),
    Registration.updateMany({ status: 'closed' }, { $set: { status: 'completed' } }),
  ])
  const moved = pending.modifiedCount + completed.modifiedCount
  if (moved) console.log(`[db] Migrated ${moved} registration(s) to the admin status workflow`)
}

export const toApplication = (doc) => ({
  id: String(doc._id),
  kind: doc.kind || 'legacy',
  offer: doc.offer,
  firstName: doc.firstName,
  lastName: doc.lastName,
  city: doc.city,
  email: doc.email || '',
  phone: doc.phone || '',
  phoneCountry: doc.phoneCountry || '',
  amount: doc.amount ?? 0,
  currency: doc.currency || '',
  duration: doc.duration,
  age: doc.age ?? null,
  organization: doc.organization || '',
  domain: doc.domain || '',
  motivation: doc.motivation || '',
  contribution: doc.contribution || '',
  squads: doc.squads || [],
  challenges: doc.challenges || {},
  practical: doc.practical || '',
  notes: doc.notes || '',
  locale: doc.locale,
  status: doc.status,
  history: (doc.history || []).map(({ from, status, at }) => ({ from, status, at })),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
})
