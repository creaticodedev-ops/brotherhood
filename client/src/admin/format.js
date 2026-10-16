import { numberLocale } from '../market/format'

const cache = new Map()
const memo = (key, create) => {
  if (!cache.has(key)) cache.set(key, create())
  return cache.get(key)
}

/** Wrapped in a first-strong isolate so amounts keep their order inside Arabic sentences. */
export const formatMoney = (value, locale, currency = 'USD', compact = false) => {
  if (!Number.isFinite(value)) return '—'
  const options = compact
    ? { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }
    : { style: 'currency', currency, maximumFractionDigits: value % 1 ? 2 : 0 }
  const text = memo(`m|${locale}|${currency}|${compact}|${options.maximumFractionDigits}`, () => new Intl.NumberFormat(numberLocale(locale), options)).format(value)
  return `\u2068${text.replace(/[\u200e\u200f\u061c]/g, '')}\u2069`
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

/** Local calendar key (YYYY-MM-DD) — matches the server's per-time-zone grouping. */
export const dayKey = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const initials = (first = '', last = '') => `${first.trim()[0] || ''}${last.trim()[0] || ''}`.toUpperCase() || '·'

export const fullName = (item) => `${item.firstName} ${item.lastName}`.trim()
