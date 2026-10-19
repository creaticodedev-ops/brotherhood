import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { resolveSiteUrl } from './membershipSettings.js'

export const FINALIZE_STAGES = ['welcome', 'info', 'terms', 'payment', 'review', 'rejected', 'complete']

export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex')

export const createFinalizeToken = () => {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token), hint: token.slice(-4) }
}

export const tokensMatch = (token, hash) => {
  if (!token || !hash) return false
  const left = Buffer.from(hashToken(token), 'utf8')
  const right = Buffer.from(String(hash), 'utf8')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export const finalizeLinkUrl = (baseUrl, token) => `${String(baseUrl).replace(/\/+$/, '')}/finalize/${token}`

export const pushFinalizeEvent = (doc, type, actor = '', detail = '') => {
  if (!doc.finalization) doc.finalization = {}
  if (!Array.isArray(doc.finalization.events)) doc.finalization.events = []
  doc.finalization.events.push({
    type: String(type).slice(0, 60),
    at: new Date(),
    actor: String(actor || '').slice(0, 80),
    detail: String(detail || '').slice(0, 400),
  })
  if (doc.finalization.events.length > 80) doc.finalization.events = doc.finalization.events.slice(-80)
}

export const issueFinalizeLink = (doc, settings, req, actor = '') => {
  const { token, hash, hint } = createFinalizeToken()
  const days = settings.linkExpiryDays ?? 14
  const expiresAt = new Date(Date.now() + days * 86_400_000)
  const baseUrl = resolveSiteUrl(settings, req)
  const url = finalizeLinkUrl(baseUrl, token)
  if (!doc.finalization) doc.finalization = {}
  doc.finalization.tokenHash = hash
  doc.finalization.tokenHint = hint
  doc.finalization.expiresAt = expiresAt
  doc.finalization.revokedAt = null
  doc.finalization.generatedAt = new Date()
  doc.finalization.generatedBy = String(actor || '').slice(0, 80)
  doc.finalization.linkUrl = url
  if (doc.status === 'approved') {
    doc.history.push({ from: doc.status, status: 'finalizing', at: new Date() })
    doc.status = 'finalizing'
  }
  pushFinalizeEvent(doc, 'link.generated', actor, `expire=${expiresAt.toISOString()}`)
  return { token, url, expiresAt }
}

export const revokeFinalizeLink = (doc, actor = '') => {
  if (!doc.finalization?.tokenHash) return false
  doc.finalization.revokedAt = new Date()
  doc.finalization.tokenHash = ''
  doc.finalization.linkUrl = ''
  pushFinalizeEvent(doc, 'link.revoked', actor)
  return true
}

export const finalizeAccessState = (doc) => {
  const fin = doc.finalization || {}
  if (!fin.tokenHash) return 'missing'
  if (fin.revokedAt) return 'revoked'
  if (fin.expiresAt && new Date(fin.expiresAt).getTime() < Date.now()) return 'expired'
  if (!['approved', 'finalizing', 'payment_review', 'active'].includes(doc.status)) return 'unavailable'
  return 'ok'
}

/** High-level pipeline label for admin filters and drawers. */
export const finalizePipeline = (doc) => {
  const fin = doc.finalization || {}
  if (doc.status === 'active' || doc.status === 'completed' || fin.paymentStatus === 'confirmed') return 'activated'
  if (doc.status === 'payment_review' || fin.paymentStatus === 'pending') return 'payment_pending'
  if (fin.paymentStatus === 'rejected') return 'payment_rejected'
  if (fin.termsAcceptedAt && !fin.receiptUploadedAt) return 'terms_accepted'
  if (fin.infoCompletedAt && !fin.termsAcceptedAt) return 'info_complete'
  if (fin.tokenHash && !fin.revokedAt) return 'link_generated'
  if (doc.status === 'approved' || doc.status === 'finalizing') return 'approved'
  if (doc.status === 'rejected') return 'rejected'
  if (['new', 'pending', 'review'].includes(doc.status)) return 'received'
  return doc.status
}

export const publicFinalizeStep = (doc) => {
  const fin = doc.finalization || {}
  if (doc.status === 'active' || fin.paymentStatus === 'confirmed') return 'complete'
  if (doc.status === 'payment_review' || fin.paymentStatus === 'pending') return 'review'
  if (fin.paymentStatus === 'rejected') return 'payment'
  if (fin.termsAcceptedAt) return 'payment'
  if (fin.infoCompletedAt) return 'terms'
  return 'info'
}

export const toFinalizePublic = (doc, settings, locale) => {
  const fin = doc.finalization || {}
  const step = publicFinalizeStep(doc)
  const paymentConfirmed = doc.status === 'active' || fin.paymentStatus === 'confirmed'
  return {
    step,
    pipeline: finalizePipeline(doc),
    firstName: doc.firstName,
    lastName: doc.lastName,
    city: doc.city,
    email: doc.email || '',
    phone: doc.phone || '',
    locale: doc.locale || 'fr',
    status: doc.status,
    approvedAt: doc.reviewedAt || fin.generatedAt || doc.updatedAt,
    hasPhoto: Boolean(doc.photo),
    profile: {
      instagram: fin.instagram || '',
      whatsapp: fin.whatsapp || doc.phone || '',
      whatsappCountry: fin.whatsappCountry || doc.phoneCountry || '',
      infoCompletedAt: fin.infoCompletedAt || null,
    },
    terms: {
      version: settings.termsVersion,
      text: settings.terms,
      acceptedAt: fin.termsAcceptedAt || null,
      acceptedVersion: fin.termsVersion || '',
      ready: settings.termsReady,
    },
    payment: {
      amount: settings.paymentAmount,
      currency: settings.paymentCurrency,
      instructions: settings.paymentInstructions,
      ready: settings.paymentReady,
      status: fin.paymentStatus || 'none',
      receiptUploadedAt: fin.receiptUploadedAt || null,
      rejectReason: fin.paymentStatus === 'rejected' ? fin.paymentRejectReason || '' : '',
    },
    group: {
      url: paymentConfirmed ? settings.whatsappGroupUrl || '' : '',
      available: paymentConfirmed && Boolean(settings.whatsappGroupUrl),
    },
    expiresAt: fin.expiresAt || null,
  }
}

export const toFinalizeAdmin = (doc) => {
  const fin = doc.finalization || {}
  return {
    pipeline: finalizePipeline(doc),
    hasLink: Boolean(fin.tokenHash && !fin.revokedAt),
    tokenHint: fin.tokenHint || '',
    expiresAt: fin.expiresAt || null,
    revokedAt: fin.revokedAt || null,
    generatedAt: fin.generatedAt || null,
    generatedBy: fin.generatedBy || '',
    linkUrl: fin.linkUrl || '',
    sentAt: fin.sentAt || null,
    instagram: fin.instagram || '',
    whatsapp: fin.whatsapp || '',
    whatsappCountry: fin.whatsappCountry || '',
    infoCompletedAt: fin.infoCompletedAt || null,
    termsVersion: fin.termsVersion || '',
    termsAcceptedAt: fin.termsAcceptedAt || null,
    receiptUploadedAt: fin.receiptUploadedAt || null,
    receiptName: fin.receiptName || '',
    receiptBytes: fin.receiptBytes || 0,
    receiptType: fin.receiptType || '',
    hasReceipt: Boolean(fin.receiptUploadedAt),
    paymentStatus: fin.paymentStatus || 'none',
    paymentAmount: fin.paymentAmount ?? 100,
    paymentCurrency: fin.paymentCurrency || 'MAD',
    paymentReviewedAt: fin.paymentReviewedAt || null,
    paymentReviewedBy: fin.paymentReviewedBy || '',
    paymentRejectReason: fin.paymentRejectReason || '',
    events: (fin.events || []).map((entry) => ({
      type: entry.type,
      at: entry.at,
      actor: entry.actor || '',
      detail: entry.detail || '',
    })),
  }
}

export const INSTAGRAM_URL =
  /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/[A-Za-z0-9._]{1,30}\/?(\?.*)?$/i

export const normalizeInstagram = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return null
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(withProtocol)
    if (!INSTAGRAM_URL.test(url.href)) return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}
