import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createFinalizeToken,
  finalizePipeline,
  hashToken,
  normalizeInstagram,
  publicFinalizeStep,
  tokensMatch,
} from '../services/finalize.js'

test('finalize tokens are opaque and verifiable', () => {
  const { token, hash, hint } = createFinalizeToken()
  assert.equal(token.includes('+'), false)
  assert.equal(hash, hashToken(token))
  assert.equal(tokensMatch(token, hash), true)
  assert.equal(tokensMatch(`${token}x`, hash), false)
  assert.equal(hint, token.slice(-4))
})

test('instagram urls are normalized', () => {
  assert.equal(normalizeInstagram('instagram.com/the_brotherhood07'), 'https://instagram.com/the_brotherhood07')
  assert.equal(normalizeInstagram('https://www.instagram.com/user.name/'), 'https://www.instagram.com/user.name/')
  assert.equal(normalizeInstagram('https://example.com/nope'), null)
  assert.equal(normalizeInstagram(''), null)
})

test('pipeline and public step follow the membership workflow', () => {
  const approved = { status: 'approved', finalization: {} }
  assert.equal(finalizePipeline(approved), 'approved')
  assert.equal(publicFinalizeStep(approved), 'info')

  const linked = { status: 'finalizing', finalization: { tokenHash: 'abc' } }
  assert.equal(finalizePipeline(linked), 'link_generated')

  const info = { status: 'finalizing', finalization: { tokenHash: 'abc', infoCompletedAt: new Date() } }
  assert.equal(finalizePipeline(info), 'info_complete')
  assert.equal(publicFinalizeStep(info), 'terms')

  const terms = {
    status: 'finalizing',
    finalization: { tokenHash: 'abc', infoCompletedAt: new Date(), termsAcceptedAt: new Date() },
  }
  assert.equal(finalizePipeline(terms), 'terms_accepted')
  assert.equal(publicFinalizeStep(terms), 'payment')

  const pending = {
    status: 'payment_review',
    finalization: { paymentStatus: 'pending', receiptUploadedAt: new Date(), termsAcceptedAt: new Date(), infoCompletedAt: new Date() },
  }
  assert.equal(finalizePipeline(pending), 'payment_pending')
  assert.equal(publicFinalizeStep(pending), 'review')

  const rejected = {
    status: 'finalizing',
    finalization: { paymentStatus: 'rejected', termsAcceptedAt: new Date(), infoCompletedAt: new Date() },
  }
  assert.equal(finalizePipeline(rejected), 'payment_rejected')
  assert.equal(publicFinalizeStep(rejected), 'payment')

  const active = { status: 'active', finalization: { paymentStatus: 'confirmed' } }
  assert.equal(finalizePipeline(active), 'activated')
  assert.equal(publicFinalizeStep(active), 'complete')
})
