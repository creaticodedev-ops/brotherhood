import { useState } from 'react'
import { LangSwitch, Logo } from '../landing/ui'
import { LockIcon } from './icons'
import { useAdminText } from './strings'

/** Shell shared by the sign-in, forgotten password and reset screens. */
export const AuthLayout = ({ titleId, kicker, title, lead, seal = <LockIcon />, foot, children }) => {
  const a = useAdminText()
  return (
    <main className="adm-login">
      <div className="adm-login-grid" aria-hidden="true" />
      <header className="adm-login-top">
        <a href="/" className="adm-login-logo" aria-label={a('login.back')}>
          <Logo eager />
        </a>
        <LangSwitch />
      </header>

      <section className="adm-login-card" aria-labelledby={titleId}>
        <span className="adm-login-seal" aria-hidden="true">
          {seal}
        </span>
        <p className="kicker">{kicker}</p>
        <h1 id={titleId} className="adm-login-title">
          {title}
        </h1>
        {lead ? <p className="adm-login-lead">{lead}</p> : null}
        {children}
        {foot ? <p className="adm-login-foot">{foot}</p> : null}
      </section>
    </main>
  )
}

export const PasswordField = ({ id, label, value, onChange, error, autoComplete, autoFocus = false, describedBy, children }) => {
  const a = useAdminText()
  const [visible, setVisible] = useState(false)
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field-control">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          dir="ltr"
          maxLength={128}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[`${id}-error`, describedBy].filter(Boolean).join(' ')}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="adm-reveal"
          onClick={() => setVisible((shown) => !shown)}
          aria-pressed={visible}
          aria-label={a(visible ? 'login.hide' : 'login.show')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M1.5 9S4.2 3.75 9 3.75 16.5 9 16.5 9 13.8 14.25 9 14.25 1.5 9 1.5 9z" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.3" />
            {visible ? null : <path d="M3 15L15 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />}
          </svg>
        </button>
      </div>
      {children}
      <p className="field-error" id={`${id}-error`} role="alert">
        {error}
      </p>
    </div>
  )
}
