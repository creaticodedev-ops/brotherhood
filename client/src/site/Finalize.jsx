import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_COUNTRY, parsePhone } from '../landing/overlays/phone'
import { PhoneField } from '../landing/overlays/PhoneField'
import { useI18n } from '../i18n/I18nProvider'
import { Logo } from '../landing/ui'
import { finalizeApi } from './finalizeApi'
import { FINALIZE_COPY, fill } from './finalizeCopy'
import '../landing/overlays/overlays.css'
import './finalize.css'

const STEPS = ['info', 'terms', 'payment', 'review', 'complete']
const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const RECEIPT_MAX = 5_000_000

const formatWhen = (value, locale) => {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : locale === 'en' ? 'en-GB' : 'fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

const StepRail = ({ step, copy }) => {
  const current = Math.max(0, STEPS.indexOf(step === 'welcome' ? 'info' : step))
  return (
    <ol className="fz-rail" aria-label={fill(copy.progress, { current: current + 1, total: STEPS.length })}>
      {STEPS.map((id, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo'
        return (
          <li key={id} className={`fz-rail-item is-${state}`}>
            <span className="fz-rail-dot" aria-hidden="true">
              {state === 'done' ? '✓' : index + 1}
            </span>
            <span className="fz-rail-label">{copy.steps[id]}</span>
          </li>
        )
      })}
    </ol>
  )
}

const WelcomeCard = ({ item, copy, token }) => (
  <header className="fz-hero">
    <p className="fz-kicker">{copy.kicker}</p>
    <h1>{copy.welcomeTitle}</h1>
    <p className="fz-lead">{fill(copy.welcomeLead, { name: item.firstName })}</p>
    <p className="fz-official">{copy.official}</p>
    <div className="fz-dossier-wrap">
      {item.hasPhoto ? (
        <figure className="fz-portrait">
          <img src={`/api/finalize/${encodeURIComponent(token)}/photo`} alt={copy.photo} />
          <figcaption>{copy.photo}</figcaption>
        </figure>
      ) : null}
      <dl className="fz-dossier">
        <div>
          <dt>{copy.dossier}</dt>
          <dd dir="auto">
            {item.firstName} {item.lastName}
          </dd>
        </div>
        {item.city ? (
          <div>
            <dt>{copy.info.city}</dt>
            <dd dir="auto">{item.city}</dd>
          </div>
        ) : null}
        {item.email ? (
          <div>
            <dt>{copy.info.email}</dt>
            <dd dir="ltr">{item.email}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  </header>
)

const InfoStep = ({ item, copy, locale, t, onSaved, busy, setBusy, setError }) => {
  const [instagram, setInstagram] = useState(item.profile?.instagram || '')
  const [whatsapp, setWhatsapp] = useState(item.profile?.whatsapp || item.phone || '')
  const [country, setCountry] = useState(item.profile?.whatsappCountry || DEFAULT_COUNTRY)
  const [fields, setFields] = useState({})

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!instagram.trim()) next.instagram = copy.errors.instagram
    if (!parsePhone(whatsapp, country)) next.whatsapp = copy.errors.whatsapp
    setFields(next)
    if (Object.keys(next).length) return
    setBusy(true)
    setError('')
    try {
      const data = await finalizeApi.saveInfo(window.__fzToken, {
        instagram: instagram.trim(),
        whatsapp,
        whatsappCountry: country,
        locale,
      })
      onSaved(data.item)
    } catch (err) {
      const bodyFields = err.body?.fields || {}
      setFields({
        instagram: bodyFields.instagram ? copy.errors.instagram : '',
        whatsapp: bodyFields.whatsapp ? copy.errors.whatsapp : '',
      })
      setError(copy.errors.generic)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="fz-card" onSubmit={submit} noValidate>
      <h2>{copy.info.title}</h2>
      <p>{copy.info.lead}</p>
      <div className="fz-review">
        <p className="fz-review-title">{copy.info.reviewTitle}</p>
        <ul>
          {item.city ? (
            <li>
              <span>{copy.info.city}</span>
              <strong dir="auto">{item.city}</strong>
            </li>
          ) : null}
          {item.email ? (
            <li>
              <span>{copy.info.email}</span>
              <strong dir="ltr">{item.email}</strong>
            </li>
          ) : null}
          {item.phone ? (
            <li>
              <span>{copy.info.phone}</span>
              <strong dir="ltr">{item.phone}</strong>
            </li>
          ) : null}
        </ul>
      </div>
      <div className={`field${fields.instagram ? ' has-error' : ''}`}>
        <label htmlFor="fz-ig">{copy.info.instagram}</label>
        <input
          id="fz-ig"
          dir="ltr"
          inputMode="url"
          autoComplete="url"
          placeholder={copy.info.instagramHint}
          value={instagram}
          onChange={(event) => setInstagram(event.target.value)}
          aria-invalid={fields.instagram ? 'true' : undefined}
        />
        <p className="field-error">{fields.instagram || ''}</p>
      </div>
      <PhoneField
        id="fz-wa"
        label={copy.info.whatsapp}
        locale={locale}
        t={t}
        country={country}
        value={whatsapp}
        onCountry={setCountry}
        onChange={(event) => {
          const parsed = parsePhone(event.target.value, country)
          setWhatsapp(parsed ? parsed.formatNational() : event.target.value)
          if (parsed?.country) setCountry(parsed.country)
        }}
        error={Boolean(fields.whatsapp)}
        errorText={fields.whatsapp || ''}
      />
      <p className="fz-hint">{copy.info.whatsappHint}</p>
      <button type="submit" className="btn btn-primary fz-cta" disabled={busy}>
        {busy ? copy.saving : copy.continue}
      </button>
    </form>
  )
}

const TermsStep = ({ item, copy, locale, onSaved, busy, setBusy, setError }) => {
  const [accepted, setAccepted] = useState(Boolean(item.terms?.acceptedAt))
  const [localError, setLocalError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    if (!accepted) {
      setLocalError(copy.errors.accepted)
      return
    }
    setBusy(true)
    setError('')
    setLocalError('')
    try {
      const data = await finalizeApi.acceptTerms(window.__fzToken, {
        accepted: true,
        version: item.terms.version,
        locale,
      })
      onSaved(data.item)
    } catch {
      setError(copy.errors.generic)
    } finally {
      setBusy(false)
    }
  }

  if (!item.terms?.ready) {
    return (
      <section className="fz-card">
        <h2>{copy.terms.title}</h2>
        <p className="fz-empty">{copy.terms.empty}</p>
      </section>
    )
  }

  return (
    <form className="fz-card" onSubmit={submit}>
      <h2>{copy.terms.title}</h2>
      <p>{copy.terms.lead}</p>
      <p className="fz-version">{fill(copy.terms.version, { version: item.terms.version })}</p>
      <article className="fz-terms" tabIndex={0}>
        {item.terms.text.split(/\n{2,}/).map((block, index) => (
          <p key={index}>{block}</p>
        ))}
      </article>
      <label className="fz-check">
        <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
        <span>{copy.terms.accept}</span>
      </label>
      {localError ? (
        <p className="field-error" role="alert">
          {localError}
        </p>
      ) : null}
      {item.terms.acceptedAt ? <p className="fz-hint">{fill(copy.terms.acceptedOn, { date: formatWhen(item.terms.acceptedAt, locale) })}</p> : null}
      <button type="submit" className="btn btn-primary fz-cta" disabled={busy}>
        {busy ? copy.saving : copy.continue}
      </button>
    </form>
  )
}

const PaymentStep = ({ item, copy, locale, onSaved, busy, setBusy, setError }) => {
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const currency = item.payment?.currency === 'MAD' ? 'DH' : item.payment?.currency || 'DH'

  const onFile = (event) => {
    const next = event.target.files?.[0]
    setFile(null)
    setError('')
    if (!next) return
    if (!RECEIPT_TYPES.includes(next.type) || next.size > RECEIPT_MAX) {
      setError(copy.errors.receipt)
      return
    }
    setFile(next)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!file) {
      setError(copy.errors.receipt)
      return
    }
    setBusy(true)
    setError('')
    setProgress(0)
    try {
      const data = await finalizeApi.uploadReceipt(window.__fzToken, file, locale, setProgress)
      onSaved(data.item)
    } catch (err) {
      setError(err.status === 413 || err.status === 422 ? copy.errors.receipt : copy.errors.generic)
    } finally {
      setBusy(false)
    }
  }

  if (!item.payment?.ready && item.payment?.status === 'none') {
    return (
      <section className="fz-card">
        <h2>{copy.payment.title}</h2>
        <p className="fz-empty">{copy.payment.unavailable}</p>
      </section>
    )
  }

  if (item.payment?.status === 'pending') {
    return (
      <section className="fz-card fz-status is-pending">
        <h2>{copy.payment.pending}</h2>
        <p>{copy.payment.pendingLead}</p>
      </section>
    )
  }

  return (
    <form className="fz-card" onSubmit={submit}>
      <h2>{copy.payment.title}</h2>
      <p>{fill(copy.payment.lead, { amount: item.payment.amount, currency })}</p>
      <div className="fz-pay-grid">
        <div>
          <span>{copy.payment.amount}</span>
          <strong dir="ltr">
            {item.payment.amount} {currency}
          </strong>
        </div>
        <div>
          <span>{copy.payment.motif}</span>
          <strong>{copy.payment.motifValue}</strong>
        </div>
      </div>
      <div className="fz-instructions">
        <h3>{copy.payment.instructions}</h3>
        {item.payment.instructions.split(/\n{2,}/).map((block, index) => (
          <p key={index}>{block}</p>
        ))}
      </div>
      {item.payment.status === 'rejected' ? (
        <p className="fz-alert" role="alert">
          {fill(copy.payment.rejectedLead, { reason: item.payment.rejectReason || '—' })}
        </p>
      ) : null}
      <label className="fz-upload">
        <span className="fz-upload-title">{copy.payment.upload}</span>
        <span className="fz-upload-hint">{copy.payment.uploadHint}</span>
        <span className="btn btn-ghost fz-upload-btn">{file ? file.name : copy.payment.choose}</span>
        <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf" onChange={onFile} />
      </label>
      {busy && progress > 0 ? (
        <div className="fz-progress" aria-hidden="true">
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      ) : null}
      <button type="submit" className="btn btn-primary fz-cta" disabled={busy || !file}>
        {busy ? copy.payment.sending : copy.payment.send}
      </button>
    </form>
  )
}

const ReviewStep = ({ copy }) => (
  <section className="fz-card fz-status is-pending">
    <h2>{copy.review.title}</h2>
    <p>{copy.review.lead}</p>
  </section>
)

const CompleteStep = ({ item, copy }) => (
  <section className="fz-card fz-status is-complete">
    <h2>{copy.complete.title}</h2>
    <p>{copy.complete.lead}</p>
    {item.group?.available ? (
      <a className="btn btn-primary fz-cta fz-wa-join" href={item.group.url} target="_blank" rel="noopener noreferrer">
        {copy.complete.join}
      </a>
    ) : (
      <p className="fz-empty">{copy.complete.noGroup}</p>
    )}
    <p className="fz-hint">{copy.complete.note}</p>
  </section>
)

export const Finalize = ({ token }) => {
  const { locale, setLocale, t } = useI18n()
  const copy = FINALIZE_COPY[locale] || FINALIZE_COPY.fr
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    window.__fzToken = token
  }, [token])

  useEffect(() => {
    const controller = new AbortController()
    setError('')
    finalizeApi
      .load(token, locale, controller.signal)
      .then((data) => setItem(data.item))
      .catch((err) => {
        if (err.name === 'AbortError') return
        const key = err.body?.error || err.message
        setError(copy.errors[key] || (err.status === 0 ? copy.errors.network : copy.errors.missing))
        setItem(null)
      })
    return () => controller.abort()
  }, [token, locale, attempt, copy.errors])

  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const step = item?.step || 'info'
  const body = useMemo(() => {
    if (!item) return null
    if (step === 'complete') return <CompleteStep item={item} copy={copy} />
    if (step === 'review') return <ReviewStep copy={copy} />
    if (step === 'payment') {
      return <PaymentStep item={item} copy={copy} locale={locale} onSaved={setItem} busy={busy} setBusy={setBusy} setError={setError} />
    }
    if (step === 'terms') {
      return <TermsStep item={item} copy={copy} locale={locale} onSaved={setItem} busy={busy} setBusy={setBusy} setError={setError} />
    }
    return <InfoStep item={item} copy={copy} locale={locale} t={t} onSaved={setItem} busy={busy} setBusy={setBusy} setError={setError} />
  }, [item, step, copy, locale, t, busy])

  return (
    <div className="fz" dir={dir} lang={locale}>
      <div className="fz-bg" aria-hidden="true" />
      <div className="fz-shell">
        <div className="fz-top">
          <a className="fz-brand" href="/" aria-label={copy.brand}>
            <Logo />
            <span>{copy.brand}</span>
          </a>
          <div className="fz-langs" role="group" aria-label="Language">
            {['fr', 'en', 'ar'].map((code) => (
              <button key={code} type="button" className={locale === code ? 'is-active' : ''} onClick={() => setLocale(code)}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {!item && !error ? (
          <p className="fz-loading" role="status">
            {copy.loading}
          </p>
        ) : null}

        {error && !item ? (
          <section className="fz-card fz-status is-error" role="alert">
            <h1>{error}</h1>
            <button type="button" className="btn btn-ghost fz-cta" onClick={() => setAttempt((n) => n + 1)}>
              {copy.retry}
            </button>
          </section>
        ) : null}

        {item ? (
          <>
            <WelcomeCard item={item} copy={copy} token={token} />
            <StepRail step={step} copy={copy} />
            {error ? (
              <p className="fz-alert" role="alert">
                {error}
              </p>
            ) : null}
            {body}
          </>
        ) : null}
      </div>
    </div>
  )
}
