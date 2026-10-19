import { Router } from 'express'
import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import { dbState } from '../configs/db.js'
import { Registration } from '../models/Registration.js'
import {
  finalizeAccessState,
  hashToken,
  normalizeInstagram,
  pushFinalizeEvent,
  toFinalizePublic,
} from '../services/finalize.js'
import { loadMembershipSettings, toPublicMembershipSettings } from '../services/membershipSettings.js'
import { readStoredPortrait, rememberLocalPortrait } from '../services/portrait.js'
import { RECEIPT_LIMIT, receiptSignatureOk, saveReceipt } from '../services/receipt.js'

export const finalizeRouter = Router()

const hits = new Map()
const rateLimited = (ip, limit = 60, windowMs = 60_000) => {
  const key = String(ip || 'unknown')
  const now = Date.now()
  const bucket = hits.get(key) || []
  const fresh = bucket.filter((at) => now - at < windowMs)
  fresh.push(now)
  hits.set(key, fresh)
  return fresh.length > limit
}

const TOKEN = /^[A-Za-z0-9_-]{20,80}$/

const findByToken = async (token) => {
  if (!TOKEN.test(token || '')) return null
  return Registration.findOne({ 'finalization.tokenHash': hashToken(token) })
}

const parsePhone = (value, country) => {
  const input = String(value || '').trim()
  if (!input) return null
  const defaultCountry = typeof country === 'string' && /^[A-Z]{2}$/i.test(country) ? country.toUpperCase() : undefined
  const parsed = parsePhoneNumberFromString(input, defaultCountry)
  if (!parsed?.isValid()) return null
  return { e164: parsed.format('E.164'), country: parsed.country || defaultCountry || '' }
}

const guard = async (req, res) => {
  if (dbState() !== 'connected') {
    res.status(503).json({ error: 'Database unavailable' })
    return null
  }
  if (rateLimited(req.ip)) {
    res.status(429).json({ error: 'Too many requests' })
    return null
  }
  const doc = await findByToken(req.params.token)
  if (!doc) {
    res.status(404).json({ error: 'Link not found' })
    return null
  }
  const access = finalizeAccessState(doc)
  if (access !== 'ok') {
    res.status(410).json({ error: access })
    return null
  }
  return doc
}

const present = async (doc, locale) => {
  const settingsDoc = await loadMembershipSettings()
  const lang = ['fr', 'en', 'ar'].includes(locale) ? locale : doc.locale || 'fr'
  const settings = toPublicMembershipSettings(settingsDoc, lang)
  return toFinalizePublic(doc, settings, lang)
}

finalizeRouter.get('/:token', async (req, res, next) => {
  try {
    const doc = await guard(req, res)
    if (!doc) return
    const locale = String(req.query.locale || doc.locale || 'fr')
    res.set('Cache-Control', 'no-store').json({ item: await present(doc, locale) })
  } catch (error) {
    next(error)
  }
})

finalizeRouter.get('/:token/photo', async (req, res, next) => {
  try {
    const doc = await guard(req, res)
    if (!doc) return
    const stored = (await readStoredPortrait(doc.id)) || (await rememberLocalPortrait(doc.id, doc.photo))
    if (!stored) return res.status(404).json({ error: 'Photo not found' })
    res.set({
      'Content-Type': stored.contentType,
      'Content-Length': String(stored.data.length),
      'Cache-Control': 'private, no-store',
    })
    res.send(stored.data)
  } catch (error) {
    next(error)
  }
})

finalizeRouter.patch('/:token/info', async (req, res, next) => {
  try {
    const doc = await guard(req, res)
    if (!doc) return
    if (['payment_review', 'active'].includes(doc.status) && doc.finalization?.paymentStatus === 'pending') {
      return res.status(409).json({ error: 'locked' })
    }
    if (doc.status === 'active') return res.status(409).json({ error: 'locked' })

    const instagram = normalizeInstagram(req.body?.instagram)
    const phone = parsePhone(req.body?.whatsapp || req.body?.phone, req.body?.whatsappCountry || req.body?.phoneCountry)
    const fields = {}
    if (!instagram) fields.instagram = 'invalid'
    if (!phone) fields.whatsapp = 'invalid'
    if (Object.keys(fields).length) return res.status(422).json({ error: 'Invalid info', fields })

    if (!doc.finalization) doc.finalization = {}
    doc.finalization.instagram = instagram
    doc.finalization.whatsapp = phone.e164
    doc.finalization.whatsappCountry = phone.country
    doc.finalization.infoCompletedAt = new Date()
    pushFinalizeEvent(doc, 'info.completed')
    await doc.save()
    res.json({ item: await present(doc, req.body?.locale || doc.locale) })
  } catch (error) {
    next(error)
  }
})

finalizeRouter.post('/:token/terms', async (req, res, next) => {
  try {
    const doc = await guard(req, res)
    if (!doc) return
    if (doc.status === 'active') return res.status(409).json({ error: 'locked' })
    if (!doc.finalization?.infoCompletedAt) return res.status(409).json({ error: 'info_required' })

    const settingsDoc = await loadMembershipSettings()
    const locale = String(req.body?.locale || doc.locale || 'fr')
    const settings = toPublicMembershipSettings(settingsDoc, locale)
    if (!settings.termsReady) return res.status(503).json({ error: 'terms_unavailable' })
    if (!req.body?.accepted) return res.status(422).json({ error: 'acceptance_required', fields: { accepted: 'required' } })

    const version = String(req.body?.version || settings.termsVersion)
    if (version !== settings.termsVersion) return res.status(409).json({ error: 'terms_outdated' })

    doc.finalization.termsVersion = settings.termsVersion
    doc.finalization.termsAcceptedAt = new Date()
    pushFinalizeEvent(doc, 'terms.accepted', '', `v=${settings.termsVersion}`)
    await doc.save()
    res.json({ item: await present(doc, locale) })
  } catch (error) {
    next(error)
  }
})

finalizeRouter.post('/:token/receipt', async (req, res, next) => {
  try {
    const doc = await guard(req, res)
    if (!doc) return
    if (doc.status === 'active') return res.status(409).json({ error: 'locked' })
    if (!doc.finalization?.infoCompletedAt) return res.status(409).json({ error: 'info_required' })
    if (!doc.finalization?.termsAcceptedAt) return res.status(409).json({ error: 'terms_required' })

    const settingsDoc = await loadMembershipSettings()
    const locale = String(req.query.locale || req.body?.locale || doc.locale || 'fr')
    const settings = toPublicMembershipSettings(settingsDoc, locale)
    if (!settings.paymentReady) return res.status(503).json({ error: 'payment_unavailable' })

    const type = String(req.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase()
    const name = String(req.get('x-file-name') || 'receipt').slice(0, 180)
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > RECEIPT_LIMIT) return res.status(413).json({ error: 'too_large' })
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)
    if (!receiptSignatureOk(type, buffer)) return res.status(422).json({ error: 'Invalid receipt' })

    const saved = await saveReceipt(doc.id, { type, buffer, name })
    doc.finalization.receiptUploadedAt = new Date()
    doc.finalization.receiptName = saved.originalName
    doc.finalization.receiptBytes = saved.bytes
    doc.finalization.receiptType = saved.contentType
    doc.finalization.paymentStatus = 'pending'
    doc.finalization.paymentAmount = settings.paymentAmount
    doc.finalization.paymentCurrency = settings.paymentCurrency
    doc.finalization.paymentRejectReason = ''
    if (doc.status !== 'payment_review') {
      doc.history.push({ from: doc.status, status: 'payment_review', at: new Date() })
      doc.status = 'payment_review'
    }
    pushFinalizeEvent(doc, 'receipt.uploaded', '', saved.contentType)
    await doc.save()
    res.status(201).json({ item: await present(doc, locale) })
  } catch (error) {
    next(error)
  }
})
