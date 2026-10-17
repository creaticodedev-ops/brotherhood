import mongoose from 'mongoose'

const TYPES = ['image/jpeg', 'image/png', 'image/webp']

const portraitSchema = new mongoose.Schema(
  {
    registration: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration', required: true, unique: true },
    contentType: { type: String, enum: TYPES, required: true },
    data: { type: Buffer, required: true },
    bytes: { type: Number, required: true, min: 1, max: 1_500_000 },
  },
  { timestamps: true },
)

export const Portrait = mongoose.models.Portrait || mongoose.model('Portrait', portraitSchema)
