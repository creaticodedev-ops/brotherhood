import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { ArrowIcon } from '../landing/ui'
import { adminApi } from './api'
import { AuthLayout, PasswordField } from './AuthLayout'
import { CheckIcon } from './icons'
import { useAdminText } from './strings'

const SubmitButton = ({ busy, label, busyLabel, disabled, className = 'btn-primary' }) => (
  <button type="submit" className={`btn ${className} btn-block adm-login-submit`} disabled={disabled || busy}>
    <span>{busy ? busyLabel : label}</span>
    {busy ? <i className="adm-spinner" aria-hidden="true" /> : <ArrowIcon />}
  </button>
)

/** Sign-in screen, with the "forgot password" request in the same card (`mode`: login, forgot, sent). */
export const Login = ({ configured, onSuccess, initialMode = 'login' }) => {
  const a = useAdminText()
  const { locale } = useI18n()
  const [mode, setMode] = useState(initialMode)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(null)

  const switchTo = (next) => {
    setMode(next)
    setError('')
    setStatus('idle')
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!password || status === 'sending') return
    setStatus('sending')
    setError('')
    try {
      await adminApi.login(password)
      onSuccess()
    } catch (err) {
      setStatus('idle')
      setError(a(err.status === 401 ? 'login.errors.invalid' : err.status === 429 ? 'login.errors.rate' : 'login.errors.server'))
    }
  }

  const requestLink = async (event) => {
    event.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setError('')
    try {
      setSent(await adminApi.forgotPassword(locale))
      switchTo('sent')
    } catch (err) {
      setStatus('idle')
      setError(a(err.status === 429 ? 'forgot.errors.rate' : 'forgot.errors.server'))
    }
  }

  if (configured && mode === 'forgot') {
    return (
      <AuthLayout titleId="adm-login-title" kicker={a('forgot.kicker')} title={a('forgot.title')} lead={a('forgot.lead')} foot={a('login.secure')}>
        <form className="adm-login-form adm-login-step" onSubmit={requestLink} noValidate>
          {error ? (
            <p className="adm-alert" role="alert">
              {error}
            </p>
          ) : null}
          <SubmitButton busy={status === 'sending'} label={a('forgot.submit')} busyLabel={a('forgot.sending')} />
          <button type="button" className="adm-login-alt" onClick={() => switchTo('login')}>
            {a('forgot.back')}
          </button>
        </form>
      </AuthLayout>
    )
  }

  if (configured && mode === 'sent' && sent) {
    return (
      <AuthLayout titleId="adm-login-title" kicker={a('forgot.kicker')} title={a('forgot.sentTitle')} seal={<CheckIcon size={20} />} foot={a('login.secure')}>
        <div className="adm-login-form adm-login-step">
          <p className="adm-login-note" role="status">
            {a(sent.channel === 'email' ? 'forgot.sentEmail' : 'forgot.sentConsole', { minutes: sent.minutes })}
          </p>
          <button type="button" className="btn btn-ghost btn-block adm-login-submit" onClick={() => switchTo('login')}>
            <span>{a('forgot.back')}</span>
            <ArrowIcon />
          </button>
          <button type="button" className="adm-login-alt" onClick={() => switchTo('forgot')}>
            {a('forgot.resend')}
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout titleId="adm-login-title" kicker={a('login.kicker')} title={a('login.title')} lead={a('login.lead')} foot={a('login.secure')}>
      {configured ? (
        <form className="adm-login-form" onSubmit={onSubmit} noValidate>
          <PasswordField
            id="adm-password"
            label={a('login.password')}
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={error}
            autoFocus
          />
          <SubmitButton busy={status === 'sending'} label={a('login.submit')} busyLabel={a('login.checking')} disabled={!password} />
          <button type="button" className="adm-login-alt" onClick={() => switchTo('forgot')}>
            {a('login.forgot')}
          </button>
        </form>
      ) : (
        <div className="adm-login-setup" role="alert">
          <strong>{a('login.setup.title')}</strong>
          <p>{a('login.setup.text')}</p>
        </div>
      )}
    </AuthLayout>
  )
}
