import { ar } from '../i18n/dictionaries/ar'
import { en } from '../i18n/dictionaries/en'
import { fr } from '../i18n/dictionaries/fr'
import { getNested } from '../i18n/locales'
import { numberLocale } from '../market/format'

const PUBLIC = { fr, en, ar }

/* Written in the language the applicant used on the form, whatever language the admin works in. */
const TEMPLATES = {
  fr: ({ name, offer, amount, duration }) =>
    `Bonjour ${name},\n\nNous avons le plaisir de vous confirmer que votre demande d’investissement (offre ${offer}, ${amount}, durée : ${duration}) a été approuvée. Votre inscription est maintenant confirmée.\n\nPour les prochaines étapes et les détails complémentaires, vous pouvez nous contacter directement ici, sur WhatsApp.\n\nUS Bonds`,
  en: ({ name, offer, amount, duration }) =>
    `Hello ${name},\n\nWe are pleased to confirm that your investment application (${offer} offer, ${amount}, duration: ${duration}) has been approved. Your registration is now confirmed.\n\nFor the next steps and any further details, you can contact us directly here on WhatsApp.\n\nUS Bonds`,
  ar: ({ name, offer, amount, duration }) =>
    `مرحباً ${name}،\n\nيسعدنا أن نؤكد لك أنه تمت الموافقة على طلب الاستثمار الخاص بك (عرض ${offer}، ${amount}، المدة: ${duration}). تسجيلك مؤكد الآن.\n\nللاطلاع على الخطوات التالية والتفاصيل الإضافية، يمكنك التواصل معنا مباشرة هنا عبر واتساب.\n\nUS Bonds`,
}

export const messageLocale = (item) => (TEMPLATES[item.locale] ? item.locale : 'fr')

export const confirmationMessage = (item) => {
  const locale = messageLocale(item)
  const text = (key) => getNested(PUBLIC[locale], key) ?? key
  const amount = `${new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 2 }).format(item.amount)} ${item.currency || 'USD'}`
  return TEMPLATES[locale]({
    name: item.firstName.trim(),
    offer: text(`offers.items.${item.offer}.name`),
    amount,
    duration: text(`register.durations.${item.duration}`),
  })
}

/** Number stored by the API in international format (+ country code); wa.me expects digits only. */
export const whatsappUrl = (phone, message) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`

/** Opens WhatsApp in a new tab; returns false when no window handle came back (popup blocked, or some embedded browsers). */
export const openWhatsApp = (phone, message) => {
  const win = window.open(whatsappUrl(phone, message), '_blank')
  if (!win) return false
  win.opener = null
  return true
}
