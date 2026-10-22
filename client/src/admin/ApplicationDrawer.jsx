import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { formatDateTime, formatMoney, fullName } from './format'
import { CheckIcon, CloseIcon, CopyIcon, MailIcon, WhatsAppIcon } from './icons'
import { useDialogFocus } from './hooks'
import { Avatar, ErrorState, StatusPill } from './parts'
import { useAdminText } from './strings'
import { FinalizePanel } from './FinalizePanel'
import { WhatsAppMessageModal } from './WhatsAppMessageModal'
import { confirmationMessage, isWhatsAppEligible, messageLocale, openWhatsApp } from './whatsapp'

const ACTION_STYLE = {
  new: 'btn-ghost',
  pending: 'btn-ghost',
  review: 'btn-ghost',
  accepted: 'btn-primary',
  approved: 'btn-primary',
  finalizing: 'btn-ghost',
  payment_review: 'btn-ghost',
  active: 'btn-primary',
  completed: 'btn-primary',
  rejected: 'adm-btn-danger',
}

const MISSIONS = ['asfi', 'fund', 'responsibility']
const LEGACY = {
  hook: 'Écrire le hook d’un Reel',
  caption: 'Légende du post',
  order: 'Mettre quatre images dans un ordre',
  legend: 'Écrire la légende de cette image',
  opening: 'Quelle image ouvre le récit ?',
  plan: 'Répartir 10 moyens',
  logistics: 'Un imprévu',
  matches: 'Associer un appui à un projet',
  pitch: 'Le message au partenaire',
}

const answerText = (value) => (Array.isArray(value) ? value.join(' · ') : String(value))

const MembershipFile = ({ item, onChanged }) => {
  const a = useAdminText()
  const [notes, setNotes] = useState(item.notes || '')
  const [state, setState] = useState('')
  const save = async () => {
    setState('saving')
    try {
      await adminApi.setNotes(item.id, notes)
      setState('saved')
      onChanged()
    } catch {
      setState('error')
    }
  }
  const challenges = item.challenges || {}
  const extras = Object.entries(challenges).filter(([key, value]) => !MISSIONS.includes(key) && value && (typeof value === 'string' ? value.trim() : value.length))
  return (
    <>
      <section className="adm-block">
        <h3>{a('detail.answers')}</h3>
        <div className="bh-answers">
          <article>
            <p className="bh-q">{a('detail.motivation')}</p>
            <p className="bh-a">{item.motivation || a('detail.noEmail')}</p>
          </article>
          <article>
            <p className="bh-q">{a('detail.contribution')}</p>
            <p className="bh-a">{item.contribution || a('detail.noEmail')}</p>
          </article>
          {MISSIONS.filter((key) => challenges[key]).map((key) => (
            <article key={key}>
              <p className="bh-kicker">{a(`detail.missionTitles.${key}`)}</p>
              <p className="bh-q">{a(`detail.missions.${key}`)}</p>
              <p className="bh-a">{answerText(challenges[key])}</p>
            </article>
          ))}
          {extras.map(([key, value]) => (
            <article key={key}>
              <p className="bh-q">{LEGACY[key] || key}</p>
              <p className="bh-a">{answerText(value)}</p>
            </article>
          ))}
          {item.practical ? (
            <article>
              <p className="bh-q">Note libre</p>
              <p className="bh-a">{item.practical}</p>
            </article>
          ) : null}
        </div>
      </section>
      <section className="adm-block">
        <label className="adm-wa-label" htmlFor="adm-notes">
          Notes de lecture
        </label>
        <textarea id="adm-notes" className="adm-wa-message" rows={4} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
        <div className="adm-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={save} disabled={state === 'saving'}>
            {state === 'saving' ? '…' : 'Enregistrer la note'}
          </button>
        </div>
        {state === 'saved' ? <p role="status">Note enregistrée.</p> : null}
        {state === 'error' ? (
          <p role="alert" className="adm-alert">
            La note n’a pas été enregistrée.
          </p>
        ) : null}
      </section>
    </>
  )
}
const ACTION_ORDER = ['approved', 'active', 'completed', 'pending', 'rejected']
const CONFIRMED = ['approved', 'accepted', 'finalizing', 'payment_review', 'active']

const WhatsAppConfirm = ({ item, notice }) => {
  const a = useAdminText()
  const initial = confirmationMessage(item)
  const [draft, setDraft] = useState(null)
  const [copied, setCopied] = useState(false)
  const message = draft ?? item.whatsapp?.body ?? initial
  const [local, setLocal] = useState('')

  const prepare = (force = false) => {
    if (item.whatsapp?.openedAt && !force) {
      setLocal('already')
      return
    }
    const opened = openWhatsApp(item.phone, message)
    setLocal(opened ? 'opened' : 'blocked')
    adminApi.openWhatsApp(item.id, message, force || Boolean(item.whatsapp?.openedAt)).catch(() => {})
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <section className="adm-block adm-wa" aria-labelledby="adm-wa-title">
      <h3 id="adm-wa-title">{a('whatsapp.title')}</h3>
      {item.phone ? (
        <>
          <p className="adm-wa-to">
            <span className="adm-wa-badge" aria-hidden="true">
              <WhatsAppIcon size={18} />
            </span>
            <span>
              <small>{a('whatsapp.to')}</small>
              <strong dir="ltr">{item.phone}</strong>
            </span>
          </p>
          <label className="adm-wa-label" htmlFor="adm-wa-message">
            {a('whatsapp.message')}
          </label>
          <textarea
            id="adm-wa-message"
            className="adm-wa-message"
            dir={messageLocale(item) === 'ar' ? 'rtl' : 'ltr'}
            rows={9}
            maxLength={1500}
            value={message}
            onChange={(event) => setDraft(event.target.value)}
          />
          <p className="adm-wa-hint">
            <span>{a('whatsapp.language', { language: a(`detail.languages.${messageLocale(item)}`) })}</span>
            {draft !== null && draft !== initial ? (
              <button type="button" className="adm-link" onClick={() => setDraft(null)}>
                {a('whatsapp.restore')}
              </button>
            ) : null}
          </p>
          {item.whatsapp?.openedAt ? (
            <p className="adm-wa-hint">Message déjà préparé {item.whatsapp.actor ? `par ${item.whatsapp.actor}` : ''}. Un second envoi doit être confirmé.</p>
          ) : (
            <p className="adm-wa-hint">Le bouton ouvre WhatsApp avec ce texte. L’envoi se confirme dans WhatsApp, pas ici.</p>
          )}
          <div className="adm-actions">
            <button type="button" className="btn btn-sm btn-primary adm-wa-send" onClick={() => prepare(local === 'already')}>
              <WhatsAppIcon />
              <span>{local === 'already' ? 'Confirmer et ouvrir' : a('whatsapp.send')}</span>
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={copy}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span>{a(copied ? 'whatsapp.copied' : 'whatsapp.copy')}</span>
            </button>
          </div>
          {local === 'already' ? <p className="adm-wa-notice" role="status">Ce message a déjà été préparé. Confirme pour l’ouvrir encore.</p> : null}
          {local && local !== 'already' ? (
            <p className={`adm-wa-notice is-${local}`} role="status">
              {a(`whatsapp.${local}`)}
            </p>
          ) : null}
          {notice && !local ? (
            <p className={`adm-wa-notice is-${notice}`} role="status">
              {a(`whatsapp.${notice}`)}
            </p>
          ) : null}
        </>
      ) : (
        <p className="adm-muted">{a('whatsapp.noPhone')}</p>
      )}
    </section>
  )
}

export const ApplicationDrawer = ({ id, version, onClose, onChanged }) => {
  const a = useAdminText()
  const { t, locale } = useI18n()
  const panelRef = useRef(null)
  const [state, setState] = useState({ id: null, item: null, transitions: [], error: null })
  const [pending, setPending] = useState('')
  const [actionError, setActionError] = useState('')
  const [copied, setCopied] = useState(false)
  const [waNotice, setWaNotice] = useState('')
  const [waModal, setWaModal] = useState(false)
  const [groupLink, setGroupLink] = useState('')
  const [closing, setClosing] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .whatsappDefaults(controller.signal)
      .then((data) => setGroupLink(data.whatsappGroupUrl || ''))
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const close = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260)
  }

  useDialogFocus(panelRef, true, close)

  useEffect(() => {
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .application(id, controller.signal)
      .then((data) => setState({ id, item: data.item, transitions: data.transitions, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((prev) => ({ ...prev, id, error }))
      })
    return () => controller.abort()
  }, [id, version, attempt])

  useEffect(() => {
    setActionError('')
    setCopied(false)
    setWaNotice('')
  }, [id])

  const item = state.id === id ? state.item : null
  const error = state.id === id ? state.error : null

  const apply = async (status) => {
    setPending(status)
    setActionError('')
    try {
      const data = await adminApi.setStatus(id, status)
      setState({ id, item: data.item, transitions: data.transitions, error: null })
      // Still inside the click's user activation, so the browser lets the new tab open.
      setWaNotice('')
      onChanged()
    } catch (err) {
      setActionError(a(err.status === 409 ? 'detail.conflict' : 'detail.error'))
    } finally {
      setPending('')
    }
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(item.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  const actions = ACTION_ORDER.filter((status) => {
    if (!state.transitions.includes(status)) return false
    // Membership activation goes through payment confirmation, not the decision buttons.
    if (item?.kind === 'membership' && status === 'active') return false
    if (item?.kind === 'membership' && status === 'finalizing') return false
    return true
  })

  return (
    <div className={`adm-drawer-root${closing ? ' is-closing' : ''}`}>
      <div className="adm-drawer-scrim" onClick={close} aria-hidden="true" />
      <aside ref={panelRef} className="adm-drawer" role="dialog" aria-modal="true" aria-labelledby="adm-drawer-title">
        <header className="adm-drawer-head">
          <p className="kicker">{a('detail.kicker')}</p>
          <button type="button" className="adm-icon-btn adm-drawer-close" onClick={close} aria-label={a('detail.close')} data-autofocus>
            <CloseIcon />
          </button>
        </header>

        {error && !item ? (
          error.status === 404 ? (
            <p className="adm-empty">{a('detail.notFound')}</p>
          ) : (
            <ErrorState error={error} onRetry={() => setAttempt((n) => n + 1)} />
          )
        ) : !item ? (
          <div className="adm-drawer-body" aria-hidden="true">
            <div className="adm-ghost is-hero" />
            <div className="adm-ghost is-block" />
            <div className="adm-ghost is-block" />
          </div>
        ) : (
          <div className="adm-drawer-body" key={item.id}>
            <section className="bh-profile">
              <div className="bh-profile-cover" aria-hidden="true" />
              <div className="bh-profile-id">
                <Avatar item={item} size="xl" viewable />
                <div>
                  <h2 id="adm-drawer-title" dir="auto">
                    {fullName(item)}
                  </h2>
                  <p dir="auto">{[item.gender ? a(`genders.${item.gender}`) : null, item.city].filter(Boolean).join(' · ')}</p>
                  <p>{formatDateTime(item.createdAt, locale)}</p>
                </div>
                <div className="bh-profile-status">
                  <span>{a('detail.stage')}</span>
                  <StatusPill status={item.status} />
                </div>
              </div>
            </section>

            {item.kind === 'membership' ? (
              <MembershipFile item={item} onChanged={onChanged} />
            ) : (
              <section className="adm-invest">
                <p className="adm-invest-label">{a('detail.investment')}</p>
                <p className="adm-invest-amount" dir="ltr">
                  {formatMoney(item.amount, locale, item.currency)}
                </p>
                <dl className="adm-invest-meta">
                  <div>
                    <dt>{a('detail.offer')}</dt>
                    <dd>{t(`offers.items.${item.offer}.name`)}</dd>
                  </div>
                  <div>
                    <dt>{a('detail.duration')}</dt>
                    <dd>{t(`register.durations.${item.duration}`)}</dd>
                  </div>
                </dl>
              </section>
            )}

            <section className="adm-block">
              <h3>{a('detail.decision')}</h3>
              {actions.length ? (
                <div className="adm-actions">
                  {actions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`btn btn-sm ${ACTION_STYLE[status]}`}
                      disabled={Boolean(pending)}
                      onClick={() => apply(status)}
                    >
                      {pending === status ? <i className="adm-spinner" aria-hidden="true" /> : status === 'approved' ? <CheckIcon /> : null}
                      <span>{pending === status ? a('detail.updating') : a(`actions.${status}`)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="adm-muted">{a('detail.noActions')}</p>
              )}
              {actionError ? (
                <p className="adm-alert" role="alert">
                  {actionError}
                </p>
              ) : null}
            </section>

            {['approved', 'finalizing', 'payment_review', 'active'].includes(item.status) ? (
              <FinalizePanel
                item={item}
                onUpdated={(data) => {
                  setState({ id, item: data.item, transitions: data.transitions, error: null })
                  onChanged()
                }}
              />
            ) : null}

            {CONFIRMED.includes(item.status) && item.kind !== 'membership' ? (
              <WhatsAppConfirm key={item.id} item={item} notice={waNotice} />
            ) : null}

            {isWhatsAppEligible(item) ? (
              <section className="adm-block adm-wa" aria-labelledby="adm-wa-approved-title">
                <h3 id="adm-wa-approved-title">{a('whatsapp.modalTitle')}</h3>
                <p className="adm-muted">{a('whatsapp.drawerLead')}</p>
                <div className="adm-actions">
                  <button type="button" className="btn btn-sm btn-primary adm-wa-send" onClick={() => setWaModal(true)}>
                    <WhatsAppIcon />
                    <span>{a('whatsapp.sendAction')}</span>
                  </button>
                </div>
              </section>
            ) : null}

            <section className="adm-block">
              <h3>{a('detail.identity')}</h3>
              <dl className="adm-facts">
                <div>
                  <dt>{a('detail.firstName')}</dt>
                  <dd dir="auto">{item.firstName}</dd>
                </div>
                <div>
                  <dt>{a('detail.lastName')}</dt>
                  <dd dir="auto">{item.lastName}</dd>
                </div>
                <div>
                  <dt>{a('detail.city')}</dt>
                  <dd dir="auto">{item.city}</dd>
                </div>
                <div>
                  <dt>{a('detail.gender')}</dt>
                  <dd>{item.gender ? a(`genders.${item.gender}`) : a('detail.noEmail')}</dd>
                </div>
                {item.age ? (
                  <div>
                    <dt>{a('detail.age')}</dt>
                    <dd>{item.age}</dd>
                  </div>
                ) : null}
                {item.organization ? (
                  <div className="is-wide">
                    <dt>{a('detail.organization')}</dt>
                    <dd dir="auto">{item.organization}</dd>
                  </div>
                ) : null}
                {item.domain ? (
                  <div className="is-wide">
                    <dt>{a('detail.domain')}</dt>
                    <dd dir="auto">{item.domain}</dd>
                  </div>
                ) : null}
                {item.squads?.length ? (
                  <div className="is-wide">
                    <dt>{a('detail.squads')}</dt>
                    <dd className="bh-squads">
                      {item.squads.map((id) => (
                        <span key={id}>{a(`squads.${id}`)}</span>
                      ))}
                    </dd>
                  </div>
                ) : null}
                <div className="is-wide">
                  <dt>{a('detail.email')}</dt>
                  <dd>
                    {item.email ? (
                      <span className="adm-email">
                        <a href={`mailto:${item.email}`} dir="ltr">
                          {item.email}
                        </a>
                        <button type="button" className="adm-icon-btn is-sm" onClick={copyEmail} aria-label={a('detail.copy')} title={a('detail.copy')}>
                          {copied ? <CheckIcon /> : <CopyIcon />}
                        </button>
                        <a className="adm-icon-btn is-sm" href={`mailto:${item.email}`} aria-label={a('detail.write')} title={a('detail.write')}>
                          <MailIcon />
                        </a>
                        <span className="sr-only" role="status">
                          {copied ? a('detail.copied') : ''}
                        </span>
                      </span>
                    ) : (
                      <span className="adm-muted">{a('detail.noEmail')}</span>
                    )}
                  </dd>
                </div>
                <div className="is-wide">
                  <dt>{a('detail.phone')}</dt>
                  <dd>
                    {item.phone ? (
                      <span className="adm-email">
                        <a href={`https://wa.me/${item.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" dir="ltr">
                          {item.phone}
                        </a>
                      </span>
                    ) : (
                      <span className="adm-muted">{a('detail.noEmail')}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{a('detail.submitted')}</dt>
                  <dd>{formatDateTime(item.createdAt, locale)}</dd>
                </div>
                <div>
                  <dt>{a('detail.locale')}</dt>
                  <dd>{a(`detail.languages.${item.locale}`)}</dd>
                </div>
                <div className="is-wide">
                  <dt>{a('detail.reference')}</dt>
                  <dd className="adm-ref" dir="ltr">
                    {item.id}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="adm-block">
              <h3>{a('detail.timeline')}</h3>
              <ol className="adm-timeline">
                {[...item.history].reverse().map((entry) => (
                  <li key={`${entry.at}-${entry.status}`} className={`is-${entry.status}`}>
                    <span className="adm-timeline-dot" aria-hidden="true" />
                    <p>
                      <StatusPill status={entry.from} />
                      <span className="adm-timeline-arrow" aria-hidden="true">
                        →
                      </span>
                      <StatusPill status={entry.status} />
                    </p>
                    <time dateTime={entry.at}>{formatDateTime(entry.at, locale)}</time>
                  </li>
                ))}
                <li className="is-received">
                  <span className="adm-timeline-dot" aria-hidden="true" />
                  <p>{a('detail.received')}</p>
                  <time dateTime={item.createdAt}>{formatDateTime(item.createdAt, locale)}</time>
                </li>
              </ol>
            </section>
          </div>
        )}
      </aside>

      {waModal && item ? (
        <WhatsAppMessageModal
          items={[item]}
          initialGroupLink={groupLink}
          canSaveLink
          onClose={() => setWaModal(false)}
          onPrepared={(updated) => {
            setState((prev) => ({ ...prev, item: { ...prev.item, ...updated } }))
            onChanged()
          }}
        />
      ) : null}
    </div>
  )
}
