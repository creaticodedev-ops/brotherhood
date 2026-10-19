import mongoose from 'mongoose'

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const paymentReceiptSchema = new mongoose.Schema(
  {
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true, unique: true },
    contentType: { type: String, enum: TYPES, required: true },
    data: { type: Buffer, required: true },
    bytes: { type: Number, required: true, min: 1, max: 5_000_000 },
    originalName: { type: String, trim: true, maxlength: 180, default: '' },
  },
  { timestamps: true },
)

export const RECEIPT_TYPES = TYPES
export const PaymentReceipt = mongoose.models.PaymentReceipt || mongoose.model('PaymentReceipt', paymentReceiptSchema)
