import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'

const EMPTY = {
  terms: { fr: '', en: '', ar: '' },
  termsVersion: '1',
  paymentInstructions: { fr: '', en: '', ar: '' },
  paymentAmount: 100,
  paymentCurrency: 'MAD',
  whatsappGroupUrl: '',
  linkExpiryDays: 14,
  siteUrl: '',
}

const COPY = {
  fr: {
    kicker: 'Adhésion',
    title: 'Finalisation & paiement',
    lead: 'Conditions, instructions de paiement (100 DH) et lien du groupe WhatsApp utilisés dans l’espace personnel de finalisation.',
    terms: 'Conditions d’adhésion',
    termsHint: 'Texte officiel affiché à l’adhérent. Laissez vide une langue pour retomber sur le français.',
    version: 'Version des conditions',
    payment: 'Instructions de paiement',
    amount: 'Montant (DH)',
    currency: 'Devise',
    group: 'Lien du groupe WhatsApp (https://chat.whatsapp.com/…)',
    expiry: 'Durée de validité du lien (jours)',
    siteUrl: 'URL publique du site (pour générer les liens)',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saved: 'Paramètres enregistrés.',
    loadError: 'Impossible de charger les paramètres.',
    saveError: 'Enregistrement impossible pour le moment.',
    locales: { fr: 'Français', en: 'English', ar: 'العربية' },
  },
  en: {
    kicker: 'Membership',
    title: 'Finalization & payment',
    lead: 'Terms, payment instructions (100 DH) and WhatsApp group link used in the personal finalization space.',
    terms: 'Membership terms',
    termsHint: 'Official text shown to the member. Leave a language empty to fall back to French.',
    version: 'Terms version',
    payment: 'Payment instructions',
    amount: 'Amount (DH)',
    currency: 'Currency',
    group: 'WhatsApp group link',
    expiry: 'Link validity (days)',
    siteUrl: 'Public site URL (used to build links)',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Settings saved.',
    loadError: 'Could not load settings.',
    saveError: 'Could not save right now.',
    locales: { fr: 'Français', en: 'English', ar: 'العربية' },
  },
  ar: {
    kicker: 'العضوية',
    title: 'الإتمام والدفع',
    lead: 'الشروط وتعليمات الدفع (100 درهم) ورابط مجموعة واتساب المستخدمة في مساحة الإتمام الشخصية.',
    terms: 'شروط العضوية',
    termsHint: 'النص الرسمي المعروض للعضو. اترك لغة فارغة للرجوع إلى الفرنسية.',
    version: 'إصدار الشروط',
    payment: 'تعليمات الدفع',
    amount: 'المبلغ (درهم)',
    currency: 'العملة',
    group: 'رابط مجموعة واتساب',
    expiry: 'صلاحية الرابط (أيام)',
    siteUrl: 'رابط الموقع العام (لإنشاء الروابط)',
    save: 'حفظ',
    saving: 'جاري الحفظ…',
    saved: 'تم حفظ الإعدادات.',
    loadError: 'تعذّر تحميل الإعدادات.',
    saveError: 'تعذّر الحفظ حالياً.',
    locales: { fr: 'Français', en: 'English', ar: 'العربية' },
  },
}

export const MembershipSettingsDesk = () => {
  const { locale } = useI18n()
  const copy = COPY[locale] || COPY.fr
  const [form, setForm] = useState(EMPTY)
  const [lang, setLang] = useState('fr')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .membershipSettings(controller.signal)
      .then((data) => {
        setForm({ ...EMPTY, ...data.item, terms: { ...EMPTY.terms, ...data.item.terms }, paymentInstructions: { ...EMPTY.paymentInstructions, ...data.item.paymentInstructions } })
        setLoading(false)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setFailure('load')
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [])

  const setLocaleText = (field, value) => {
    setForm((current) => ({ ...current, [field]: { ...current[field], [lang]: value } }))
    setNotice('')
  }

  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setFailure('')
    try {
      const data = await adminApi.saveMembershipSettings(form)
      setForm({ ...EMPTY, ...data.item, terms: { ...EMPTY.terms, ...data.item.terms }, paymentInstructions: { ...EMPTY.paymentInstructions, ...data.item.paymentInstructions } })
      setNotice('saved')
    } catch {
      setFailure('save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null
  if (failure === 'load') return <p className="bh-error" role="alert">{copy.loadError}</p>

  return (
    <form className="adm-panel adm-window adm-membership-settings" onSubmit={save}>
      <header className="adm-view-head" style={{ marginBottom: 18 }}>
        <div>
          <p className="kicker">{copy.kicker}</p>
          <h2 className="adm-title" style={{ fontSize: '1.45rem' }}>
            {copy.title}
          </h2>
          <p className="adm-lead">{copy.lead}</p>
        </div>
      </header>

      <div className="adm-window-choices" style={{ marginBottom: 16 }}>
        {['fr', 'en', 'ar'].map((code) => (
          <label key={code} className={lang === code ? 'is-on' : ''}>
            <input type="radio" name="ms-lang" checked={lang === code} onChange={() => setLang(code)} />
            <span>{copy.locales[code]}</span>
          </label>
        ))}
      </div>

      <label className="adm-window-field is-wide">
        <span>{copy.terms}</span>
        <textarea rows={8} value={form.terms[lang] || ''} onChange={(event) => setLocaleText('terms', event.target.value)} dir={lang === 'ar' ? 'rtl' : 'ltr'} />
        <small className="adm-muted">{copy.termsHint}</small>
      </label>

      <div className="adm-window-fields">
        <label className="adm-window-field" htmlFor="ms-version">
          <span>{copy.version}</span>
          <input id="ms-version" value={form.termsVersion} onChange={(event) => setForm((c) => ({ ...c, termsVersion: event.target.value }))} />
        </label>
        <label className="adm-window-field" htmlFor="ms-amount">
          <span>{copy.amount}</span>
          <input id="ms-amount" type="number" min={1} step={1} value={form.paymentAmount} onChange={(event) => setForm((c) => ({ ...c, paymentAmount: Number(event.target.value) }))} />
        </label>
        <label className="adm-window-field" htmlFor="ms-currency">
          <span>{copy.currency}</span>
          <input id="ms-currency" value={form.paymentCurrency} onChange={(event) => setForm((c) => ({ ...c, paymentCurrency: event.target.value }))} />
        </label>
        <label className="adm-window-field" htmlFor="ms-expiry">
          <span>{copy.expiry}</span>
          <input id="ms-expiry" type="number" min={1} max={90} value={form.linkExpiryDays} onChange={(event) => setForm((c) => ({ ...c, linkExpiryDays: Number(event.target.value) }))} />
        </label>
      </div>

      <label className="adm-window-field is-wide">
        <span>{copy.payment}</span>
        <textarea
          rows={6}
          value={form.paymentInstructions[lang] || ''}
          onChange={(event) => setLocaleText('paymentInstructions', event.target.value)}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        />
      </label>

      <label className="adm-window-field is-wide" htmlFor="ms-group">
        <span>{copy.group}</span>
        <input id="ms-group" dir="ltr" value={form.whatsappGroupUrl} onChange={(event) => setForm((c) => ({ ...c, whatsappGroupUrl: event.target.value }))} />
      </label>

      <label className="adm-window-field is-wide" htmlFor="ms-site">
        <span>{copy.siteUrl}</span>
        <input id="ms-site" dir="ltr" value={form.siteUrl} onChange={(event) => setForm((c) => ({ ...c, siteUrl: event.target.value }))} placeholder="https://www.brotherhood07.com" />
      </label>

      <div className="adm-window-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? copy.saving : copy.save}
        </button>
      </div>
      {notice === 'saved' ? <p className="adm-window-saved" role="status">{copy.saved}</p> : null}
      {failure === 'save' ? <p className="adm-window-error" role="alert">{copy.saveError}</p> : null}
    </form>
  )
}
