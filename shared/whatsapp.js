/** Statuses that may receive an approved-member WhatsApp message. */
export const WHATSAPP_ELIGIBLE = ['approved', 'accepted', 'finalizing', 'payment_review', 'active']

export const isWhatsAppEligible = (item) => WHATSAPP_ELIGIBLE.includes(item?.status)

/**
 * Digits-only international number for wa.me.
 * Handles Moroccan local numbers (0XXXXXXXXX → 212XXXXXXXXX) without duplicating 212.
 */
export const normalizeWhatsAppDigits = (raw) => {
  let digits = String(raw || '')
    .trim()
    .replace(/^\+/, '')
    .replace(/^00/, '')
    .replace(/\D/g, '')
  if (!digits) return ''
  if (/^0[67]\d{8}$/.test(digits)) digits = `212${digits.slice(1)}`
  if (/^2120[67]\d{8}$/.test(digits)) digits = `212${digits.slice(4)}`
  return digits
}

export const isValidWhatsAppPhone = (raw) => {
  const digits = normalizeWhatsAppDigits(raw)
  return digits.length >= 8 && digits.length <= 15
}

/** Official WhatsApp group invite links only (https://chat.whatsapp.com/…). */
export const isWhatsAppGroupUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return false
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.replace(/^www\./i, '').toLowerCase()
    if (host !== 'chat.whatsapp.com') return false
    const code = url.pathname.replace(/^\/+|\/+$/g, '')
    return code.length >= 8 && /^[A-Za-z0-9_-]+$/.test(code)
  } catch {
    return false
  }
}

export const whatsappClickUrl = (phone, message) => {
  const digits = normalizeWhatsAppDigits(phone)
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(message)}`
}
