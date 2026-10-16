export const LOCALES = [
  { code: 'fr', dir: 'ltr', htmlLang: 'fr', ogLocale: 'fr_FR', native: 'Français', short: 'FR' },
  { code: 'en', dir: 'ltr', htmlLang: 'en', ogLocale: 'en_GB', native: 'English', short: 'EN' },
  { code: 'ar', dir: 'rtl', htmlLang: 'ar', ogLocale: 'ar_MA', native: 'العربية', short: 'AR' },
]

export const DEFAULT_LOCALE = 'fr'
const STORAGE_KEY = 'udbonds-lang'
const CODES = LOCALES.map((item) => item.code)

export const getLocaleMeta = (code) => LOCALES.find((item) => item.code === code) || LOCALES[0]

export const readInitialLocale = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (CODES.includes(stored)) return stored
  } catch {
    /* storage unavailable */
  }
  const nav = typeof navigator !== 'undefined' ? (navigator.language || '').toLowerCase() : ''
  if (nav.startsWith('ar')) return 'ar'
  if (nav.startsWith('en')) return 'en'
  return DEFAULT_LOCALE
}

export const storeLocale = (code) => {
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    /* storage unavailable */
  }
}

export const getNested = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc != null && acc[key] !== undefined ? acc[key] : undefined), obj)

export const interpolate = (value, vars) =>
  Object.keys(vars).reduce((str, key) => str.replaceAll(`{{${key}}}`, String(vars[key])), value)
