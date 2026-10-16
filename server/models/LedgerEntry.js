import mongoose from 'mongoose'

export const LEDGER_KINDS = ['income', 'expense', 'transfer', 'reversal']

const ledgerSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: LEDGER_KINDS, required: true },
    direction: { type: String, enum: ['in', 'out', ''], default: '' },
    amount: { type: Number, required: true, min: 0.01, max: 100_000_000 },
    currency: { type: String, default: 'MAD', maxlength: 3 },
    date: { type: Date, required: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    category: { type: String, trim: true, maxlength: 80, default: '' },
    mission: { type: mongoose.Schema.Types.ObjectId, ref: 'OpsMission', default: null },
    method: { type: String, trim: true, maxlength: 40, default: '' },
    receipt: { type: String, trim: true, maxlength: 500, default: '' },
    actor: { type: String, maxlength: 80, default: '' },
    actorId: { type: String, maxlength: 40, default: '' },
    status: { type: String, enum: ['posted', 'reversed'], default: 'posted', index: true },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: String, maxlength: 80, default: '' },
    reverses: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
)

ledgerSchema.index({ date: -1 })

export const LedgerEntry = mongoose.models.LedgerEntry || mongoose.model('LedgerEntry', ledgerSchema)

export const toEntry = (doc) => ({
  id: String(doc._id),
  kind: doc.kind,
  direction: doc.direction || '',
  amount: doc.amount,
  currency: doc.currency || 'MAD',
  date: doc.date,
  description: doc.description,
  category: doc.category || '',
  mission: doc.mission ? String(doc.mission) : '',
  method: doc.method || '',
  receipt: doc.receipt || '',
  actor: doc.actor || '',
  status: doc.status,
  approvedAt: doc.approvedAt,
  approvedBy: doc.approvedBy || '',
  reverses: doc.reverses ? String(doc.reverses) : '',
  createdAt: doc.createdAt,
})
