import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['registration'], default: 'registration' },
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true },
    name: { type: String, required: true, maxlength: 130 },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    duration: { type: String, required: true },
    offer: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
)

notificationSchema.index({ createdAt: -1 })
notificationSchema.index({ readAt: 1 })

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)

export const toNotification = (doc) => ({
  id: String(doc._id),
  kind: doc.kind,
  registration: String(doc.registration),
  name: doc.name,
  amount: doc.amount,
  currency: doc.currency,
  duration: doc.duration,
  offer: doc.offer,
  read: Boolean(doc.readAt),
  readAt: doc.readAt,
  createdAt: doc.createdAt,
})
