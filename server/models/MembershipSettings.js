import mongoose from 'mongoose'

const localeText = { fr: { type: String, default: '', maxlength: 12_000 }, en: { type: String, default: '', maxlength: 12_000 }, ar: { type: String, default: '', maxlength: 12_000 } }

const membershipSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'membership', unique: true },
    terms: localeText,
    termsVersion: { type: String, default: '1', maxlength: 40 },
    paymentInstructions: localeText,
    paymentAmount: { type: Number, default: 100, min: 1, max: 100_000 },
    paymentCurrency: { type: String, default: 'MAD', maxlength: 8 },
    whatsappGroupUrl: { type: String, default: '', trim: true, maxlength: 500 },
    linkExpiryDays: { type: Number, default: 14, min: 1, max: 90 },
    siteUrl: { type: String, default: '', trim: true, maxlength: 300 },
  },
  { timestamps: true },
)

export const MembershipSettings =
  mongoose.models.MembershipSettings || mongoose.model('MembershipSettings', membershipSettingsSchema)
