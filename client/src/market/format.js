import { getLocaleMeta } from '../i18n/locales'

/** Market figures always use Latin digits, whatever the interface language. */
export const numberLocale = (locale) => `${getLocaleMeta(locale).htmlLang}-u-nu-latn`

const cache = new Map()
const formatter = (locale, options) => {
  const key = `${locale}|${JSON.stringify(options)}`
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(numberLocale(locale), options))
  return cache.get(key)
}

export const formatPrice = (value, locale, digits = 2) =>
  Number.isFinite(value) ? formatter(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value) : '—'

export const formatSigned = (value, locale, digits = 2) =>
  Number.isFinite(value)
    ? formatter(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: 'exceptZero' }).format(value)
    : '—'

export const formatPercent = (value, locale, digits = 2) =>
  Number.isFinite(value)
    ? `${formatter(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: 'exceptZero' }).format(value)} %`
    : '—'

export const formatAmount = (value, locale) =>
  Number.isFinite(value) ? formatter(locale, { maximumFractionDigits: 2 }).format(value) : ''

export const formatTime = (ms, locale, withSeconds = true) =>
  new Intl.DateTimeFormat(numberLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  }).format(ms)

export const trendOf = (value) => (!Number.isFinite(value) || value === 0 ? 'flat' : value > 0 ? 'up' : 'down')
