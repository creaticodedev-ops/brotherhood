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

export const Avatar = ({ item, size = 'md' }) => (
  <span className={`adm-avatar is-${size}`} aria-hidden="true">
    {initials(item.firstName, item.lastName)}
  </span>
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
