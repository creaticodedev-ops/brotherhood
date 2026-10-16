import mongoose from 'mongoose'

const auditSchema = new mongoose.Schema(
  {
    actor: { type: String, maxlength: 80, default: '' },
    actorId: { type: String, maxlength: 40, default: '' },
    action: { type: String, required: true, maxlength: 80 },
    target: { type: String, maxlength: 40, default: '' },
    targetId: { type: String, maxlength: 40, default: '' },
    detail: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true },
)

auditSchema.index({ createdAt: -1 })

export const AuditEvent = mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditSchema)

export const recordAudit = (actor, action, target, targetId, detail = '') =>
  AuditEvent.create({
    actor: actor?.name || '',
    actorId: actor?.id || '',
    action,
    target,
    targetId: targetId ? String(targetId) : '',
    detail: String(detail).slice(0, 300),
  }).catch((error) => {
    console.error('[audit]', error.message)
  })

export const toAudit = (doc) => ({
  id: String(doc._id),
  actor: doc.actor,
  action: doc.action,
  target: doc.target,
  targetId: doc.targetId,
  detail: doc.detail,
  createdAt: doc.createdAt,
})
