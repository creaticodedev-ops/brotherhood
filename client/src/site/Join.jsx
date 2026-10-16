import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { DEFAULT_COUNTRY, parsePhone } from '../landing/overlays/phone'
import { PhoneField } from '../landing/overlays/PhoneField'
import '../landing/overlays/overlays.css'
import { submitApplication } from './api'
import { A, useCopy, usePageMeta } from './ui'

const DRAFT_KEY = 'brotherhood-join'
const MISSIONS = ['asfi', 'fund', 'responsibility']

const empty = () => ({
  firstName: '',
  lastName: '',
  age: '',
  gender: '',
  city: '',
  email: '',
  phone: '',
  phoneCountry: DEFAULT_COUNTRY,
  organization: '',
  domain: '',
  motivation: '',
  contribution: '',
  squads: [],
  asfi: '',
  fund: '',
  responsibility: '',
  practical: '',
})

const loadDraft = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
    return saved ? { ...empty(), ...saved } : empty()
  } catch {
    return empty()
  }
}

const JOIN_AUDIO = '/media/brotherhood.mp4'
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const fitPhoto = (file) =>
  new Promise((resolve, reject) => {
    const source = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const scale = Math.min(1, 1280 / Math.max(image.width, image.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(source)
      const type = file.type === 'image/png' && file.size < 900_000 ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('invalid'))), type, 0.82)
    }
    image.onerror = () => {
      URL.revokeObjectURL(source)
      reject(new Error('invalid'))
    }
    image.src = source
  })

const readBlob = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('invalid'))
    reader.readAsDataURL(blob)
  })

const JoinSound = () => {
  const mediaRef = useRef(null)

  useEffect(() => {
    const media = mediaRef.current
    if (!media) return undefined
    const attempt = media.play()
    if (attempt?.catch) attempt.catch(() => {})
    return () => {
      media.pause()
    }
  }, [])

  return <audio ref={mediaRef} className="join-audio" src={JOIN_AUDIO} preload="auto" autoPlay />
}

const Field = ({ id, label, error, children }) => (
  <div className={`bh-field${id === 'motivation' || id === 'contribution' || id === 'practical' ? ' is-wide' : ''}`}>
    <label htmlFor={id}>{label}</label>
    {children}
    <p className="bh-error">{error || ''}</p>
  </div>
)

export const Join = () => {
  const { pack, locale } = useCopy()
  const { t } = useI18n()
  const copy = pack.join
  const [step, setStep] = useState(0)
  const [mission, setMission] = useState(0)
  const [values, setValues] = useState(loadDraft)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [serverError, setServerError] = useState('')
  const [reference, setReference] = useState('')
  const [portrait, setPortrait] = useState(null)
  usePageMeta(`${copy.title} — The Brotherhood`, copy.lead, '/join')

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values))
  }, [values])

  useEffect(() => () => {
    if (portrait?.url) URL.revokeObjectURL(portrait.url)
  }, [portrait])

  const set = (patch) => setValues((current) => ({ ...current, ...patch }))

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const allowed = PHOTO_TYPES
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({ ...current, photo: copy.photoInvalid }))
      return
    }
    try {
      const blob = await fitPhoto(file)
      if (blob.size > 1_200_000) {
        setErrors((current) => ({ ...current, photo: copy.photoInvalid }))
        return
      }
      const dataUrl = await readBlob(blob)
      const url = URL.createObjectURL(blob)
      setPortrait((current) => {
        if (current?.url) URL.revokeObjectURL(current.url)
        return { url, dataUrl }
      })
      setErrors((current) => ({ ...current, photo: '' }))
    } catch {
      setErrors((current) => ({ ...current, photo: copy.photoInvalid }))
    }
  }

  const clearPhoto = () => {
    setPortrait((current) => {
      if (current?.url) URL.revokeObjectURL(current.url)
      return null
    })
    setErrors((current) => ({ ...current, photo: '' }))
  }

  const validate = (index = step) => {
    const next = {}
    if (index === 0) {
      if (values.firstName.trim().length < 2) next.firstName = copy.required
      if (values.lastName.trim().length < 2) next.lastName = copy.required
      const age = Number(values.age)
      if (!Number.isInteger(age) || age < 13 || age > 99) next.age = copy.invalidAge
      if (values.gender !== 'homme' && values.gender !== 'femme') next.gender = copy.required
      if (values.city.trim().length < 2) next.city = copy.required
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) next.email = copy.invalidEmail
      if (!parsePhone(values.phone, values.phoneCountry)) next.phone = copy.invalidPhone
      if (values.organization.trim().length < 2) next.organization = copy.required
      if (values.domain.trim().length < 2) next.domain = copy.required
    }
    if (index === 1) {
      if (values.motivation.trim().length < 20) next.motivation = copy.short
      if (values.contribution.trim().length < 10) next.contribution = copy.short
    }
    if (index === 2 && !values.squads.length) next.squads = copy.squads
    if (index === 3) {
      MISSIONS.forEach((key) => {
        if (values[key].trim().length < 20) next[key] = copy.short
      })
    }
    setErrors(next)
    return !Object.keys(next).length
  }

  const next = () => {
    if (step === 3 && mission < MISSIONS.length - 1) {
      const key = MISSIONS[mission]
      if (values[key].trim().length < 20) {
        setErrors({ [key]: copy.short })
        return
      }
      setErrors({})
      setMission((value) => value + 1)
      window.scrollTo(0, 0)
      return
    }
    if (!validate()) return
    setStep((value) => Math.min(4, value + 1))
    window.scrollTo(0, 0)
  }

  const back = () => {
    if (step === 3 && mission > 0) {
      setErrors({})
      setMission((value) => value - 1)
      window.scrollTo(0, 0)
      return
    }
    setStep((value) => value - 1)
    window.scrollTo(0, 0)
  }

  const toggleSquad = (id) => {
    set({ squads: values.squads.includes(id) ? values.squads.filter((item) => item !== id) : [...values.squads, id] })
  }

  const send = async () => {
    if (![0, 1, 2].every((index) => validate(index))) {
      setStep(0)
      return
    }
    if (!validate(3)) {
      const missing = MISSIONS.findIndex((key) => values[key].trim().length < 20)
      setStep(3)
      setMission(missing < 0 ? 0 : missing)
      return
    }
    setStatus('sending')
    setServerError('')
    try {
      const saved = await submitApplication({
        kind: 'membership',
        firstName: values.firstName,
        lastName: values.lastName,
        age: Number(values.age),
        gender: values.gender,
        city: values.city,
        email: values.email,
        phone: values.phone,
        phoneCountry: values.phoneCountry,
        organization: values.organization,
        domain: values.domain,
        motivation: values.motivation,
        contribution: values.contribution,
        squads: values.squads,
        practical: values.practical,
        locale,
        photo: portrait?.dataUrl || '',
        challenges: {
          asfi: values.asfi,
          fund: values.fund,
          responsibility: values.responsibility,
        },
      })
      localStorage.removeItem(DRAFT_KEY)
      setReference(saved.id)
      setStatus('saved')
    } catch (error) {
      if (error.fields?.photo) {
        setStep(0)
        setErrors({ photo: copy.photoInvalid })
        setStatus('idle')
        return
      }
      setStatus('error')
      setServerError(error.status === 429 ? copy.rate : error.status === 503 ? copy.offline : copy.fail)
    }
  }

  const input = (id, type = 'text') => (
    <Field id={id} label={copy.fields[id]} error={errors[id]}>
      <input id={id} name={id} type={type} value={values[id]} autoComplete="on" onChange={(event) => set({ [id]: event.target.value })} />
    </Field>
  )

  return (
    <div className="join-stage">
      <div className="join-bg" aria-hidden="true" />
      <JoinSound />
      {status === 'saved' ? (
      <article className="section page-pad">
        <div className="container join-success">
        <p className="kicker">{copy.kicker}</p>
        <h1 className="page-title">{copy.successTitle}</h1>
        <p className="lead">{copy.success}</p>
        <p>
          {copy.reference}: <strong dir="ltr">{reference}</strong>
        </p>
        <A className="btn btn-primary" href="/">
          {copy.again}
        </A>
        </div>
      </article>
      ) : (
    <article className="section page-pad">
      <div className="container join-shell">
      <p className="kicker">{copy.kicker}</p>
      <h1 className="page-title">{copy.title}</h1>
      <p className="lead">{copy.lead}</p>
      <div className="join-meter" style={{ '--step': step }} aria-hidden="true">
        <span />
      </div>
      <ol className="bh-steps">
        {copy.steps.map((label, index) => (
          <li key={label} aria-current={index === step ? 'step' : undefined}>
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="bh-form">
          <div className="bh-field is-wide">
            <p className="gender-legend" id="photo-label">{copy.fields.photo}</p>
            <div className={`photo-pick${portrait ? ' has-photo' : ''}`}>
              <input id="profile-photo" className="photo-pick-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} aria-labelledby="photo-label" />
              <span className="photo-pick-frame" aria-hidden="true">
                {portrait ? <img src={portrait.url} alt="" /> : (
                  <svg viewBox="0 0 24 24" width="28" height="28">
                    <circle cx="12" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M5.5 19.2c1.4-2.6 3.6-3.8 6.5-3.8s5.1 1.2 6.5 3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                )}
              </span>
              <span className="photo-pick-copy">
                <span className="photo-pick-add">{portrait ? copy.photoReplace : copy.photoAdd}</span>
                <small>{copy.photoHint}</small>
                {portrait ? (
                  <button type="button" className="photo-pick-remove" onClick={clearPhoto}>{copy.photoRemove}</button>
                ) : null}
              </span>
            </div>
            <p className="bh-error" role={errors.photo ? 'alert' : undefined}>{errors.photo || ''}</p>
          </div>
          {input('firstName')}
          {input('lastName')}
          {input('age', 'number')}
          <div className="bh-field">
            <p className="gender-legend" id="gender-label">{copy.fields.gender}</p>
            <div className="gender-choice" role="radiogroup" aria-labelledby="gender-label" aria-invalid={errors.gender ? 'true' : undefined} aria-describedby={errors.gender ? 'gender-error' : undefined}>
              {['homme', 'femme'].map((value) => (
                <label key={value}>
                  <input type="radio" name="gender" value={value} checked={values.gender === value} onChange={() => set({ gender: value })} />
                  <span>{copy.genders[value]}</span>
                </label>
              ))}
            </div>
            <p className="bh-error" id="gender-error">{errors.gender || ''}</p>
          </div>
          {input('city')}
          {input('email', 'email')}
          <div className="bh-field">
            <PhoneField
              id="phone"
              label={copy.fields.phone}
              locale={locale}
              t={t}
              country={values.phoneCountry}
              value={values.phone}
              onCountry={(phoneCountry) => set({ phoneCountry })}
              onChange={(event) => {
                const parsed = parsePhone(event.target.value, values.phoneCountry)
                set(parsed?.country ? { phone: parsed.formatNational(), phoneCountry: parsed.country } : { phone: event.target.value })
              }}
              error={Boolean(errors.phone)}
              errorText={errors.phone || ''}
            />
          </div>
          {input('organization')}
          {input('domain')}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="bh-form">
          <p className="bh-hint is-wide">{copy.motivationHint}</p>
          <Field id="motivation" label={copy.fields.motivation} error={errors.motivation}>
            <textarea id="motivation" value={values.motivation} maxLength={2000} onChange={(event) => set({ motivation: event.target.value })} />
          </Field>
          <p className="bh-hint">{copy.contributionHint}</p>
          <Field id="contribution" label={copy.fields.contribution} error={errors.contribution}>
            <textarea id="contribution" value={values.contribution} maxLength={2000} onChange={(event) => set({ contribution: event.target.value })} />
          </Field>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <p className="bh-hint">{copy.squadLead}</p>
          <div className="bh-squads">
            {Object.entries(copy.squadItems).map(([id, item]) => (
              <label key={id}>
                <input type="checkbox" checked={values.squads.includes(id)} onChange={() => toggleSquad(id)} />
                <strong>{item.name}</strong>
                <small>{item.text}</small>
              </label>
            ))}
          </div>
          <p className="bh-error">{errors.squads || ''}</p>
        </div>
      ) : null}

      {step === 3 ? (
        <section className="mission" key={mission} aria-labelledby="mission-title">
          <div className="mission-track" aria-hidden="true">
            {MISSIONS.map((key, index) => (
              <span key={key} className={index === mission ? 'is-on' : index < mission ? 'is-done' : ''} />
            ))}
          </div>
          <p className="mission-index">{copy.missions[mission].index}</p>
          <h2 id="mission-title" className="mission-title">{copy.missions[mission].title}</h2>
          <p className="mission-ask">{copy.missions[mission].question}</p>
          {copy.missions[mission].note ? <p className="mission-note">{copy.missions[mission].note}</p> : null}
          <label className="mission-field" htmlFor="mission-answer">
            <span className="sr-only">{copy.missions[mission].title}</span>
            <textarea
              id="mission-answer"
              value={values[MISSIONS[mission]]}
              maxLength={2000}
              onChange={(event) => set({ [MISSIONS[mission]]: event.target.value })}
            />
          </label>
          <p className="bh-error" role={errors[MISSIONS[mission]] ? 'alert' : undefined}>{errors[MISSIONS[mission]] || ''}</p>
        </section>
      ) : null}

      {step === 4 ? (
        <div>
          <p className="bh-hint">{copy.review}</p>
          <dl className="bh-review">
            {portrait ? (
              <div>
                <dt>{copy.fields.photo}</dt>
                <dd><img className="photo-review" src={portrait.url} alt="" /></dd>
              </div>
            ) : null}
            <div>
              <dt>{copy.fields.firstName}</dt>
              <dd>{values.firstName} {values.lastName} · {copy.genders[values.gender] || ''} · {values.age} · {values.city}</dd>
            </div>
            <div>
              <dt>{copy.fields.email}</dt>
              <dd dir="ltr">{values.email} · {values.phone}</dd>
            </div>
            <div>
              <dt>{copy.fields.organization}</dt>
              <dd>{values.organization} — {values.domain}</dd>
            </div>
            <div>
              <dt>{copy.fields.motivation}</dt>
              <dd>{values.motivation}</dd>
            </div>
            <div>
              <dt>{copy.steps[2]}</dt>
              <dd>{values.squads.map((id) => copy.squadItems[id].name).join(' · ')}</dd>
            </div>
            {copy.missions.map((item, index) => (
              <div key={item.index}>
                <dt>{item.title}</dt>
                <dd>{values[MISSIONS[index]]}</dd>
              </div>
            ))}
          </dl>
          {serverError ? <p className="bh-error" role="alert">{serverError}</p> : null}
        </div>
      ) : null}

      <div className="hero-actions">
        {step > 0 ? (
          <button type="button" className="btn btn-ghost" onClick={back}>
            {copy.back}
          </button>
        ) : null}
        {step < 4 ? (
          <button type="button" className="btn btn-primary" onClick={next}>
            {copy.next}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={send} disabled={status === 'sending'}>
            {status === 'sending' ? copy.sending : copy.submit}
          </button>
        )}
      </div>
      </div>
    </article>
      )}
    </div>
  )
}
