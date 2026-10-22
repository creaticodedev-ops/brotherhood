import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isValidWhatsAppPhone,
  isWhatsAppEligible,
  isWhatsAppGroupUrl,
  normalizeWhatsAppDigits,
  whatsappClickUrl,
} from '../../shared/whatsapp.js'

test('eligible statuses exclude pending and rejected', () => {
  assert.equal(isWhatsAppEligible({ status: 'approved' }), true)
  assert.equal(isWhatsAppEligible({ status: 'active' }), true)
  assert.equal(isWhatsAppEligible({ status: 'pending' }), false)
  assert.equal(isWhatsAppEligible({ status: 'rejected' }), false)
})

test('normalizes Moroccan and international phones without duplicating 212', () => {
  assert.equal(normalizeWhatsAppDigits('+212612345678'), '212612345678')
  assert.equal(normalizeWhatsAppDigits('0612345678'), '212612345678')
  assert.equal(normalizeWhatsAppDigits('2120612345678'), '212612345678')
  assert.equal(normalizeWhatsAppDigits('0033612345678'), '33612345678')
  assert.equal(isValidWhatsAppPhone('+212612345678'), true)
  assert.equal(isValidWhatsAppPhone('123'), false)
})

test('click-to-chat URL encodes accents, emojis and line breaks', () => {
  const message =
    'Salam Amine 👋\n\nBonne nouvelle ! Ta demande d’adhésion à THE BROTHERHOOD a été approuvée.\n\nhttps://chat.whatsapp.com/AbCdEfGhIjKlMnOp'
  const url = whatsappClickUrl('+212612345678', message)
  assert.ok(url.startsWith('https://wa.me/212612345678?text='))
  assert.ok(url.includes(encodeURIComponent('👋')))
  assert.ok(url.includes(encodeURIComponent('Bonne nouvelle')))
  assert.ok(url.includes(encodeURIComponent('https://chat.whatsapp.com/AbCdEfGhIjKlMnOp')))
  assert.ok(url.includes('%0A'))
  assert.equal(isWhatsAppGroupUrl('https://chat.whatsapp.com/AbCdEfGhIjKlMnOp'), true)
})

test('pending and rejected are not WhatsApp-eligible', () => {
  for (const status of ['pending', 'rejected', 'new', 'review']) {
    assert.equal(isWhatsAppEligible({ status }), false)
  }
  for (const status of ['approved', 'accepted', 'finalizing', 'payment_review', 'active']) {
    assert.equal(isWhatsAppEligible({ status }), true)
  }
})
