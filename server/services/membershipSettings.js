import { MembershipSettings } from '../models/MembershipSettings.js'

const LOCALES = ['fr', 'en', 'ar']
const EMPTY_LOCALE = { fr: '', en: '', ar: '' }

const cleanText = (value, max = 12_000) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

const cleanLocaleMap = (value) => {
  const source = value && typeof value === 'object' ? value : {}
  return Object.fromEntries(LOCALES.map((locale) => [locale, cleanText(source[locale])]))
}

const cleanUrl = (value) => {
  const raw = cleanText(value, 500)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString()
  } catch {
    return null
  }
}

export const defaultMembershipSettings = () => ({
  terms: { ...EMPTY_LOCALE },
  termsVersion: '1',
  paymentInstructions: { ...EMPTY_LOCALE },
  paymentAmount: 100,
  paymentCurrency: 'MAD',
  whatsappGroupUrl: '',
  linkExpiryDays: 14,
  siteUrl: '',
})

export const loadMembershipSettings = async () => {
  let doc = await MembershipSettings.findOne({ key: 'membership' })
  if (!doc) doc = await MembershipSettings.create({ key: 'membership', ...defaultMembershipSettings() })
  return doc
}

export const toPublicMembershipSettings = (doc, locale = 'fr') => {
  const lang = LOCALES.includes(locale) ? locale : 'fr'
  const terms = doc.terms?.[lang] || doc.terms?.fr || ''
  const paymentInstructions = doc.paymentInstructions?.[lang] || doc.paymentInstructions?.fr || ''
  return {
    terms,
    termsVersion: doc.termsVersion || '1',
    paymentInstructions,
    paymentAmount: doc.paymentAmount ?? 100,
    paymentCurrency: doc.paymentCurrency || 'MAD',
    whatsappGroupUrl: doc.whatsappGroupUrl || '',
    linkExpiryDays: doc.linkExpiryDays ?? 14,
    termsReady: Boolean(terms.trim()),
    paymentReady: Boolean(paymentInstructions.trim()),
  }
}

export const toAdminMembershipSettings = (doc) => ({
  terms: { ...EMPTY_LOCALE, ...(doc.terms?.toObject?.() || doc.terms || {}) },
  termsVersion: doc.termsVersion || '1',
  paymentInstructions: { ...EMPTY_LOCALE, ...(doc.paymentInstructions?.toObject?.() || doc.paymentInstructions || {}) },
  paymentAmount: doc.paymentAmount ?? 100,
  paymentCurrency: doc.paymentCurrency || 'MAD',
  whatsappGroupUrl: doc.whatsappGroupUrl || '',
  linkExpiryDays: doc.linkExpiryDays ?? 14,
  siteUrl: doc.siteUrl || '',
  updatedAt: doc.updatedAt,
})

export const readMembershipSettingsInput = (body = {}) => {
  const errors = {}
  const data = {}

  if (body.terms !== undefined) data.terms = cleanLocaleMap(body.terms)
  if (body.paymentInstructions !== undefined) data.paymentInstructions = cleanLocaleMap(body.paymentInstructions)

  if (body.termsVersion !== undefined) {
    const version = cleanText(body.termsVersion, 40)
    if (!version) errors.termsVersion = 'required'
    else data.termsVersion = version
  }

  if (body.paymentAmount !== undefined) {
    const amount = Number(body.paymentAmount)
    if (!Number.isFinite(amount) || amount < 1 || amount > 100_000) errors.paymentAmount = 'invalid'
    else data.paymentAmount = Math.round(amount * 100) / 100
  }

  if (body.paymentCurrency !== undefined) {
    const currency = cleanText(body.paymentCurrency, 8).toUpperCase()
    if (!currency) errors.paymentCurrency = 'required'
    else data.paymentCurrency = currency
  }

  if (body.whatsappGroupUrl !== undefined) {
    const url = cleanUrl(body.whatsappGroupUrl)
    if (body.whatsappGroupUrl && url === null) errors.whatsappGroupUrl = 'url'
    else data.whatsappGroupUrl = url || ''
  }

  if (body.linkExpiryDays !== undefined) {
    const days = Number(body.linkExpiryDays)
    if (!Number.isInteger(days) || days < 1 || days > 90) errors.linkExpiryDays = 'invalid'
    else data.linkExpiryDays = days
  }

  if (body.siteUrl !== undefined) {
    const url = cleanUrl(body.siteUrl)
    if (body.siteUrl && url === null) errors.siteUrl = 'url'
    else data.siteUrl = url || ''
  }

  return { errors, data }
}

export const saveMembershipSettings = async (patch) => {
  const doc = await loadMembershipSettings()
  Object.assign(doc, patch)
  if (patch.terms) doc.markModified('terms')
  if (patch.paymentInstructions) doc.markModified('paymentInstructions')
  await doc.save()
  return doc
}

export const resolveSiteUrl = (settings, req) => {
  const configured = cleanUrl(settings?.siteUrl || process.env.ADMIN_APP_URL || process.env.PUBLIC_SITE_URL || '')
  if (configured) return configured.replace(/\/+$/, '')
  const origin = cleanUrl(req?.get?.('origin') || '')
  if (origin) return origin.replace(/\/+$/, '')
  return 'http://localhost:3000'
}
