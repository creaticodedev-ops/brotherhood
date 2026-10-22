import { ar } from '../i18n/dictionaries/ar'
import { en } from '../i18n/dictionaries/en'
import { fr } from '../i18n/dictionaries/fr'
import { getNested } from '../i18n/locales'
import { numberLocale } from '../market/format'
import {
  isValidWhatsAppPhone,
  isWhatsAppEligible,
  isWhatsAppGroupUrl,
  normalizeWhatsAppDigits,
  whatsappClickUrl,
  WHATSAPP_ELIGIBLE,
} from '../../../shared/whatsapp.js'

export {
  isValidWhatsAppPhone,
  isWhatsAppEligible,
  isWhatsAppGroupUrl,
  normalizeWhatsAppDigits,
  WHATSAPP_ELIGIBLE,
}

const PUBLIC = { fr, en, ar }

/* Written in the language the applicant used on the form, whatever language the admin works in. */
const MEMBERSHIP = {
  fr: ({ name }) =>
    `Bonjour ${name} !\n\nNous avons le plaisir de t'annoncer que ta candidature pour rejoindre THE BROTHERHOOD a été acceptée ! 🎉\n\nBienvenue dans la famille. Nous sommes impatients de découvrir tes idées, ton énergie et ce que nous allons accomplir ensemble.\n\nEvery Warrior Has a Story.\n\nÀ très bientôt,\nTeam THE BROTHERHOOD`,
  en: ({ name }) =>
    `Hello ${name},\n\nYour application to join The Brotherhood has been accepted. We’ll continue the conversation here.\n\nThe Brotherhood`,
  ar: ({ name }) =>
    `مرحباً ${name}،\n\nتم قبول طلبك للانضمام إلى The Brotherhood. نكمل معك من هنا.\n\nThe Brotherhood`,
}

const FINALIZE = {
  fr: ({ name, link }) =>
    `Bonjour ${name},\n\nFélicitations, votre demande d’adhésion a été approuvée !\n\nPour finaliser votre adhésion, veuillez accéder à votre espace personnel via le lien suivant :\n\n${link}\n\nVous pourrez y compléter vos informations, consulter et accepter les conditions d’adhésion, puis transmettre votre reçu de paiement de 100 DH.\n\nNous vous remercions et vous souhaitons la bienvenue parmi nous.\n\nTHE BROTHERHOOD`,
  en: ({ name, link }) =>
    `Hello ${name},\n\nCongratulations — your membership application has been approved!\n\nTo complete your membership, open your personal space using this link:\n\n${link}\n\nThere you can confirm your details, review and accept the membership terms, and upload your 100 DH payment receipt.\n\nWelcome to THE BROTHERHOOD.`,
  ar: ({ name, link }) =>
    `مرحباً ${name}،\n\nتهانينا، تمت الموافقة على طلب عضويتك!\n\nلإتمام عضويتك، افتح مساحتك الشخصية عبر الرابط التالي:\n\n${link}\n\nستتمكن من إكمال معلوماتك، وقراءة شروط العضوية وقبولها، ثم إرسال إيصال دفع 100 درهم.\n\nمرحباً بك في THE BROTHERHOOD.`,
}

/** Welcome + official group invite for previously approved members. French is the default template. */
const APPROVED_GROUP = {
  fr: ({ name, groupLink }) =>
    `Salam ${name} 👋\n\nBonne nouvelle ! Ta demande d’adhésion à THE BROTHERHOOD a été approuvée. Félicitations et bienvenue parmi nous ! 🤝\n\nPour rejoindre notre communauté, merci de cliquer sur le lien ci-dessous et de rejoindre notre groupe WhatsApp officiel :\n\n${groupLink}\n\nNous sommes ravis de t’accueillir dans la famille THE BROTHERHOOD !`,
  en: ({ name, groupLink }) =>
    `Salam ${name} 👋\n\nGood news! Your application to join THE BROTHERHOOD has been approved. Congratulations and welcome! 🤝\n\nTo join our community, please open the link below and join our official WhatsApp group:\n\n${groupLink}\n\nWe’re glad to welcome you into the THE BROTHERHOOD family!`,
  ar: ({ name, groupLink }) =>
    `سلام ${name} 👋\n\nخبر سار! تمت الموافقة على طلب انضمامك إلى THE BROTHERHOOD. تهانينا ومرحباً بك معنا! 🤝\n\nللانضمام إلى مجتمعنا، اضغط على الرابط أدناه وانضم إلى مجموعة واتساب الرسمية:\n\n${groupLink}\n\nيسعدنا استقبالك في عائلة THE BROTHERHOOD!`,
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
  if (item.kind === 'membership') {
    const link = item.finalization?.linkUrl
    if (link) return FINALIZE[locale]({ name: item.firstName.trim(), link })
    return MEMBERSHIP[locale]({ name: item.firstName.trim() })
  }
  const text = (key) => getNested(PUBLIC[locale], key) ?? key
  const amount = `${new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 2 }).format(item.amount)} ${item.currency || 'USD'}`
  return TEMPLATES[locale]({
    name: item.firstName.trim(),
    offer: text(`offers.items.${item.offer}.name`),
    amount,
    duration: text(`register.durations.${item.duration}`),
  })
}

export const finalizeInviteMessage = (item, link) => {
  const locale = messageLocale(item)
  return FINALIZE[locale]({ name: item.firstName.trim(), link })
}

/** Best phone for messaging: finalization WhatsApp first, then registration phone. */
export const memberWhatsAppPhone = (item) => {
  const fromFinalize = item?.finalization?.whatsapp || ''
  const fromRegistration = item?.phone || ''
  return String(fromFinalize || fromRegistration).trim()
}

export const approvedGroupMessage = (item, groupLink = '', localeOverride) => {
  const locale = APPROVED_GROUP[localeOverride] ? localeOverride : messageLocale(item)
  const name = String(item?.firstName || '').trim() || 'ami'
  const link = String(groupLink || '').trim()
  return APPROVED_GROUP[locale]({ name, groupLink: link })
}

/** Number stored by the API in international format (+ country code); wa.me expects digits only. */
export const whatsappUrl = (phone, message) => whatsappClickUrl(phone, message)

/** Opens WhatsApp in a new tab; returns false when no window handle came back (popup blocked, or some embedded browsers). */
export const openWhatsApp = (phone, message) => {
  const win = window.open(whatsappClickUrl(phone, message), '_blank')
  if (!win) return false
  win.opener = null
  return true
}
