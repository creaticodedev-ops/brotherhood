import { useState } from 'react'
import { fullName, initials } from './format'
import { EyeIcon } from './icons'
import { PhotoViewer } from './PhotoViewer'
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

/** With `viewable`, a photo that loads becomes a button opening the full-size viewer; without one, initials stay as the placeholder. */
export const Avatar = ({ item, size = 'md', viewable = false }) => {
  const a = useAdminText()
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const photo = Boolean(item.photo) && !failed
  const src = `/api/admin/registrations/${item.id}/photo`
  const name = fullName(item)
  const face = (
    <span className={`adm-avatar is-${size}${photo ? ' has-photo' : ''}`} aria-hidden="true">
      {photo ? <img src={src} alt="" onError={() => setFailed(true)} /> : initials(item.firstName, item.lastName)}
    </span>
  )
  if (!viewable) return face
  if (!photo) {
    return (
      <span className={`adm-avatar-slot is-${size}`} role="img" aria-label={a('photo.none')} title={a('photo.none')}>
        {face}
      </span>
    )
  }
  return (
    <>
      <button
        type="button"
        className={`adm-avatar-view is-${size}`}
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
        aria-label={a('photo.view', { name })}
        aria-haspopup="dialog"
        title={a('photo.view', { name })}
      >
        {face}
        <span className="adm-avatar-eye" aria-hidden="true">
          <EyeIcon size={size === 'xl' ? 16 : 12} />
        </span>
      </button>
      {open ? <PhotoViewer src={src} name={name} onClose={() => setOpen(false)} /> : null}
    </>
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
