import { useState } from 'react'
import { OFFERS } from '../../config/offers'
import { useI18n } from '../../i18n/I18nProvider'
import { submitRegistration } from '../../market/api'
import { formatAmount } from '../../market/format'
import { ArrowIcon } from '../ui'
import { DEFAULT_COUNTRY, isInternational, parsePhone } from './phone'
import { PhoneField } from './PhoneField'

const DURATIONS = ['15d', '1m']
const MAX_AMOUNT = 100_000_000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const FIELD_ERRORS = ['amount', 'email', 'phone']

const parseAmount = (raw) => {
  const cleaned = String(raw).replace(/[\s\u00a0\u202f']/g, '').replace(',', '.')
  return cleaned ? Number(cleaned) : NaN
}

const validate = (values) => {
  const errors = {}
  if (values.firstName.trim().length < 2) errors.firstName = 'required'
  if (values.lastName.trim().length < 2) errors.lastName = 'required'
  if (values.city.trim().length < 2) errors.city = 'required'
  if (!EMAIL.test(values.email.trim())) errors.email = values.email.trim() ? 'email' : 'required'
  if (!parsePhone(values.phone, values.phoneCountry)) errors.phone = values.phone.trim() ? 'phone' : 'required'
  const amount = parseAmount(values.amount)
  if (!Number.isFinite(amount) || amount < 1 || amount > MAX_AMOUNT) errors.amount = 'amount'
  if (!DURATIONS.includes(values.duration)) errors.duration = 'required'
  return errors
}

const Field = ({ id, label, error, errorText, suffix, ...input }) => (
  <div className={`field${error ? ' has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <div className="field-control">
      <input id={id} name={id} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-error` : undefined} {...input} />
      {suffix ? <span className="field-suffix">{suffix}</span> : null}
    </div>
    <p className="field-error" id={`${id}-error`} aria-live="polite">
      {error ? errorText : ''}
    </p>
  </div>
)

export const RegistrationForm = ({ initialOffer, onClose }) => {
  const { t, locale } = useI18n()
  const [offer, setOffer] = useState(OFFERS.some((o) => o.id === initialOffer) ? initialOffer : OFFERS[1].id)
  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    city: '',
    email: '',
    phone: '',
    phoneCountry: DEFAULT_COUNTRY,
    amount: '',
    duration: '1m',
  })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState('idle')
  const [serverError, setServerError] = useState('')

  const offerName = (id) => t(`offers.items.${id}.name`)
  const amount = parseAmount(values.amount)

  const change = (patch) => {
    const next = { ...values, ...patch }
    setValues(next)
    if (touched) setErrors(validate(next))
  }

  const update = (key) => (event) => change({ [key]: event.target.value })

  // A complete "+33 6…" number (typed, pasted or autofilled) selects its country and shows the national format.
  const phonePatch = (raw) => {
    const parsed = parsePhone(raw, values.phoneCountry)
    return parsed?.country ? { phone: parsed.formatNational(), phoneCountry: parsed.country } : { phone: raw }
  }

  const onPhoneChange = (event) => {
    const raw = event.target.value
    change(raw.length - values.phone.length > 1 && isInternational(raw) ? phonePatch(raw) : { phone: raw })
  }

  const onPhoneBlur = () => {
    const patch = phonePatch(values.phone)
    if (patch.phone !== values.phone || patch.phoneCountry) change(patch)
  }

  const onAmountBlur = () => {
    if (Number.isFinite(amount) && amount > 0) setValues((v) => ({ ...v, amount: formatAmount(amount, locale) }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setTouched(true)
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) {
      event.currentTarget.querySelector(`[name="${Object.keys(found)[0]}"]`)?.focus()
      return
    }
    setStatus('sending')
    setServerError('')
    const phone = parsePhone(values.phone, values.phoneCountry)
    try {
      await submitRegistration({
        offer,
        firstName: values.firstName,
        lastName: values.lastName,
        city: values.city,
        email: values.email.trim(),
        phone: phone.number,
        phoneCountry: phone.country || values.phoneCountry,
        amount,
        duration: values.duration,
        locale,
      })
      setStatus('done')
    } catch (error) {
      setStatus('idle')
      if (error.status === 422 && error.body?.fields) {
        setErrors(
          Object.fromEntries(Object.keys(error.body.fields).map((key) => [key, FIELD_ERRORS.includes(key) ? key : 'required'])),
        )
      } else {
        setServerError(t(error.status === 429 ? 'register.errors.rate' : 'register.errors.server'))
      }
    }
  }

  const errorText = (key) => t(`register.errors.${FIELD_ERRORS.includes(errors[key]) ? errors[key] : 'required'}`)

  return (
    <div className="reg">
      <button type="button" className="reg-close" onClick={onClose} aria-label={t('register.close')}>
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <aside className="reg-aside">
        <p className="kicker">{t('register.kicker')}</p>
        <h2 id="register-title" className="reg-title">
          {t('register.title')}
        </h2>
        <p className="reg-lead">{t('register.lead')}</p>

        <fieldset className="reg-offers" disabled={status === 'done'}>
          <legend>{t('register.offer')}</legend>
          {OFFERS.map((item) => (
            <label key={item.id} className="reg-offer">
              <input type="radio" name="offer" value={item.id} checked={offer === item.id} onChange={() => setOffer(item.id)} />
              <span className="offer-bars" aria-hidden="true">
                {[1, 2, 3].map((n) => (
                  <i key={n} className={n <= item.level ? 'is-on' : undefined} />
                ))}
              </span>
              <span className="reg-offer-name">{offerName(item.id)}</span>
              <span className="reg-offer-level">{t('offers.level', { n: item.level })}</span>
            </label>
          ))}
        </fieldset>

        <dl className="reg-summary">
          <div>
            <dt>{t('register.offer')}</dt>
            <dd>{offerName(offer)}</dd>
          </div>
          <div>
            <dt>{t('register.amount')}</dt>
            <dd dir="ltr">{Number.isFinite(amount) && amount > 0 ? `${formatAmount(amount, locale)} USD` : '—'}</dd>
          </div>
          <div>
            <dt>{t('register.duration')}</dt>
            <dd>{t(`register.durations.${values.duration}`)}</dd>
          </div>
        </dl>
      </aside>

      <div className="reg-main">
        {status === 'done' ? (
          <div className="reg-done" role="status">
            <svg className="reg-check" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r="30" />
              <path d="M20 33l8 8 16-18" />
            </svg>
            <h3>{t('register.success.title')}</h3>
            <p>{t('register.success.text', { name: values.firstName.trim(), offer: offerName(offer) })}</p>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('register.success.close')}
            </button>
          </div>
        ) : (
          <form className="reg-form" noValidate onSubmit={onSubmit}>
            <div className="reg-row">
              <Field
                id="firstName"
                label={t('register.firstName')}
                autoComplete="given-name"
                value={values.firstName}
                onChange={update('firstName')}
                error={errors.firstName}
                errorText={errorText('firstName')}
                maxLength={60}
                autoFocus
              />
              <Field
                id="lastName"
                label={t('register.lastName')}
                autoComplete="family-name"
                value={values.lastName}
                onChange={update('lastName')}
                error={errors.lastName}
                errorText={errorText('lastName')}
                maxLength={60}
              />
            </div>
            <Field
              id="city"
              label={t('register.city')}
              autoComplete="address-level2"
              value={values.city}
              onChange={update('city')}
              error={errors.city}
              errorText={errorText('city')}
              maxLength={80}
            />
            <Field
              id="email"
              type="email"
              label={t('register.email')}
              autoComplete="email"
              inputMode="email"
              dir="ltr"
              value={values.email}
              onChange={update('email')}
              error={errors.email}
              errorText={errorText('email')}
              maxLength={254}
            />
            <PhoneField
              id="phone"
              label={t('register.phone')}
              locale={locale}
              t={t}
              country={values.phoneCountry}
              onCountry={(code) => change({ phoneCountry: code })}
              value={values.phone}
              onChange={onPhoneChange}
              onBlur={onPhoneBlur}
              error={errors.phone}
              errorText={errorText('phone')}
            />
            <Field
              id="amount"
              label={t('register.amount')}
              inputMode="decimal"
              autoComplete="off"
              dir="ltr"
              value={values.amount}
              onChange={update('amount')}
              onBlur={onAmountBlur}
              error={errors.amount}
              errorText={errorText('amount')}
              suffix="USD"
              placeholder="0"
            />

            <fieldset className="field reg-durations">
              <legend>{t('register.duration')}</legend>
              <div className="reg-duration-options">
                {DURATIONS.map((item) => (
                  <label key={item} className="reg-duration">
                    <input
                      type="radio"
                      name="duration"
                      value={item}
                      checked={values.duration === item}
                      onChange={update('duration')}
                    />
                    <span>{t(`register.durations.${item}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {serverError ? (
              <p className="reg-alert" role="alert">
                {serverError}
              </p>
            ) : null}

            <button type="submit" className="btn btn-primary btn-block reg-submit" disabled={status === 'sending'}>
              <span>{t(status === 'sending' ? 'register.sending' : 'register.submit')}</span>
              {status === 'sending' ? <i className="reg-spinner" aria-hidden="true" /> : <ArrowIcon />}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default RegistrationForm
