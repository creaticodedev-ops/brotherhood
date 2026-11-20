import mongoose from 'mongoose'

const ackSchema = new mongoose.Schema(
  {
    staffId: { type: String, required: true, maxlength: 40 },
    name: { type: String, default: '', maxlength: 80 },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const noticeSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'BrotherhoodEvent', required: true, index: true },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, required: true, maxlength: 800 },
    urgent: { type: Boolean, default: false },
    requiresAck: { type: Boolean, default: false },
    acks: { type: [ackSchema], default: [] },
    author: { type: String, default: '', maxlength: 80 },
  },
  { timestamps: true },
)

export const EventNotice = mongoose.models.EventNotice || mongoose.model('EventNotice', noticeSchema)

export const toNotice = (doc, actorId = '') => ({
  id: String(doc._id),
  eventId: String(doc.event),
  title: doc.title,
  body: doc.body,
  urgent: doc.urgent,
  requiresAck: doc.requiresAck,
  ackCount: doc.acks?.length || 0,
  acknowledged: Boolean(actorId && doc.acks?.some((ack) => ack.staffId === actorId)),
  author: doc.author,
  createdAt: doc.createdAt,
})
