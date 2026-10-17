import assert from 'node:assert/strict'
import test from 'node:test'
import { LEGACY_STATUS_UPDATES, STATUSES } from '../models/Registration.js'
import { canSeeMembers } from '../services/adminAuth.js'
import { portraitFile } from '../services/portrait.js'

test('startup migration does not rewrite the current new status', () => {
  const touched = LEGACY_STATUS_UPDATES.flatMap((item) => item.match)
  assert.deepEqual(touched, ['contacted', 'closed'])
  assert.equal(touched.includes('new'), false)
  assert.equal(STATUSES.includes('new'), true)
})

test('member details require a recruitment or members permission', () => {
  assert.equal(canSeeMembers({ permissions: ['*'] }), true)
  assert.equal(canSeeMembers({ permissions: ['recruitment.review'] }), true)
  assert.equal(canSeeMembers({ permissions: ['recruitment.decide'] }), true)
  assert.equal(canSeeMembers({ permissions: ['members.read'] }), true)
  assert.equal(canSeeMembers({ permissions: ['finance.record'] }), false)
  assert.equal(canSeeMembers({ permissions: ['missions.manage'] }), false)
  assert.equal(canSeeMembers(null), false)
})

test('portrait filenames cannot leave the upload directory', () => {
  assert.equal(portraitFile('../secrets.env'), null)
  assert.equal(portraitFile('..\\secrets.env'), null)
  assert.equal(portraitFile('not-an-id.jpg'), null)
  assert.equal(portraitFile(''), null)
  assert.equal(typeof portraitFile(`${'a'.repeat(24)}.jpg`), 'string')
})
