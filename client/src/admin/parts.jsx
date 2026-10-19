import { useState } from 'react'
import { initials } from './format'
import { useAdminText } from './strings'

export const StatusPill = ({ status }) => {
  const a = useAdminText()
  return (
    <span className={`adm-pill is-${status}`}>
      <i aria-hidden="true" />
      {a(`statuses.${status}`)}
    </span>
  )
}

export const Avatar = ({ item, size = 'md' }) => {
  const [failed, setFailed] = useState(false)
  const photo = Boolean(item.photo) && !failed
  return (
    <span className={`adm-avatar is-${size}${photo ? ' has-photo' : ''}`} aria-hidden="true">
      {photo ? <img src={`/api/admin/registrations/${item.id}/photo`} alt="" onError={() => setFailed(true)} /> : initials(item.firstName, item.lastName)}
    </span>
  )
}

export const LoadingState = ({ label, rows = 3 }) => (
  <div className="adm-loading" role="status" aria-live="polite">
    <span className="sr-only">{label}</span>
    <div className="adm-loading-head" aria-hidden="true">
      <i />
      <i />
    </div>
    {Array.from({ length: rows }, (_, index) => (
      <i key={index} className="adm-loading-row" aria-hidden="true" style={{ '--i': index }} />
    ))}
  </div>
)

export const ErrorState = ({ error, onRetry }) => {
  const a = useAdminText()
  return (
    <div className="adm-error" role="alert">
      <p>{a(error?.status === 503 ? 'errors.db' : 'errors.load')}</p>
      {onRetry ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          <span>{a('errors.retry')}</span>
        </button>
      ) : null}
    </div>
  )
}
