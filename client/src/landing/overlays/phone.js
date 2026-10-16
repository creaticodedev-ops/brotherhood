// Lighter metadata in the browser; the API re-validates every number with the full set.
import { getCountries, getCountryCallingCode, getExampleNumber, parsePhoneNumberFromString } from 'libphonenumber-js/min'
import examples from 'libphonenumber-js/mobile/examples'

export const DEFAULT_COUNTRY = 'MA'
export const PREFERRED_COUNTRIES = ['MA', 'FR', 'US', 'GB']

export const dialCode = (country) => `+${getCountryCallingCode(country)}`

const compact = (raw) => {
  const value = String(raw).trim().replace(/[\s().\-\u00a0\u202f]/g, '')
  return value.startsWith('00') ? `+${value.slice(2)}` : value
}

/** True when the visitor typed (or pasted) a number with its own "+…" / "00…" prefix. */
export const isInternational = (raw) => compact(raw).startsWith('+')

/** Parsed number when it is valid for the numbering plan of `country` (or of its own prefix), else null. */
export const parsePhone = (raw, country) => {
  const input = compact(raw)
  if (!input) return null
  const parsed = parsePhoneNumberFromString(input, country)
  return parsed?.isValid() ? parsed : null
}

export const examplePhone = (country) => getExampleNumber(country, examples)?.formatNational() || ''

const fold = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

const regionNames = (locale) => {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' })
  } catch {
    return null
  }
}

const lists = new Map()

/** Every supported country with its localized name, sorted for `locale`. English names stay searchable. */
export const countryList = (locale) => {
  if (!lists.has(locale)) {
    const local = regionNames(locale)
    const english = regionNames('en')
    const list = getCountries()
      .map((code) => {
        const name = local?.of(code) || code
        const dial = dialCode(code)
        return { code, name, dial, search: fold(`${name} ${english?.of(code) || ''} ${code}`) }
      })
      .sort((a, b) => a.name.localeCompare(b.name, locale))
    lists.set(locale, list)
  }
  return lists.get(locale)
}

/** "33" / "+33" matches dialing codes from their first digit; anything else matches the names. */
export const matchesCountry = (country, query) => {
  const digits = query.trim().replace(/^(\+|00)/, '')
  if (/^\d*$/.test(digits)) return country.dial.slice(1).startsWith(digits)
  const terms = fold(query.trim()).split(/\s+/).filter(Boolean)
  return terms.every((term) => country.search.includes(term))
}
