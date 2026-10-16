import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { formatClock, formatMoney, relativeTime } from './format'
import { useDialogFocus, useNow } from './hooks'
import { BellIcon, CheckIcon, ChevronIcon, CloseIcon } from './icons'
import { useAdminText } from './strings'

const TOAST_MS = 9000
const MAX_TOASTS = 3

const Summary = ({ item, t, locale }) => (
  <span className="adm-note-meta">
    <span dir="ltr">{formatMoney(item.amount, locale, item.currency)}</span>
    <span>{t(`register.durations.${item.duration}`)}</span>
    <span>{t(`offers.items.${item.offer}.name`)}</span>
  </span>
)

export const NotificationPanel = ({ open, center, onClose, onOpenApplication }) => {
  const a = useAdminText()
  const { t, locale } = useI18n()
  const now = useNow()
  const panelRef = useRef(null)
  useDialogFocus(panelRef, open, onClose)

  return (
    <div className={`adm-notes-root${open ? ' is-open' : ''}`} inert={!open}>
      <div className="adm-drawer-scrim" onClick={onClose} />
      <aside ref={panelRef} className="adm-notes" role="dialog" aria-modal="true" aria-labelledby="adm-notes-title">
        <header className="adm-notes-head">
          <div>
            <h2 id="adm-notes-title">{a('notifications.title')}</h2>
            {center.unread ? <span className="adm-badge is-inline">{center.unread > 99 ? '99+' : center.unread}</span> : null}
          </div>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label={a('notifications.close')} data-autofocus>
            <CloseIcon />
          </button>
        </header>

        <div className="adm-notes-bar">
          <div className="adm-tabs" role="group">
            {['all', 'unread'].map((key) => (
              <button key={key} type="button" aria-pressed={center.filter === key} onClick={() => center.setFilter(key)}>
                {a(`notifications.${key}`)}
              </button>
            ))}
          </div>
          <button type="button" className="adm-link" onClick={center.readAll} disabled={!center.unread}>
            <CheckIcon size={14} />
            {a('notifications.markAll')}
          </button>
        </div>

        <div className="adm-notes-list">
          {!center.loaded ? (
            [0, 1, 2].map((n) => <div key={n} className="adm-ghost is-note" aria-hidden="true" />)
          ) : center.items.length ? (
            <ul>
              {center.items.map((item) => (
                <li key={item.id} className={`adm-note${item.read ? '' : ' is-unread'}`}>
                  <button
                    type="button"
                    className="adm-note-main"
                    onClick={() => {
                      if (!item.read) center.setRead(item.id, true)
                      onOpenApplication(item.registration)
                    }}
                    aria-label={`${a('notifications.open')} — ${item.name}`}
                  >
                    <span className="adm-note-icon" aria-hidden="true">
                      <BellIcon />
                    </span>
                    <span className="adm-note-text">
                      <span className="adm-note-title">{a('notifications.newApplication')}</span>
                      <strong dir="auto">{item.name}</strong>
                      <Summary item={item} t={t} locale={locale} />
                      <time dateTime={item.createdAt}>
                        {relativeTime(item.createdAt, now, locale, a('justNow'))} · {formatClock(item.createdAt, locale)}
                      </time>
                    </span>
                    <ChevronIcon />
                  </button>
                  <button
                    type="button"
                    className="adm-note-toggle"
                    onClick={() => center.setRead(item.id, !item.read)}
                    aria-label={a(item.read ? 'notifications.markUnread' : 'notifications.markRead')}
                    title={a(item.read ? 'notifications.markUnread' : 'notifications.markRead')}
                  >
                    <i aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">{a(center.filter === 'unread' ? 'notifications.emptyUnread' : 'notifications.empty')}</p>
          )}
        </div>
      </aside>
    </div>
  )
}

const Toast = ({ toast, onOpen, onDismiss }) => {
  const a = useAdminText()
  const { t, locale } = useI18n()
  const [paused, setPaused] = useState(false)
  const { notification: item } = toast

  useEffect(() => {
    if (paused) return undefined
    const id = setTimeout(() => onDismiss(toast.id), TOAST_MS)
    return () => clearTimeout(id)
  }, [paused, toast.id, onDismiss])

  return (
    <li
      className={`adm-toast${paused ? ' is-paused' : ''}`}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{ '--toast-ms': `${TOAST_MS}ms` }}
    >
      <span className="adm-note-icon is-live" aria-hidden="true">
        <BellIcon />
      </span>
      <div className="adm-toast-text">
        <p className="adm-note-title">{a('notifications.newApplication')}</p>
        <strong dir="auto">{item.name}</strong>
        <Summary item={item} t={t} locale={locale} />
        <time dateTime={item.createdAt}>{formatClock(item.createdAt, locale)}</time>
        <div className="adm-toast-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpen(toast)}>
            <span>{a('toast.open')}</span>
          </button>
          <button type="button" className="adm-link" onClick={() => onDismiss(toast.id)}>
            {a('toast.dismiss')}
          </button>
        </div>
      </div>
      <button type="button" className="adm-toast-close" onClick={() => onDismiss(toast.id)} aria-label={a('toast.dismiss')}>
        <CloseIcon size={14} />
      </button>
      <span className="adm-toast-timer" aria-hidden="true" />
    </li>
  )
}

export const Toasts = ({ toasts, onOpen, onDismiss }) => (
  <ol className="adm-toasts" aria-live="polite" aria-relevant="additions">
    {toasts.slice(0, MAX_TOASTS).map((toast) => (
      <Toast key={toast.id} toast={toast} onOpen={onOpen} onDismiss={onDismiss} />
    ))}
  </ol>
)
