import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ar } from './dictionaries/ar'
import { en } from './dictionaries/en'
import { fr } from './dictionaries/fr'
import { DEFAULT_LOCALE, getLocaleMeta, getNested, interpolate, readInitialLocale, storeLocale } from './locales'

const dictionaries = { fr, en, ar }
const I18nContext = createContext(null)

const setMeta = (selector, attr, value) => {
  const el = document.head.querySelector(selector)
  if (el) el.setAttribute(attr, value)
}

/** `titleKey={null}` leaves the document title and meta tags to the page (used by the admin area). */
export const I18nProvider = ({ children, titleKey = 'meta.title' }) => {
  const [locale, setLocaleState] = useState(readInitialLocale)
  const meta = getLocaleMeta(locale)

  const setLocale = useCallback((code) => {
    if (!dictionaries[code]) return
    setLocaleState(code)
    storeLocale(code)
  }, [])

  const value = useMemo(() => {
    const dict = dictionaries[locale] || dictionaries[DEFAULT_LOCALE]
    const lookup = (key) => {
      const local = getNested(dict, key)
      return local !== undefined ? local : getNested(dictionaries[DEFAULT_LOCALE], key)
    }
    const t = (key, vars) => {
      const found = lookup(key)
      if (typeof found !== 'string') return key
      return vars ? interpolate(found, vars) : found
    }
    /** Structured content (arrays / objects) */
    const tm = (key) => lookup(key) ?? null
    return { locale, dir: meta.dir, isRtl: meta.dir === 'rtl', setLocale, t, tm }
  }, [locale, meta.dir, setLocale])

  useEffect(() => {
    const html = document.documentElement
    html.lang = meta.htmlLang
    html.dir = meta.dir
    if (!titleKey) return
    document.title = value.t(titleKey)
    setMeta('meta[name="description"]', 'content', value.t('meta.description'))
    setMeta('meta[property="og:title"]', 'content', value.t('meta.title'))
    setMeta('meta[property="og:description"]', 'content', value.t('meta.description'))
    setMeta('meta[property="og:locale"]', 'content', meta.ogLocale)
  }, [meta.dir, meta.htmlLang, meta.ogLocale, titleKey, value])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = () => {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
