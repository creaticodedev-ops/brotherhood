import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { ArrowIcon } from '../landing/ui'
import { adminApi } from './api'
import { AuthLayout, PasswordField } from './AuthLayout'
import { formatClock } from './format'
import { CheckIcon } from './icons'
import { PasswordRules, Strength } from './PasswordStrength'
import { problemOf } from './passwordRules'
import { useAdminText } from './strings'

const readToken = () => new URLSearchParams(window.location.hash.slice(1)).get('token') || ''

/** Opened from the reset link: `/admin/reset#token=…` (the fragment never reaches the server logs). */
export const ResetPassword = ({ onDone, onRequestNew }) => {
  const a = useAdminText()
  const { locale } = useI18n()
  const [token] = useState(readToken)
  const [phase, setPhase] = useState(() => (token ? 'checking' : 'invalid'))
  const [expiresAt, setExpiresAt] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState('')
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  useEffect(() => {
    if (!token) return undefined
    let cancelled = false
    adminApi
      .verifyReset(token)
      .then((data) => {
        if (cancelled) return
        setExpiresAt(data.expiresAt)
        setPhase('form')
      })
      .catch((err) => {
        if (cancelled) return
        if (err.status === 410) return setPhase(err.body?.error === 'expired' ? 'expired' : 'invalid')
        setFailure(err.status === 429 ? 'rate' : 'server')
        setPhase('error')
      })
    return () => {
      cancelled = true
    }
  }, [token, attempt])

  const onSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    const found = {}
    const problem = problemOf(password)
    if (problem) found.password = problem
    if (confirm !== password) found.confirm = 'mismatch'
    setErrors(found)
    setFailure('')
    if (Object.keys(found).length) {
      event.currentTarget.querySelector(found.password ? '#adm-new-password' : '#adm-confirm-password')?.focus()
      return
    }
    setSaving(true)
    try {
      await adminApi.resetPassword(token, password, confirm)
      setPhase('done')
    } catch (err) {
      if (err.status === 422 && err.body?.fields) setErrors(err.body.fields)
      else if (err.status === 410) setPhase(err.body?.error === 'expired' ? 'expired' : 'invalid')
      else setFailure(err.status === 429 ? 'rate' : 'server')
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (key) => (errors[key] ? a(`reset.errors.${errors[key]}`) : '')

  if (phase === 'done') {
    return (
      <AuthLayout titleId="adm-reset-title" kicker={a('reset.kicker')} title={a('reset.doneTitle')} lead={a('reset.done')} seal={<CheckIcon size={20} />}>
        <div className="adm-login-form adm-login-step">
          <button type="button" className="btn btn-primary btn-block adm-login-submit" onClick={() => onDone(true)} autoFocus>
            <span>{a('reset.signIn')}</span>
            <ArrowIcon />
          </button>
        </div>
      </AuthLayout>
    )
  }

  if (phase === 'invalid' || phase === 'expired') {
    return (
      <AuthLayout titleId="adm-reset-title" kicker={a('reset.kicker')} title={a(`reset.${phase}Title`)} lead={a(`reset.${phase}`)}>
        <div className="adm-login-form adm-login-step">
          <button type="button" className="btn btn-primary btn-block adm-login-submit" onClick={onRequestNew}>
            <span>{a('reset.request')}</span>
            <ArrowIcon />
          </button>
          <button type="button" className="adm-login-alt" onClick={() => onDone(false)}>
            {a('forgot.back')}
          </button>
        </div>
      </AuthLayout>
    )
  }

  if (phase !== 'form') {
    return (
      <AuthLayout titleId="adm-reset-title" kicker={a('reset.kicker')} title={a('reset.title')}>
        <div className="adm-login-form adm-login-step">
          {phase === 'checking' ? (
            <p className="adm-login-checking" role="status">
              <i className="adm-spinner" aria-hidden="true" />
              {a('reset.checking')}
            </p>
          ) : (
            <>
              <p className="adm-alert" role="alert">
                {a(`reset.errors.${failure}`)}
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-block adm-login-submit"
                onClick={() => {
                  setPhase('checking')
                  setAttempt((n) => n + 1)
                }}
              >
                <span>{a('errors.retry')}</span>
              </button>
            </>
          )}
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      titleId="adm-reset-title"
      kicker={a('reset.kicker')}
      title={a('reset.title')}
      lead={a('reset.lead')}
      foot={expiresAt ? a('reset.expires', { time: formatClock(expiresAt, locale) }) : null}
    >
      <form className="adm-login-form adm-login-step" onSubmit={onSubmit} noValidate>
        <PasswordField
          id="adm-new-password"
          label={a('reset.password')}
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={fieldError('password')}
          describedBy="adm-reset-rules"
          autoFocus
        >
          <Strength value={password} />
        </PasswordField>
        <PasswordRules id="adm-reset-rules" password={password} confirm={confirm} />
        <PasswordField
          id="adm-confirm-password"
          label={a('reset.confirm')}
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
          error={fieldError('confirm')}
        />
        {failure ? (
          <p className="adm-alert" role="alert">
            {a(`reset.errors.${failure}`)}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block adm-login-submit" disabled={saving || !password || !confirm}>
          <span>{a(saving ? 'reset.saving' : 'reset.submit')}</span>
          {saving ? <i className="adm-spinner" aria-hidden="true" /> : <ArrowIcon />}
        </button>
      </form>
    </AuthLayout>
  )
}
