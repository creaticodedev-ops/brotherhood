import mongoose from 'mongoose'
import { finalizePipeline, toFinalizeAdmin } from '../services/finalize.js'

export const OFFER_IDS = ['essential', 'advanced', 'premium', 'membership']
export const DURATIONS = ['15d', '1m', 'join']
export const KINDS = ['legacy', 'membership']
export const STATUSES = [
  'new',
  'pending',
  'review',
  'accepted',
  'rejected',
  'approved',
  'finalizing',
  'payment_review',
  'active',
  'completed',
]

/** Status changes the admin may apply from a given status. */
export const TRANSITIONS = {
  new: ['pending', 'review', 'accepted', 'rejected'],
  pending: ['review', 'accepted', 'rejected', 'approved'],
  review: ['pending', 'accepted', 'rejected'],
  accepted: ['rejected', 'pending'],
  rejected: ['pending', 'review'],
  approved: ['accepted', 'finalizing', 'active', 'rejected', 'pending'],
  finalizing: ['payment_review', 'approved', 'rejected', 'pending'],
  payment_review: ['active', 'finalizing', 'rejected'],
  active: ['completed', 'accepted'],
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

const finalizeEventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, maxlength: 60 },
    at: { type: Date, required: true },
    actor: { type: String, maxlength: 80, default: '' },
    detail: { type: String, maxlength: 400, default: '' },
  },
  { _id: false },
)

const finalizationSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, default: '', maxlength: 64 },
    tokenHint: { type: String, default: '', maxlength: 8 },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    generatedAt: { type: Date, default: null },
    generatedBy: { type: String, maxlength: 80, default: '' },
    linkUrl: { type: String, maxlength: 500, default: '' },
    sentAt: { type: Date, default: null },
    instagram: { type: String, trim: true, maxlength: 300, default: '' },
    whatsapp: { type: String, trim: true, maxlength: 16, default: '' },
    whatsappCountry: { type: String, trim: true, maxlength: 2, default: '' },
    infoCompletedAt: { type: Date, default: null },
    termsVersion: { type: String, maxlength: 40, default: '' },
    termsAcceptedAt: { type: Date, default: null },
    receiptUploadedAt: { type: Date, default: null },
    receiptName: { type: String, maxlength: 180, default: '' },
    receiptBytes: { type: Number, default: 0 },
    receiptType: { type: String, maxlength: 80, default: '' },
    paymentStatus: { type: String, enum: ['none', 'pending', 'confirmed', 'rejected'], default: 'none' },
    paymentAmount: { type: Number, min: 0, max: 100_000, default: 100 },
    paymentCurrency: { type: String, default: 'MAD', maxlength: 8 },
    paymentReviewedAt: { type: Date, default: null },
    paymentReviewedBy: { type: String, maxlength: 80, default: '' },
    paymentRejectReason: { type: String, maxlength: 500, default: '' },
    events: { type: [finalizeEventSchema], default: [] },
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
    gender: { type: String, enum: ['', 'homme', 'femme'], default: '' },
    photo: { type: String, trim: true, maxlength: 40, default: '' },
    organization: { type: String, trim: true, maxlength: 120, default: '' },
    domain: { type: String, trim: true, maxlength: 120, default: '' },
    motivation: { type: String, trim: true, maxlength: 2000, default: '' },
    contribution: { type: String, trim: true, maxlength: 2000, default: '' },
    squads: { type: [String], default: [] },
    challenges: { type: mongoose.Schema.Types.Mixed, default: {} },
    practical: { type: String, trim: true, maxlength: 2000, default: '' },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    reviewedBy: { type: String, trim: true, maxlength: 80, default: '' },
    reviewedAt: { type: Date, default: null },
    whatsapp: {
      openedAt: { type: Date, default: null },
      actor: { type: String, maxlength: 80, default: '' },
      body: { type: String, maxlength: 1500, default: '' },
    },
    finalization: { type: finalizationSchema, default: () => ({}) },
    locale: { type: String, enum: ['fr', 'en', 'ar'], default: 'fr' },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    history: { type: [historySchema], default: [] },
  },
  { timestamps: true },
)

registrationSchema.index({ createdAt: -1 })
registrationSchema.index({ 'finalization.tokenHash': 1 }, { sparse: true })

export const Registration = mongoose.models.Registration || mongoose.model('Registration', registrationSchema)

/**
 * Statuses from the first form version. `new` is a current application status and is not included.
 * Each server start applies this map, so a current status in here would be rewritten on every deploy.
 */
export const LEGACY_STATUS_UPDATES = [
  { match: ['contacted'], status: 'pending' },
  { match: ['closed'], status: 'completed' },
]

/** Maps statuses from the first version of the form (contacted / closed) onto the admin workflow. */
export const migrateLegacyStatuses = async () => {
  const results = await Promise.all(
    LEGACY_STATUS_UPDATES.map((update) => Registration.updateMany({ status: { $in: update.match } }, { $set: { status: update.status } })),
  )
  const moved = results.reduce((sum, result) => sum + result.modifiedCount, 0)
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
  gender: doc.gender || '',
  photo: doc.photo || '',
  organization: doc.organization || '',
  domain: doc.domain || '',
  motivation: doc.motivation || '',
  contribution: doc.contribution || '',
  squads: doc.squads || [],
  challenges: doc.challenges || {},
  practical: doc.practical || '',
  notes: doc.notes || '',
  reviewedBy: doc.reviewedBy || '',
  reviewedAt: doc.reviewedAt || null,
  whatsapp: doc.whatsapp?.openedAt ? { openedAt: doc.whatsapp.openedAt, actor: doc.whatsapp.actor || '', body: doc.whatsapp.body || '' } : null,
  finalization: toFinalizeAdmin(doc),
  pipeline: finalizePipeline(doc),
  locale: doc.locale,
  status: doc.status,
  history: (doc.history || []).map(({ from, status, at }) => ({ from, status, at })),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
})
