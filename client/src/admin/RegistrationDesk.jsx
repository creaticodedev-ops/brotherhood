import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { parseZonedInput, resolveRegistration, WINDOW_ZONE, WINDOW_ZONES } from '../../../shared/registrationWindow.js'
import { RegistrationClock } from '../site/Countdown'
import { adminApi } from './api'
import { DateField } from './DatePicker'

const EMPTY = {
  countdownVisible: false,
  timeZone: WINDOW_ZONE,
  opensAt: '',
  closesAt: '',
  override: 'auto',
  messagePreset: 'auto',
}

const COPY = {
  fr: {
    kicker: 'Inscription',
    title: 'Calendrier des inscriptions',
    lead: 'L’ouverture et la fermeture sont appliquées par le serveur. Masquer le compte à rebours ne change pas l’accès au formulaire.',
    visible: 'Afficher le compte à rebours',
    hidden: 'Compte à rebours masqué',
    zone: 'Fuseau horaire',
    opens: 'Ouverture',
    closes: 'Fermeture',
    message: 'Message public',
    override: 'Contrôle manuel',
    auto: 'Suivre le calendrier',
    forceOpen: 'Ouvrir maintenant',
    forceClosed: 'Fermer maintenant',
    presets: {
      auto: 'Selon l’état',
      soon: 'Les inscriptions ouvrent bientôt',
      open: 'Les candidatures sont ouvertes',
      closed: 'Les inscriptions sont fermées',
    },
    phases: { scheduled: 'Planifié', open: 'Ouvert', closed: 'Fermé' },
    manual: 'Contrôle manuel actif',
    schedule: 'Calendrier',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saved: 'Calendrier enregistré.',
    clear: 'Revenir au calendrier automatique',
    preview: 'Aperçu',
    invalid: 'Corrigez les dates avant d’enregistrer.',
    order: 'L’ouverture doit précéder la fermeture.',
    confirmClose: 'Les visiteurs ne pourront plus envoyer de candidature. Continuer ?',
    confirmOpen: 'Les candidatures seront acceptées immédiatement, même hors calendrier. Continuer ?',
    confirmAuto: 'Le calendrier reprend la main. Continuer ?',
    loadError: 'Impossible de charger le calendrier.',
    saveError: 'Enregistrement impossible pour le moment.',
    clock: {
      kicker: 'The Brotherhood',
      untilOpen: 'Ouverture des inscriptions',
      untilClose: 'Clôture des inscriptions',
      soonTitle: 'Ouverture à venir',
      openTitle: 'Inscriptions ouvertes',
      closedTitle: 'Inscriptions fermées',
      soon: 'Les inscriptions ouvrent bientôt',
      open: 'Les candidatures sont ouvertes',
      closed: 'Les inscriptions sont fermées',
      days: 'Jours',
      hours: 'Heures',
      minutes: 'Minutes',
      seconds: 'Secondes',
    },
  },
  en: {
    kicker: 'Registration',
    title: 'Registration schedule',
    lead: 'Opening and closing are enforced by the server. Hiding the countdown does not change who can apply.',
    visible: 'Show the countdown',
    hidden: 'Countdown hidden',
    zone: 'Time zone',
    opens: 'Opens',
    closes: 'Closes',
    message: 'Public message',
    override: 'Manual control',
    auto: 'Follow the schedule',
    forceOpen: 'Open now',
    forceClosed: 'Close now',
    presets: {
      auto: 'Follow the status',
      soon: 'Registration opens soon',
      open: 'Applications are now open',
      closed: 'Registration is closed',
    },
    phases: { scheduled: 'Scheduled', open: 'Open', closed: 'Closed' },
    manual: 'Manual override active',
    schedule: 'Schedule',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Schedule saved.',
    clear: 'Return to automatic scheduling',
    preview: 'Preview',
    invalid: 'Correct the dates before saving.',
    order: 'Opening must be earlier than closing.',
    confirmClose: 'Visitors will no longer be able to send an application. Continue?',
    confirmOpen: 'Applications will be accepted immediately, even outside the schedule. Continue?',
    confirmAuto: 'The schedule takes over again. Continue?',
    loadError: 'The schedule could not be loaded.',
    saveError: 'Unable to save right now.',
    clock: {
      kicker: 'The Brotherhood',
      untilOpen: 'Registration opens',
      untilClose: 'Registration closes',
      soonTitle: 'Opening soon',
      openTitle: 'Registration is open',
      closedTitle: 'Registration is closed',
      soon: 'Registration opens soon',
      open: 'Applications are now open',
      closed: 'Registration is closed',
      days: 'Days',
      hours: 'Hours',
      minutes: 'Minutes',
      seconds: 'Seconds',
    },
  },
  ar: {
    kicker: 'التسجيل',
    title: 'جدول التسجيل',
    lead: 'يفرض الخادم وقت الفتح والإغلاق. إخفاء العدّاد لا يغيّر إمكانية إرسال الطلب.',
    visible: 'إظهار العدّاد',
    hidden: 'العدّاد مخفي',
    zone: 'المنطقة الزمنية',
    opens: 'الفتح',
    closes: 'الإغلاق',
    message: 'الرسالة العامة',
    override: 'تحكم يدوي',
    auto: 'اتباع الجدول',
    forceOpen: 'فتح الآن',
    forceClosed: 'إغلاق الآن',
    presets: {
      auto: 'حسب الحالة',
      soon: 'يفتح التسجيل قريبًا',
      open: 'الطلبات مفتوحة الآن',
      closed: 'التسجيل مغلق',
    },
    phases: { scheduled: 'مجدول', open: 'مفتوح', closed: 'مغلق' },
    manual: 'التحكم اليدوي مفعّل',
    schedule: 'الجدول',
    save: 'حفظ',
    saving: 'جارٍ الحفظ…',
    saved: 'تم حفظ الجدول.',
    clear: 'العودة إلى الجدولة التلقائية',
    preview: 'معاينة',
    invalid: 'صحّح التواريخ قبل الحفظ.',
    order: 'يجب أن يسبق الفتحُ الإغلاقَ.',
    confirmClose: 'لن يتمكن الزوار من إرسال طلب. المتابعة؟',
    confirmOpen: 'ستُقبل الطلبات فورًا، حتى خارج الجدول. المتابعة؟',
    confirmAuto: 'يعود الجدول إلى التحكم. المتابعة؟',
    loadError: 'تعذّر تحميل الجدول.',
    saveError: 'تعذّر الحفظ حالياً.',
    clock: {
      kicker: 'The Brotherhood',
      untilOpen: 'فتح التسجيل',
      untilClose: 'إغلاق التسجيل',
      soonTitle: 'الفتح قريب',
      openTitle: 'التسجيل مفتوح',
      closedTitle: 'التسجيل مغلق',
      soon: 'يفتح التسجيل قريبًا',
      open: 'الطلبات مفتوحة الآن',
      closed: 'التسجيل مغلق',
      days: 'أيام',
      hours: 'ساعات',
      minutes: 'دقائق',
      seconds: 'ثوانٍ',
    },
  },
}

const draftState = (form) => {
  const opens = parseZonedInput(form.opensAt, form.timeZone)
  const closes = parseZonedInput(form.closesAt, form.timeZone)
  return resolveRegistration(
    {
      countdownVisible: form.countdownVisible,
      timeZone: form.timeZone,
      opensAt: opens.ok ? opens.date : null,
      closesAt: closes.ok ? closes.date : null,
      override: form.override,
      messagePreset: form.messagePreset,
    },
    new Date(),
  )
}

export const RegistrationDesk = () => {
  const { locale } = useI18n()
  const copy = COPY[locale] || COPY.fr
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')
  const [fieldError, setFieldError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .registrationWindow(controller.signal)
      .then((data) => {
        setForm({ ...EMPTY, ...data.form })
        setLoading(false)
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setFailure('load')
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  const preview = useMemo(() => draftState(form), [form])
  const set = (patch) => {
    setForm((current) => ({ ...current, ...patch }))
    setNotice('')
    setFieldError('')
  }

  const save = async (next, confirmText) => {
    if (saving) return
    const opens = parseZonedInput(next.opensAt, next.timeZone)
    const closes = parseZonedInput(next.closesAt, next.timeZone)
    if (!opens.ok || !closes.ok) {
      setFieldError('invalid')
      return
    }
    if (opens.date && closes.date && opens.date.getTime() >= closes.date.getTime()) {
      setFieldError('order')
      return
    }
    if (confirmText && !window.confirm(confirmText)) return
    setSaving(true)
    setFailure('')
    try {
      const saved = await adminApi.saveRegistrationWindow(next)
      setForm({ ...EMPTY, ...saved.form })
      setNotice('saved')
    } catch (error) {
      if (error.status === 422 && error.body?.fields?.closesAt === 'order') setFieldError('order')
      else setFailure('save')
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = (event) => {
    event.preventDefault()
    const state = draftState(form)
    const confirmText = form.override === 'open' ? copy.confirmOpen : form.override === 'closed' || !state.accepting ? copy.confirmClose : ''
    save(form, confirmText)
  }

  return (
    <div className="adm-view adm-settings">
      <header className="adm-view-head">
        <div>
          <p className="kicker">{copy.kicker}</p>
          <h1 className="adm-title">{copy.title}</h1>
          <p className="adm-lead">{copy.lead}</p>
        </div>
      </header>

      {loading ? <p className="adm-lead">{copy.saving}</p> : null}
      {failure === 'load' ? <p className="bh-error" role="alert">{copy.loadError}</p> : null}

      {loading ? null : (
        <form className="adm-panel adm-window" onSubmit={onSubmit}>
          <div className="adm-window-status" aria-live="polite">
            <span className={`adm-window-pill is-${preview.phase}`}>{copy.phases[preview.phase]}</span>
            <span className={`adm-window-pill${form.override === 'auto' ? '' : ' is-manual'}`}>{form.override === 'auto' ? copy.schedule : copy.manual}</span>
          </div>

          <label className="adm-window-toggle">
            <input type="checkbox" checked={form.countdownVisible} onChange={(event) => set({ countdownVisible: event.target.checked })} />
            <span>{form.countdownVisible ? copy.visible : copy.hidden}</span>
          </label>

          <div className="adm-window-fields">
            <label className="adm-window-field is-wide" htmlFor="reg-zone">
              <span>{copy.zone}</span>
              <select id="reg-zone" value={form.timeZone} onChange={(event) => set({ timeZone: event.target.value })}>
                {WINDOW_ZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>
            <div className="adm-window-field">
              <span id="reg-open-label">{copy.opens}</span>
              <DateField
                id="reg-open"
                mode="datetime"
                value={form.opensAt}
                timeZone={form.timeZone}
                invalid={Boolean(fieldError)}
                labelledBy="reg-open-label"
                onChange={(opensAt) => set({ opensAt })}
              />
            </div>
            <div className="adm-window-field">
              <span id="reg-close-label">{copy.closes}</span>
              <DateField
                id="reg-close"
                mode="datetime"
                value={form.closesAt}
                timeZone={form.timeZone}
                invalid={Boolean(fieldError)}
                labelledBy="reg-close-label"
                onChange={(closesAt) => set({ closesAt })}
              />
            </div>
            <label className="adm-window-field is-wide" htmlFor="reg-message">
              <span>{copy.message}</span>
              <select id="reg-message" value={form.messagePreset} onChange={(event) => set({ messagePreset: event.target.value })}>
                {Object.entries(copy.presets).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {fieldError ? <p className="adm-window-error" role="alert">{fieldError === 'order' ? copy.order : copy.invalid}</p> : null}

          <fieldset className="adm-window-override">
            <legend>{copy.override}</legend>
            <div className="adm-window-choices">
              {[
                ['auto', copy.auto],
                ['open', copy.forceOpen],
                ['closed', copy.forceClosed],
              ].map(([value, label]) => (
                <label key={value} className={form.override === value ? 'is-on' : ''}>
                  <input type="radio" name="override" value={value} checked={form.override === value} onChange={() => set({ override: value })} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="adm-window-meta">
            {form.timeZone}
            {form.opensAt ? ` · ${form.opensAt.replace('T', ' ')}` : ''}
            {form.closesAt ? ` → ${form.closesAt.replace('T', ' ')}` : ''}
          </p>

          <div className="adm-window-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? copy.saving : copy.save}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={saving || form.override === 'auto'}
              onClick={() => save({ ...form, override: 'auto' }, copy.confirmAuto)}
            >
              {copy.clear}
            </button>
          </div>
          {notice === 'saved' ? <p className="adm-window-saved" role="status">{copy.saved}</p> : null}
          {failure === 'save' ? <p className="adm-window-error" role="alert">{copy.saveError}</p> : null}

          <div className="adm-window-preview">
            <p>{copy.preview}</p>
            <RegistrationClock plain state={{ ...preview, configured: true, showCountdown: form.countdownVisible && Boolean(preview.target) && !preview.invalid }} copy={copy.clock} />
          </div>
        </form>
      )}
    </div>
  )
}
