import mongoose from 'mongoose'

export const STAFF_ROLES = ['admin', 'staff']
export const STAFF_PERMISSIONS = ['recruitment.review', 'recruitment.decide', 'missions.manage', 'finance.record', 'finance.approve', 'members.read']

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: STAFF_ROLES, default: 'staff' },
    permissions: { type: [String], default: ['recruitment.review'] },
    active: { type: Boolean, default: true },
    sessionVersion: { type: Number, default: 1 },
  },
  { timestamps: true },
)

export const StaffAccount = mongoose.models.StaffAccount || mongoose.model('StaffAccount', staffSchema)

export const toStaff = (doc) => ({
  id: String(doc._id),
  name: doc.name,
  email: doc.email,
  role: doc.role,
  permissions: doc.role === 'admin' ? ['*'] : doc.permissions || [],
  active: doc.active,
  createdAt: doc.createdAt,
})
