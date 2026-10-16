import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { DEFAULT_COUNTRY, parsePhone } from '../landing/overlays/phone'
import { PhoneField } from '../landing/overlays/PhoneField'
import '../landing/overlays/overlays.css'
import { submitApplication } from './api'
import { A, useCopy, usePageMeta } from './ui'

const DRAFT_KEY = 'brotherhood-join'
const ORDER = [
  { id: 'polo', src: '/media/polo.jpg', alt: 'Polo Brotherhood' },
  { id: 'night', src: '/media/night-gathering.jpg', alt: 'Groupe de nuit' },
  { id: 'safi', src: '/media/safi-heart.jpg', alt: 'Safi vu du ciel' },
  { id: 'beach', src: '/media/beach-fire.jpg', alt: 'Feu de plage' },
]
const OPENINGS = [
  { id: 'screen', src: '/media/screening.jpg', alt: 'Projection' },
  { id: 'warmth', src: '/media/warmth-group.jpg', alt: 'Caravane' },
  { id: 'lantern', src: '/media/lantern-circle.jpg', alt: 'Lanternes' },
]

const empty = () => ({
  firstName: '',
  lastName: '',
  age: '',
  city: '',
  email: '',
  phone: '',
  phoneCountry: DEFAULT_COUNTRY,
  organization: '',
  domain: '',
  motivation: '',
  contribution: '',
  squads: [],
  hook: '',
  caption: '',
  order: [],
  opening: '',
  legend: '',
  resources: [3, 2, 3, 2],
  plan: '',
  logistics: '',
  matches: ['', '', ''],
  pitch: '',
  practical: '',
})

const loadDraft = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
    return saved ? { ...empty(), ...saved, resources: saved.resources?.length === 4 ? saved.resources : empty().resources, matches: saved.matches?.length === 3 ? saved.matches : ['', '', ''] } : empty()
  } catch {
    return empty()
  }
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
  const [values, setValues] = useState(loadDraft)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [serverError, setServerError] = useState('')
  const [reference, setReference] = useState('')
  usePageMeta(`${copy.title} — The Brotherhood`, copy.lead, '/join')

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(values))
  }, [values])

  const set = (patch) => setValues((current) => ({ ...current, ...patch }))

  const validate = (index = step) => {
    const next = {}
    if (index === 0) {
      if (values.firstName.trim().length < 2) next.firstName = copy.required
      if (values.lastName.trim().length < 2) next.lastName = copy.required
      const age = Number(values.age)
      if (!Number.isInteger(age) || age < 13 || age > 99) next.age = copy.invalidAge
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
      if (values.squads.includes('communication') && values.hook.trim().length < 8) next.hook = copy.short
      if (values.squads.includes('design') && values.order.length !== 4) next.order = copy.required
      if (values.squads.includes('photo') && values.legend.trim().length < 8) next.legend = copy.short
      if (values.squads.includes('events')) {
        if (values.resources.reduce((sum, n) => sum + Number(n), 0) !== 10) next.resources = copy.planHint
        if (values.plan.trim().length < 8) next.plan = copy.short
        if (values.logistics.trim().length < 8) next.logistics = copy.short
      }
      if (values.squads.includes('partners')) {
        const unique = new Set(values.matches.filter(Boolean))
        if (unique.size !== 3) next.matches = copy.matchesHint
        if (values.pitch.trim().length < 12) next.pitch = copy.short
      }
    }
    setErrors(next)
    return !Object.keys(next).length
  }

  const next = () => {
    if (!validate()) return
    setStep((value) => Math.min(5, value + 1))
    window.scrollTo(0, 0)
  }

  const toggleSquad = (id) => {
    set({ squads: values.squads.includes(id) ? values.squads.filter((item) => item !== id) : [...values.squads, id] })
  }

  const toggleOrder = (id) => {
    const order = values.order.includes(id) ? values.order.filter((item) => item !== id) : [...values.order, id]
    set({ order })
  }

  const setResource = (index, raw) => {
    const resources = [...values.resources]
    resources[index] = Math.max(0, Math.min(10, Number(raw) || 0))
    set({ resources })
  }

  const setMatch = (index, value) => {
    const matches = [...values.matches]
    matches[index] = value
    set({ matches })
  }

  const send = async () => {
    if (![0, 1, 2, 3].every((index) => validate(index))) {
      setStep(0)
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
        challenges: {
          hook: values.hook,
          caption: values.caption,
          order: values.order,
          opening: values.opening,
          legend: values.legend,
          plan: `${copy.resources.map((label, index) => `${label}: ${values.resources[index]}`).join(' · ')}. ${values.plan}`,
          logistics: values.logistics,
          matches: values.matches.map((need, index) => `${copy.partners[index]} → ${need}`),
          pitch: values.pitch,
        },
      })
      localStorage.removeItem(DRAFT_KEY)
      setReference(saved.id)
      setStatus('saved')
    } catch (error) {
      setStatus('error')
      setServerError(error.status === 429 ? copy.rate : error.status === 503 ? copy.offline : copy.fail)
    }
  }

  if (status === 'saved') {
    return (
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
    )
  }

  const input = (id, type = 'text') => (
    <Field id={id} label={copy.fields[id]} error={errors[id]}>
      <input id={id} name={id} type={type} value={values[id]} autoComplete="on" onChange={(event) => set({ [id]: event.target.value })} />
    </Field>
  )

  return (
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
          {input('firstName')}
          {input('lastName')}
          {input('age', 'number')}
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
        <div>
          <p className="bh-hint">{copy.challengesLead}</p>
          {values.squads.includes('communication') ? (
            <section className="bh-challenge">
              <h3>{copy.hook}</h3>
              <p className="bh-hint">{copy.hookHint}</p>
              <textarea value={values.hook} maxLength={140} onChange={(event) => set({ hook: event.target.value })} />
              <p className="bh-error">{errors.hook || `${values.hook.length}/140`}</p>
              <h3>{copy.caption}</h3>
              <p className="bh-hint">{copy.captionHint}</p>
              <textarea value={values.caption} maxLength={400} onChange={(event) => set({ caption: event.target.value })} />
            </section>
          ) : null}
          {values.squads.includes('design') ? (
            <section className="bh-challenge">
              <h3>{copy.order}</h3>
              <p className="bh-hint">{copy.orderHint}</p>
              <div className="bh-order">
                {ORDER.map((image) => {
                  const place = values.order.indexOf(image.id)
                  return (
                    <button key={image.id} type="button" className={place >= 0 ? 'is-on' : ''} onClick={() => toggleOrder(image.id)} aria-pressed={place >= 0}>
                      <img src={image.src} alt={image.alt} />
                      {place >= 0 ? <i>{place + 1}</i> : null}
                    </button>
                  )
                })}
              </div>
              <p className="bh-error">{errors.order || ''}</p>
            </section>
          ) : null}
          {values.squads.includes('photo') ? (
            <section className="bh-challenge">
              <h3>{copy.legend}</h3>
              <p className="bh-hint">{copy.legendHint}</p>
              <img src="/media/screening.jpg" alt="Projection de plein air Brotherhood" style={{ width: 'min(520px, 100%)', margin: '8px 0 12px' }} />
              <textarea value={values.legend} maxLength={400} onChange={(event) => set({ legend: event.target.value })} />
              <p className="bh-error">{errors.legend || ''}</p>
              <h3>{copy.opening}</h3>
              <div className="bh-order">
                {OPENINGS.map((image) => (
                  <button key={image.id} type="button" className={values.opening === image.id ? 'is-on' : ''} onClick={() => set({ opening: image.id })} aria-pressed={values.opening === image.id}>
                    <img src={image.src} alt={image.alt} />
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {values.squads.includes('events') ? (
            <section className="bh-challenge">
              <h3>{copy.plan}</h3>
              <p className="bh-hint">{copy.planHint}</p>
              <div className="bh-points">
                {copy.resources.map((label, index) => (
                  <label key={label}>
                    {label}
                    <input type="number" min="0" max="10" value={values.resources[index]} onChange={(event) => setResource(index, event.target.value)} />
                  </label>
                ))}
              </div>
              <p className="bh-error">
                {errors.resources || `${copy.points}: ${values.resources.reduce((sum, n) => sum + Number(n), 0)}/10`}
              </p>
              <p className="bh-hint">{copy.planNote}</p>
              <textarea value={values.plan} maxLength={500} onChange={(event) => set({ plan: event.target.value })} />
              <p className="bh-error">{errors.plan || ''}</p>
              <h3>{copy.logistics}</h3>
              <p className="bh-hint">{copy.logisticsHint}</p>
              <textarea value={values.logistics} maxLength={800} onChange={(event) => set({ logistics: event.target.value })} />
              <p className="bh-error">{errors.logistics || ''}</p>
            </section>
          ) : null}
          {values.squads.includes('partners') ? (
            <section className="bh-challenge">
              <h3>{copy.matches}</h3>
              <p className="bh-hint">{copy.matchesHint}</p>
              {copy.partners.map((partner, index) => (
                <label key={partner} className="bh-field" style={{ marginBottom: 10 }}>
                  {partner}
                  <select value={values.matches[index]} onChange={(event) => setMatch(index, event.target.value)}>
                    <option value="">—</option>
                    {copy.needs.map((need) => (
                      <option key={need} value={need} disabled={values.matches.includes(need) && values.matches[index] !== need}>
                        {need}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <p className="bh-error">{errors.matches || ''}</p>
              <h3>{copy.pitch}</h3>
              <p className="bh-hint">{copy.pitchHint}</p>
              <textarea value={values.pitch} maxLength={800} onChange={(event) => set({ pitch: event.target.value })} />
              <p className="bh-error">{errors.pitch || ''}</p>
            </section>
          ) : null}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="bh-form">
          <p className="bh-hint is-wide">{copy.practicalLead}</p>
          <Field id="practical" label={copy.practical} error="">
            <textarea id="practical" value={values.practical} maxLength={2000} onChange={(event) => set({ practical: event.target.value })} />
          </Field>
        </div>
      ) : null}

      {step === 5 ? (
        <div>
          <p className="bh-hint">{copy.review}</p>
          <dl className="bh-review">
            <div>
              <dt>{copy.fields.firstName}</dt>
              <dd>{values.firstName} {values.lastName} · {values.age} · {values.city}</dd>
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
            {values.hook ? <div><dt>{copy.hook}</dt><dd>{values.hook}</dd></div> : null}
            {values.order.length ? <div><dt>{copy.order}</dt><dd>{values.order.join(' → ')}</dd></div> : null}
            {values.legend ? <div><dt>{copy.legend}</dt><dd>{values.legend}</dd></div> : null}
            {values.squads.includes('events') ? <div><dt>{copy.plan}</dt><dd>{values.plan}</dd></div> : null}
            {values.pitch ? <div><dt>{copy.pitch}</dt><dd>{values.pitch}</dd></div> : null}
            {values.practical ? <div><dt>{copy.practical}</dt><dd>{values.practical}</dd></div> : null}
          </dl>
          {serverError ? <p className="bh-error" role="alert">{serverError}</p> : null}
        </div>
      ) : null}

      <div className="hero-actions">
        {step > 0 ? (
          <button type="button" className="btn btn-ghost" onClick={() => setStep((value) => value - 1)}>
            {copy.back}
          </button>
        ) : null}
        {step < 5 ? (
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
  )
}
