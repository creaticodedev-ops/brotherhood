import mongoose from 'mongoose'

const bookSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'caisse', unique: true },
    opening: { type: Number, default: 0, min: 0, max: 100_000_000 },
    currency: { type: String, default: 'MAD', maxlength: 3 },
  },
  { timestamps: true },
)

export const FinanceBook = mongoose.models.FinanceBook || mongoose.model('FinanceBook', bookSchema)

export const loadBook = async () => {
  const doc = await FinanceBook.findOne({ key: 'caisse' }).lean()
  return doc || { opening: 0, currency: 'MAD' }
}
