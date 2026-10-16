import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { formatDateTime, formatMoney, fullName } from './format'
import { CheckIcon, CloseIcon, CopyIcon, MailIcon, WhatsAppIcon } from './icons'
import { useDialogFocus } from './hooks'
import { Avatar, ErrorState, StatusPill } from './parts'
import { useAdminText } from './strings'
import { confirmationMessage, messageLocale, openWhatsApp, whatsappUrl } from './whatsapp'

const ACTION_STYLE = { approved: 'btn-primary', active: 'btn-primary', completed: 'btn-primary', rejected: 'adm-btn-danger', pending: 'btn-ghost' }
const ACTION_ORDER = ['approved', 'active', 'completed', 'pending', 'rejected']
const CONFIRMED = ['approved', 'active']

const WhatsAppConfirm = ({ item, notice }) => {
  const a = useAdminText()
  const initial = confirmationMessage(item)
  const [draft, setDraft] = useState(null)
  const [copied, setCopied] = useState(false)
  const message = draft ?? initial

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
          <div className="adm-actions">
            <a className="btn btn-sm btn-primary adm-wa-send" href={whatsappUrl(item.phone, message)} target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon />
              <span>{a('whatsapp.send')}</span>
            </a>
            <button type="button" className="btn btn-sm btn-ghost" onClick={copy}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span>{a(copied ? 'whatsapp.copied' : 'whatsapp.copy')}</span>
            </button>
          </div>
          {notice ? (
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
  const [closing, setClosing] = useState(false)
  const [attempt, setAttempt] = useState(0)

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
      if (status === 'approved' && data.item.phone) setWaNotice(openWhatsApp(data.item.phone, confirmationMessage(data.item)) ? 'opened' : 'blocked')
      else setWaNotice('')
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

  const actions = ACTION_ORDER.filter((status) => state.transitions.includes(status))

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
            <section className="adm-profile">
              <Avatar item={item} size="lg" />
              <div>
                <h2 id="adm-drawer-title" dir="auto">
                  {fullName(item)}
                </h2>
                <p dir="auto">{item.city}</p>
              </div>
              <StatusPill status={item.status} />
            </section>

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

            {CONFIRMED.includes(item.status) ? <WhatsAppConfirm key={item.id} item={item} notice={waNotice} /> : null}

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
    </div>
  )
}
