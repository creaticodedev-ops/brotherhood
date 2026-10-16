import assert from 'node:assert/strict'
import test from 'node:test'
import { validateMembership } from '../services/membership.js'

const phone = { phone: '+212612345678', phoneCountry: 'MA' }

const valid = () => ({
  firstName: 'Sara',
  lastName: 'Bennani',
  city: 'Safi',
  email: 'sara@example.com',
  age: 21,
  organization: 'Faculté',
  domain: 'Communication',
  motivation: 'Je veux documenter les missions et raconter le groupe avec justesse.',
  contribution: 'Photos, légendes et présence sur le terrain.',
  squads: ['communication'],
  challenges: { hook: 'Trois secondes. Une rue. Une couverture.' },
  locale: 'fr',
})

test('accepts a complete membership application', () => {
  const { errors, data } = validateMembership(valid(), phone)
  assert.deepEqual(errors, {})
  assert.equal(data.kind, 'membership')
  assert.equal(data.offer, 'membership')
  assert.equal(data.phone, '+212612345678')
  assert.deepEqual(data.squads, ['communication'])
})

test('rejects a short motivation and a missing challenge', () => {
  const { errors } = validateMembership({ ...valid(), motivation: 'Trop court', challenges: {} }, phone)
  assert.equal(errors.motivation, 'short')
  assert.equal(errors.challenges, 'hook')
})

test('rejects an invalid phone and an unknown squad', () => {
  const { errors } = validateMembership({ ...valid(), squads: ['finance'] }, null)
  assert.equal(errors.phone, 'invalid')
  assert.equal(errors.squads, 'invalid')
})

test('keeps only known challenge fields', () => {
  const { data } = validateMembership({ ...valid(), challenges: { hook: '  ok  ', secret: 'no', order: ['polo', 4] } }, phone)
  assert.equal(data.challenges.hook, 'ok')
  assert.equal(data.challenges.secret, undefined)
  assert.deepEqual(data.challenges.order, ['polo'])
})
