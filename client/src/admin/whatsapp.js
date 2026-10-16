import { ar } from '../i18n/dictionaries/ar'
import { en } from '../i18n/dictionaries/en'
import { fr } from '../i18n/dictionaries/fr'
import { getNested } from '../i18n/locales'
import { numberLocale } from '../market/format'

const PUBLIC = { fr, en, ar }

/* Written in the language the applicant used on the form, whatever language the admin works in. */
const MEMBERSHIP = {
  fr: ({ name }) =>
    `Bonjour ${name},\n\nTa candidature pour rejoindre The Brotherhood a été retenue. On te contacte ici pour la suite.\n\nThe Brotherhood`,
  en: ({ name }) =>
    `Hello ${name},\n\nYour application to join The Brotherhood has been accepted. We’ll continue the conversation here.\n\nThe Brotherhood`,
  ar: ({ name }) =>
    `مرحباً ${name}،\n\nتم قبول طلبك للانضمام إلى The Brotherhood. نكمل معك من هنا.\n\nThe Brotherhood`,
}

const TEMPLATES = {
  fr: ({ name, offer, amount, duration }) =>
    `Bonjour ${name},\n\nNous avons le plaisir de vous confirmer que votre demande (offre ${offer}, ${amount}, durée : ${duration}) a été approuvée.\n\nPour la suite, vous pouvez nous écrire ici, sur WhatsApp.\n\nThe Brotherhood`,
  en: ({ name, offer, amount, duration }) =>
    `Hello ${name},\n\nYour application (${offer}, ${amount}, duration: ${duration}) has been approved.\n\nFor the next steps, you can write to us here on WhatsApp.\n\nThe Brotherhood`,
  ar: ({ name, offer, amount, duration }) =>
    `مرحباً ${name}،\n\nتمت الموافقة على طلبك (${offer}، ${amount}، المدة: ${duration}).\n\nللخطوات التالية يمكنك مراسلتنا هنا عبر واتساب.\n\nThe Brotherhood`,
}

export const messageLocale = (item) => (TEMPLATES[item.locale] ? item.locale : 'fr')

export const confirmationMessage = (item) => {
  const locale = messageLocale(item)
  if (item.kind === 'membership') return MEMBERSHIP[locale]({ name: item.firstName.trim() })
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
