import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import test from 'node:test'
import mongoose from 'mongoose'
import { Registration } from '../models/Registration.js'
import { MembershipSettings } from '../models/MembershipSettings.js'
import { issueFinalizeLink, publicFinalizeStep, pushFinalizeEvent, revokeFinalizeLink } from '../services/finalize.js'
import { saveMembershipSettings, loadMembershipSettings } from '../services/membershipSettings.js'
import { saveReceipt, removeReceipt } from '../services/receipt.js'

const uri = process.env.MONGODB_URI
const maybe = uri ? test : test.skip

maybe('membership finalization flow persists through approve → link → info → terms → receipt → confirm', async () => {
  await mongoose.connect(uri)
  try {
    await MembershipSettings.deleteMany({ key: 'membership' })
    await saveMembershipSettings({
      terms: { fr: 'Respect des membres.\n\nPaiement obligatoire.', en: '', ar: '' },
      termsVersion: '2',
      paymentInstructions: { fr: 'Virement 100 DH', en: '', ar: '' },
      paymentAmount: 100,
      paymentCurrency: 'MAD',
      whatsappGroupUrl: 'https://chat.whatsapp.com/example',
      linkExpiryDays: 7,
      siteUrl: 'http://localhost:3000',
    })
    const settings = await loadMembershipSettings()

    const doc = await Registration.create({
      kind: 'membership',
      offer: 'membership',
      firstName: 'Amine',
      lastName: 'Test',
      city: 'Safi',
      email: 'amine@example.com',
      phone: '+212612345678',
      phoneCountry: 'MA',
      duration: 'join',
      status: 'approved',
      locale: 'fr',
    })

    assert.equal(doc.status, 'approved')
    const { token, url } = issueFinalizeLink(doc, settings, { get: () => null }, 'Admin')
    assert.match(url, /^http:\/\/localhost:3000\/finalize\//)
    assert.equal(doc.status, 'finalizing')
    await doc.save()

    doc.finalization.instagram = 'https://instagram.com/amine_test'
    doc.finalization.whatsapp = '+212612345678'
    doc.finalization.whatsappCountry = 'MA'
    doc.finalization.infoCompletedAt = new Date()
    pushFinalizeEvent(doc, 'info.completed')
    await doc.save()
    assert.equal(publicFinalizeStep(doc), 'terms')

    doc.finalization.termsVersion = '2'
    doc.finalization.termsAcceptedAt = new Date()
    pushFinalizeEvent(doc, 'terms.accepted', '', 'v=2')
    await doc.save()
    assert.equal(publicFinalizeStep(doc), 'payment')

    const pdf = Buffer.from('%PDF-1.4\n% finalize test\n')
    await saveReceipt(doc.id, { type: 'application/pdf', buffer: pdf, name: 'recu.pdf' })
    doc.finalization.receiptUploadedAt = new Date()
    doc.finalization.receiptName = 'recu.pdf'
    doc.finalization.receiptBytes = pdf.length
    doc.finalization.receiptType = 'application/pdf'
    doc.finalization.paymentStatus = 'pending'
    doc.history.push({ from: doc.status, status: 'payment_review', at: new Date() })
    doc.status = 'payment_review'
    await doc.save()
    assert.equal(publicFinalizeStep(doc), 'review')

    // Reject then re-upload path
    doc.finalization.paymentStatus = 'rejected'
    doc.finalization.paymentRejectReason = 'Reçu illisible'
    doc.finalization.receiptUploadedAt = null
    doc.history.push({ from: doc.status, status: 'finalizing', at: new Date() })
    doc.status = 'finalizing'
    await removeReceipt(doc.id)
    await doc.save()
    assert.equal(publicFinalizeStep(doc), 'payment')

    await saveReceipt(doc.id, { type: 'application/pdf', buffer: pdf, name: 'recu2.pdf' })
    doc.finalization.receiptUploadedAt = new Date()
    doc.finalization.paymentStatus = 'pending'
    doc.finalization.paymentRejectReason = ''
    doc.history.push({ from: doc.status, status: 'payment_review', at: new Date() })
    doc.status = 'payment_review'
    await doc.save()

    doc.finalization.paymentStatus = 'confirmed'
    doc.history.push({ from: doc.status, status: 'active', at: new Date() })
    doc.status = 'active'
    pushFinalizeEvent(doc, 'payment.confirmed', 'Admin')
    await doc.save()
    assert.equal(publicFinalizeStep(doc), 'complete')

    // Regenerate + revoke
    issueFinalizeLink(doc, settings, { get: () => null }, 'Admin')
    assert.ok(doc.finalization.tokenHash)
    assert.equal(createHash('sha256').update(token).digest('hex') === doc.finalization.tokenHash, false)
    revokeFinalizeLink(doc, 'Admin')
    assert.equal(doc.finalization.tokenHash, '')
    await doc.save()

    await removeReceipt(doc.id)
    await Registration.deleteOne({ _id: doc._id })
    assert.ok(randomBytes(4))
  } finally {
    await mongoose.disconnect()
  }
})
