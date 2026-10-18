import mongoose from 'mongoose'

export const STAFF_ROLES = ['admin', 'staff']

/** Every permission the API enforces, grouped by module. The admin client renders exactly this list. */
export const PERMISSION_GROUPS = [
  { id: 'recruitment', permissions: ['recruitment.review', 'recruitment.decide', 'recruitment.delete', 'members.read'] },
  { id: 'operations', permissions: ['missions.manage', 'finance.record', 'finance.approve'] },
  { id: 'administration', permissions: ['registration.manage', 'content.manage', 'audit.read'] },
]
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.permissions)
/** Permissions that can only be granted to the Admin role. */
export const ADMIN_ONLY_PERMISSIONS = ['recruitment.delete', 'registration.manage', 'content.manage', 'audit.read']
export const STAFF_PERMISSIONS = ALL_PERMISSIONS.filter((permission) => !ADMIN_ONLY_PERMISSIONS.includes(permission))

export const grantableFor = (role) => (role === 'admin' ? ALL_PERMISSIONS : STAFF_PERMISSIONS)

/**
 * Admin accounts created before permissions were explicit held every module. Until the Super Admin
 * saves a list for them (`permissionsSet`), they keep every Admin permission so nobody is locked out.
 */
export const effectivePermissions = (doc) => {
  const allowed = grantableFor(doc?.role)
  if (doc?.role === 'admin' && !doc.permissionsSet) return [...allowed]
  return [...new Set((doc?.permissions || []).filter((permission) => allowed.includes(permission)))]
}

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: STAFF_ROLES, default: 'staff' },
    permissions: { type: [String], default: ['recruitment.review'] },
    permissionsSet: { type: Boolean, default: false },
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
  permissions: effectivePermissions(doc),
  legacyAccess: doc.role === 'admin' && !doc.permissionsSet,
  active: doc.active,
  createdAt: doc.createdAt,
})
