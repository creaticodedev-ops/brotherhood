import { numberLocale } from '../market/format'

const cache = new Map()
const memo = (key, create) => {
  if (!cache.has(key)) cache.set(key, create())
  return cache.get(key)
}

/** Wrapped in a first-strong isolate so amounts keep their order inside Arabic sentences. */
export const formatMoney = (value, locale, currency = 'USD', compact = false) => {
  if (!Number.isFinite(value)) return '—'
  if (!/^[A-Z]{3}$/.test(currency || '')) {
    const plain = memo(`n|${locale}|${compact}`, () => new Intl.NumberFormat(numberLocale(locale), compact ? { notation: 'compact', maximumFractionDigits: 1 } : { maximumFractionDigits: 2 })).format(value)
    return `\u2068${plain}\u2069`
  }
  const options = compact
    ? { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }
    : { style: 'currency', currency, maximumFractionDigits: value % 1 ? 2 : 0 }
  const text = memo(`m|${locale}|${currency}|${compact}|${options.maximumFractionDigits}`, () => new Intl.NumberFormat(numberLocale(locale), options)).format(value)
  return `\u2068${text.replace(/[\u200e\u200f\u061c]/g, '')}\u2069`
}

/**
 * Reads an amount typed the way people write it: "1 500,50", "1.500,50", "1,500.50", "١٥٠٠٫٥", "300 MAD".
 * With both separators the last one is the decimal mark; a lone comma is decimal. Empty or invalid gives NaN.
 */
export const parseAmount = (value) => {
  let text = String(value ?? '')
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/\u066b/g, ',')
    .replace(/[\s\u00a0\u202f'’\u066c]/g, '')
    .replace(/(mad|dhs?|د\.?م\.?)$/i, '')
  const comma = text.lastIndexOf(',')
  const dot = text.lastIndexOf('.')
  if (comma > -1 && dot > -1) text = comma > dot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '')
  else if (comma > -1) text = text.replace(',', '.')
  else if (text.split('.').length > 2) text = text.replace(/\./g, '')
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN
}

export const formatCount = (value, locale) =>
  memo(`c|${locale}`, () => new Intl.NumberFormat(numberLocale(locale))).format(Number.isFinite(value) ? value : 0)

export const formatShare = (value, locale) =>
  memo(`p|${locale}`, () => new Intl.NumberFormat(numberLocale(locale), { style: 'percent', maximumFractionDigits: 0 })).format(value || 0)

export const formatDateTime = (value, locale) =>
  memo(
    `dt|${locale}`,
    () => new Intl.DateTimeFormat(numberLocale(locale), { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }),
  ).format(new Date(value))

export const formatDate = (value, locale) =>
  memo(`d|${locale}`, () => new Intl.DateTimeFormat(numberLocale(locale), { day: '2-digit', month: 'short', year: 'numeric' })).format(new Date(value))

export const formatMonth = (value, locale) => memo(`mo|${locale}`, () => new Intl.DateTimeFormat(numberLocale(locale), { month: 'short' })).format(new Date(value))

export const formatClock = (value, locale) =>
  memo(`t|${locale}`, () => new Intl.DateTimeFormat(numberLocale(locale), { hour: '2-digit', minute: '2-digit', hour12: false })).format(new Date(value))

export const formatDayLabel = (value, locale) =>
  memo(`dl|${locale}`, () => new Intl.DateTimeFormat(numberLocale(locale), { day: 'numeric', month: 'short' })).format(value)

export const relativeTime = (value, now, locale, justNow) => {
  const minutes = Math.floor((now - new Date(value).getTime()) / 60_000)
  if (minutes < 1) return justNow
  const rtf = memo(`r|${locale}`, () => new Intl.RelativeTimeFormat(numberLocale(locale), { numeric: 'auto', style: 'short' }))
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  const days = Math.floor(hours / 24)
  return days < 30 ? rtf.format(-days, 'day') : formatDate(value, locale)
}

/** Calendar distance in days, past or future ("in 3 days", "yesterday", "today"). */
export const relativeDay = (value, now, locale) => {
  const start = (time) => {
    const date = new Date(time)
    date.setHours(0, 0, 0, 0)
    return date.getTime()
  }
  const days = Math.round((start(value) - start(now)) / 86_400_000)
  if (Math.abs(days) > 60) return formatDate(value, locale)
  return memo(`rd|${locale}`, () => new Intl.RelativeTimeFormat(numberLocale(locale), { numeric: 'auto' })).format(days, 'day')
}

/** Local calendar key (YYYY-MM-DD) — matches the server's per-time-zone grouping. */
export const dayKey = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const initials = (first = '', last = '') => `${first.trim()[0] || ''}${last.trim()[0] || ''}`.toUpperCase() || '·'

export const fullName = (item) => `${item.firstName} ${item.lastName}`.trim()
