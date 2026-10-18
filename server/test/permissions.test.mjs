import assert from 'node:assert/strict'
import test from 'node:test'
import { ADMIN_ONLY_PERMISSIONS, ALL_PERMISSIONS, PERMISSION_GROUPS, STAFF_PERMISSIONS, effectivePermissions, grantableFor, toStaff } from '../models/StaffAccount.js'
import { can, isSuperAdmin } from '../services/adminAuth.js'

test('the catalog lists every permission exactly once', () => {
  assert.equal(new Set(ALL_PERMISSIONS).size, ALL_PERMISSIONS.length)
  assert.deepEqual(PERMISSION_GROUPS.map((group) => group.id), ['recruitment', 'operations', 'administration'])
  ADMIN_ONLY_PERMISSIONS.forEach((permission) => assert.ok(ALL_PERMISSIONS.includes(permission)))
})

test('staff can receive the operational permissions they had before, never the admin-only ones', () => {
  assert.deepEqual(STAFF_PERMISSIONS, ['recruitment.review', 'recruitment.decide', 'members.read', 'missions.manage', 'finance.record', 'finance.approve'])
  ADMIN_ONLY_PERMISSIONS.forEach((permission) => assert.equal(grantableFor('staff').includes(permission), false))
  assert.deepEqual(grantableFor('admin'), ALL_PERMISSIONS)
})

test('a staff account keeps exactly its stored permissions and loses anything outside its role', () => {
  assert.deepEqual(effectivePermissions({ role: 'staff', permissions: ['recruitment.review'] }), ['recruitment.review'])
  assert.deepEqual(effectivePermissions({ role: 'staff', permissions: ['recruitment.review', 'audit.read', '*', 'unknown'] }), ['recruitment.review'])
})

test('an admin account created before explicit permissions keeps every admin module until one is saved', () => {
  const legacy = toStaff({ _id: 'a', role: 'admin', permissions: ['recruitment.review'] })
  assert.deepEqual(legacy.permissions, ALL_PERMISSIONS)
  assert.equal(legacy.legacyAccess, true)
  const saved = toStaff({ _id: 'b', role: 'admin', permissions: ['audit.read'], permissionsSet: true })
  assert.deepEqual(saved.permissions, ['audit.read'])
  assert.equal(saved.legacyAccess, false)
})

test('no account ever receives the wildcard', () => {
  assert.equal(effectivePermissions({ role: 'admin', permissions: ['*'], permissionsSet: true }).includes('*'), false)
  assert.equal(effectivePermissions({ role: 'admin' }).includes('*'), false)
})

test('only the primary account is the Super Admin', () => {
  assert.equal(isSuperAdmin({ id: 'primary', superAdmin: true, permissions: ['*'] }), true)
  assert.equal(isSuperAdmin({ id: '64b000000000000000000000', role: 'admin', superAdmin: true, permissions: ALL_PERMISSIONS }), false)
  assert.equal(isSuperAdmin({ id: 'primary', role: 'admin', permissions: ['*'] }), false)
  assert.equal(isSuperAdmin(null), false)
})

test('access is decided by the permission list, not the role name', () => {
  const admin = { role: 'admin', permissions: ['audit.read'] }
  assert.equal(can(admin, 'audit.read'), true)
  assert.equal(can(admin, 'finance.record'), false)
  assert.equal(can({ role: 'staff', permissions: ['finance.record'] }, 'finance.record'), true)
  assert.equal(can({ role: 'superadmin', permissions: ['*'] }, 'registration.manage'), true)
  assert.equal(can(null, 'audit.read'), false)
})
