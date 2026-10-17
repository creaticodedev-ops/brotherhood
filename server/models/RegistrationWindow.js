import mongoose from 'mongoose'

const windowSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'membership', unique: true },
    countdownVisible: { type: Boolean, default: false },
    timeZone: { type: String, default: 'Africa/Casablanca', maxlength: 64 },
    opensAt: { type: Date, default: null },
    closesAt: { type: Date, default: null },
    override: { type: String, enum: ['auto', 'open', 'closed'], default: 'auto' },
    messagePreset: { type: String, enum: ['auto', 'soon', 'open', 'closed'], default: 'auto' },
  },
  { timestamps: true },
)

export const RegistrationWindow = mongoose.models.RegistrationWindow || mongoose.model('RegistrationWindow', windowSchema)
