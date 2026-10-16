const env = import.meta.env

/**
 * Public company details. Leave a value empty until it is confirmed —
 * empty fields are simply not rendered (nothing is invented).
 */
export const SITE = {
  name: 'US Bonds',
  url: env.VITE_SITE_URL || '',
  contact: {
    email: env.VITE_CONTACT_EMAIL || '',
    phone: env.VITE_CONTACT_PHONE || '',
    whatsapp: env.VITE_CONTACT_WHATSAPP || '',
    address: env.VITE_COMPANY_ADDRESS || '',
  },
  social: {
    instagram: env.VITE_SOCIAL_INSTAGRAM || '',
    tiktok: env.VITE_SOCIAL_TIKTOK || '',
    telegram: env.VITE_SOCIAL_TELEGRAM || '',
  },
}

/**
 * Every landing page section, in display order. `primary` items are shown directly in the desktop bar,
 * the others are grouped under "More"; the mobile menu lists them all.
 */
export const NAV_ITEMS = [
  { id: 'top', key: 'home', primary: true },
  { id: 'about', key: 'about', primary: true },
  { id: 'services', key: 'services', primary: true },
  { id: 'why', key: 'why' },
  { id: 'markets', key: 'markets', primary: true },
  { id: 'capital', key: 'investment', primary: true },
  { id: 'offers', key: 'offers', primary: true },
  { id: 'reviews', key: 'reviews' },
  { id: 'how', key: 'how' },
  { id: 'news', key: 'news', primary: true },
  { id: 'approach', key: 'approach' },
  { id: 'contact', key: 'contact' },
]

const httpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:' ? value : ''
  } catch {
    return ''
  }
}

/** Official accounts. A network without a configured https:// URL is shown as "coming soon", never linked. */
export const SOCIAL_LINKS = ['instagram', 'tiktok', 'telegram'].map((key) => ({ key, url: httpsUrl(SITE.social[key]) }))

/** Where "Commencer" leads until registration exists. */
export const START_TARGET = 'offers'

export const contactHref = (subject = '') => {
  const { email } = SITE.contact
  if (!email) return '#contact'
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`
}
