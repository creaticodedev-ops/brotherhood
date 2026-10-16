import mongoose from 'mongoose'

/** Single administrator account. Only hashes are stored: never the password or the reset token itself. */
const adminAccountSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'primary', unique: true },
    passwordHash: { type: String, required: true },
    passwordChangedAt: { type: Date, default: Date.now },
    // Bumped on every password change so all open sessions are signed out.
    sessionVersion: { type: Number, default: 1 },
    sessionSecret: { type: String, required: true },
    resetTokenHash: { type: String, default: null },
    resetExpiresAt: { type: Date, default: null },
    resetRequestedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export const AdminAccount = mongoose.models.AdminAccount || mongoose.model('AdminAccount', adminAccountSchema)
