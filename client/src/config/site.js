const env = import.meta.env

/**
 * Public company details. Leave a value empty until it is confirmed —
 * empty fields are simply not rendered (nothing is invented).
 */
const cleanUrl = (value) => {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return ''
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return ''
  }
}

export const PUBLIC_ORIGIN = 'https://www.brotherhood07.com'

export const publicUrl = (path = '/') => {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${PUBLIC_ORIGIN}${suffix}`
}

export const SITE = {
  name: 'The Brotherhood',
  url: env.VITE_SITE_URL || PUBLIC_ORIGIN,
  contact: {
    email: env.VITE_CONTACT_EMAIL || '',
    phone: env.VITE_CONTACT_PHONE || '',
    whatsapp: env.VITE_CONTACT_WHATSAPP || '',
    address: env.VITE_COMPANY_ADDRESS || '',
  },
  social: {
    instagram: cleanUrl(env.VITE_SOCIAL_INSTAGRAM || 'https://www.instagram.com/the_brotherhood07'),
    facebook: cleanUrl(env.VITE_SOCIAL_FACEBOOK || 'https://www.facebook.com/share/1HU15v79vN'),
    tiktok: cleanUrl(env.VITE_SOCIAL_TIKTOK || 'https://www.tiktok.com/@brotherhood.safi07'),
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
export const SOCIAL_LINKS = ['instagram', 'facebook', 'tiktok'].map((key) => ({ key, url: httpsUrl(SITE.social[key]) }))

/**
 * Temporary public launch. Visitors only see membership registration.
 * Set this to false to restore the full public navigation and pages.
 */
export const MEMBERSHIP_LAUNCH = true

/** Where "Commencer" leads until registration exists. */
export const START_TARGET = 'offers'

export const contactHref = (subject = '') => {
  const { email } = SITE.contact
  if (!email) return '#contact'
  return subject ? `mailto:${email}?subject=${encodeURIComponent(subject)}` : `mailto:${email}`
}
