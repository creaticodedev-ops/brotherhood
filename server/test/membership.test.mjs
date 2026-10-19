import assert from 'node:assert/strict'
import test from 'node:test'
import { readPhoto, validateMembership } from '../services/membership.js'

const phone = { phone: '+212612345678', phoneCountry: 'MA' }
const TINY_JPEG = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEA8QEA8PDw8PDw8PDw8PFREQEBQOFBQYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGf/9k='
const PHOTO = `data:image/jpeg;base64,${TINY_JPEG}`

const valid = () => ({
  firstName: 'Sara',
  lastName: 'Bennani',
  city: 'Safi',
  email: 'sara@example.com',
  age: 21,
  gender: 'femme',
  organization: 'Faculté',
  domain: 'Communication',
  motivation: 'Je veux documenter les missions et raconter le groupe avec justesse.',
  contribution: 'Photos, légendes et présence sur le terrain.',
  squads: ['communication'],
  photo: PHOTO,
  challenges: {
    asfi: 'Trente secondes filmées depuis la médina jusqu’à la mer, sans commentaire.',
    fund: 'Un repas partagé dont l’entrée finance le matériel de la sortie.',
    responsibility: 'Oui. Je préviens, je répartis, et je reste jusqu’à ce que ce soit fini.',
  },
  locale: 'fr',
})

test('accepts a complete membership application with a profile photo', () => {
  const { errors, data, photo } = validateMembership(valid(), phone)
  assert.deepEqual(errors, {})
  assert.equal(data.kind, 'membership')
  assert.equal(data.offer, 'membership')
  assert.equal(data.phone, '+212612345678')
  assert.equal(data.gender, 'femme')
  assert.deepEqual(data.squads, ['communication'])
  assert.equal(photo.type, 'image/jpeg')
})

test('requires a profile photo', () => {
  const { errors, photo } = validateMembership({ ...valid(), photo: '' }, phone)
  assert.equal(errors.photo, 'required')
  assert.equal(photo, null)
})

test('accepts a real jpeg profile photo and rejects a fake one', () => {
  const good = readPhoto(PHOTO)
  assert.equal(good.photo.type, 'image/jpeg')
  assert.equal(readPhoto('').missing, true)
  assert.equal(readPhoto('data:image/jpeg;base64,aGVsbG8').error, 'invalid')
})

test('rejects a missing gender', () => {
  const { errors } = validateMembership({ ...valid(), gender: '' }, phone)
  assert.equal(errors.gender, 'required')
})

test('rejects a short motivation and a missing challenge', () => {
  const { errors } = validateMembership({ ...valid(), motivation: 'Trop court', challenges: {} }, phone)
  assert.equal(errors.motivation, 'short')
  assert.equal(errors.challenges, 'asfi,fund,responsibility')
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
