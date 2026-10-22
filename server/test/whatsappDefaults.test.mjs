import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanWhatsAppGroupUrl, readMembershipSettingsInput } from '../services/membershipSettings.js'

test('accepts official WhatsApp group invite links', () => {
  assert.equal(cleanWhatsAppGroupUrl('https://chat.whatsapp.com/AbCdEfGhIjKlMnOp'), 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOp')
  assert.equal(cleanWhatsAppGroupUrl('https://www.chat.whatsapp.com/AbCdEfGhIjKlMnOp/'), 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOp')
})

test('rejects non-invite or insecure URLs', () => {
  assert.equal(cleanWhatsAppGroupUrl(''), '')
  assert.equal(cleanWhatsAppGroupUrl('http://chat.whatsapp.com/AbCdEfGhIjKlMnOp'), null)
  assert.equal(cleanWhatsAppGroupUrl('https://wa.me/212612345678'), null)
  assert.equal(cleanWhatsAppGroupUrl('https://example.com/group'), null)
  assert.equal(cleanWhatsAppGroupUrl('not-a-url'), null)
})

test('membership settings input validates the group URL field', () => {
  const bad = readMembershipSettingsInput({ whatsappGroupUrl: 'https://google.com' })
  assert.equal(bad.errors.whatsappGroupUrl, 'url')
  const good = readMembershipSettingsInput({ whatsappGroupUrl: 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOp' })
  assert.equal(good.errors.whatsappGroupUrl, undefined)
  assert.equal(good.data.whatsappGroupUrl, 'https://chat.whatsapp.com/AbCdEfGhIjKlMnOp')
})
