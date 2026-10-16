import nodemailer from 'nodemailer'

const env = (name) => process.env[name]?.trim() || ''

const COPY = {
  fr: {
    subject: 'US Bonds — Réinitialisation du mot de passe administrateur',
    intro: 'Une réinitialisation du mot de passe administrateur a été demandée.',
    action: 'Créer un nouveau mot de passe',
    expiry: 'Ce lien est valable 30 minutes et ne peut être utilisé qu’une seule fois.',
    ignore: 'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message : le mot de passe actuel reste inchangé.',
  },
  en: {
    subject: 'US Bonds — Admin password reset',
    intro: 'A reset of the administrator password was requested.',
    action: 'Create a new password',
    expiry: 'This link is valid for 30 minutes and can only be used once.',
    ignore: 'If you did not request this, ignore this message: the current password stays unchanged.',
  },
  ar: {
    subject: 'US Bonds — إعادة تعيين كلمة مرور المسؤول',
    intro: 'تم طلب إعادة تعيين كلمة مرور المسؤول.',
    action: 'إنشاء كلمة مرور جديدة',
    expiry: 'هذا الرابط صالح لمدة 30 دقيقة ويمكن استخدامه مرة واحدة فقط.',
    ignore: 'إذا لم تكن صاحب هذا الطلب، تجاهل هذه الرسالة: كلمة المرور الحالية تبقى دون تغيير.',
  },
}

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

export const resetEmailConfigured = () => Boolean(env('SMTP_HOST') && env('ADMIN_EMAIL'))

/** Public address of the site used to build the link — never taken from request headers. */
export const appUrl = () => (env('ADMIN_APP_URL') || 'http://localhost:3000').replace(/\/+$/, '')

let transport = null
const mailer = () =>
  (transport ||= nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port: Number(env('SMTP_PORT')) || 587,
    secure: env('SMTP_SECURE') === 'true',
    auth: env('SMTP_USER') ? { user: env('SMTP_USER'), pass: env('SMTP_PASS') } : undefined,
  }))

/**
 * Sends the reset link to ADMIN_EMAIL when SMTP is configured. Otherwise (local development) the link
 * is printed in the API server terminal, which only the operator of the machine can read.
 */
export const deliverResetLink = async (url, locale = 'fr') => {
  const copy = COPY[locale] || COPY.fr
  if (resetEmailConfigured()) {
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    try {
      await mailer().sendMail({
        from: env('SMTP_FROM') || env('SMTP_USER') || env('ADMIN_EMAIL'),
        to: env('ADMIN_EMAIL'),
        subject: copy.subject,
        text: `${copy.intro}\n\n${copy.action} : ${url}\n\n${copy.expiry}\n${copy.ignore}\n\nUS Bonds`,
        html: `<div dir="${dir}" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111">
<p>${escapeHtml(copy.intro)}</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#009a5a;color:#fff;text-decoration:none;font-weight:600">${escapeHtml(copy.action)}</a></p>
<p style="color:#555">${escapeHtml(copy.expiry)}<br>${escapeHtml(copy.ignore)}</p>
<p>US Bonds</p></div>`,
      })
      return 'email'
    } catch (error) {
      console.error('[admin] Reset e-mail could not be sent, printing the link instead:', error.message)
    }
  }
  const line = '-'.repeat(72)
  console.log(`\n${line}\n[admin] Password reset link (valid 30 minutes, single use):\n${url}\n${line}\n`)
  return 'console'
}
