import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { relativeTime } from './format'
import { ErrorState } from './parts'

export const AuditDesk = () => {
  const { locale } = useI18n()
  const [q, setQ] = useState('')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  const load = () => adminApi.audit(q).then((data) => setItems(data.items)).catch(setError)

  useEffect(() => {
    load()
  }, [q])

  if (error) return <ErrorState error={error} onRetry={load} />

  return (
    <div className="adm-view">
      <header className="adm-view-head">
        <div>
          <p className="kicker">Journal</p>
          <h1 className="adm-title">Responsabilité</h1>
          <p className="adm-lead">Qui a fait quoi. Aucun mot de passe n’est écrit ici.</p>
        </div>
      </header>
      <label className="cmd-search">
        <span>Filtrer</span>
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Action, personne, détail" />
      </label>
      <ul className="cmd-list">
        {(items || []).map((event) => (
          <li key={event.id}>
            <span>
              {event.actor || 'Admin'} · {event.action}
              <small>{event.detail} {event.targetId ? `· ${event.target} ${event.targetId}` : ''}</small>
            </span>
            <time>{relativeTime(event.createdAt, locale)}</time>
          </li>
        ))}
        {items && !items.length ? <li>Aucune entrée.</li> : null}
      </ul>
    </div>
  )
}
