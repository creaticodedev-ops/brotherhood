import { useEffect, useRef, useState } from 'react'
import { adminApi } from './api'
import { PasswordField } from './AuthLayout'
import { CheckIcon, LockIcon } from './icons'
import { PasswordRules, Strength } from './PasswordStrength'
import { problemOf } from './passwordRules'
import { useAdminText } from './strings'

const EMPTY = { current: '', password: '', confirm: '' }
const FIELD_IDS = { current: 'adm-settings-current', password: 'adm-settings-new', confirm: 'adm-settings-confirm' }

const ChangePassword = () => {
  const a = useAdminText()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const doneRef = useRef(null)

  useEffect(() => {
    if (done) doneRef.current?.scrollIntoView({ block: 'nearest' })
  }, [done])

  const update = (key) => (value) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setDone(false)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (saving) return
    const found = {}
    if (!values.current) found.current = 'required'
    const problem = problemOf(values.password)
    if (problem) found.password = problem
    else if (values.password === values.current) found.password = 'reused'
    if (values.confirm !== values.password) found.confirm = 'mismatch'
    setErrors(found)
    setFailure('')
    const first = Object.keys(FIELD_IDS).find((key) => found[key])
    if (first) {
      document.getElementById(FIELD_IDS[first])?.focus()
      return
    }
    setSaving(true)
    try {
      await adminApi.changePassword(values.current, values.password, values.confirm)
      setValues(EMPTY)
      setDone(true)
    } catch (err) {
      if (err.status === 422 && err.body?.fields) {
        setErrors(err.body.fields)
        const key = Object.keys(FIELD_IDS).find((name) => err.body.fields[name])
        if (key) document.getElementById(FIELD_IDS[key])?.focus()
      } else setFailure(err.status === 429 ? 'rate' : 'server')
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (key) => {
    const code = errors[key]
    if (!code) return ''
    return a(code === 'required' || code === 'wrong' ? `settings.errors.${code}` : `reset.errors.${code}`)
  }

  return (
    <section className="adm-panel adm-pass" aria-labelledby="adm-pass-title">
      <header className="adm-pass-head">
        <span className="adm-pass-icon" aria-hidden="true">
          <LockIcon />
        </span>
        <div>
          <h2 id="adm-pass-title">{a('settings.password.title')}</h2>
          <p>{a('settings.password.text')}</p>
        </div>
      </header>

      <form className="adm-pass-form" onSubmit={onSubmit} noValidate>
        <input type="text" name="username" autoComplete="username" value="admin" readOnly hidden />
        <PasswordField
          id={FIELD_IDS.current}
          label={a('settings.password.current')}
          autoComplete="current-password"
          value={values.current}
          onChange={update('current')}
          error={fieldError('current')}
        />
        <PasswordField
          id={FIELD_IDS.password}
          label={a('settings.password.next')}
          autoComplete="new-password"
          value={values.password}
          onChange={update('password')}
          error={fieldError('password')}
          describedBy="adm-settings-rules"
        >
          <Strength value={values.password} />
        </PasswordField>
        <PasswordRules id="adm-settings-rules" password={values.password} confirm={values.confirm} />
        <PasswordField
          id={FIELD_IDS.confirm}
          label={a('settings.password.confirm')}
          autoComplete="new-password"
          value={values.confirm}
          onChange={update('confirm')}
          error={fieldError('confirm')}
        />

        {failure ? (
          <p className="adm-alert" role="alert">
            {a(`reset.errors.${failure}`)}
          </p>
        ) : null}
        <p className="adm-pass-done" role="status" ref={doneRef}>
          {done ? (
            <>
              <CheckIcon size={16} />
              <span>{a('settings.password.done')}</span>
            </>
          ) : null}
        </p>

        <div className="adm-pass-actions">
          <button
            type="submit"
            className="btn btn-primary adm-pass-submit"
            disabled={saving || !values.current || !values.password || !values.confirm}
          >
            <span>{a(saving ? 'settings.password.saving' : 'settings.password.submit')}</span>
            {saving ? <i className="adm-spinner" aria-hidden="true" /> : null}
          </button>
        </div>
      </form>
    </section>
  )
}

export const Settings = () => {
  const a = useAdminText()
  return (
    <div className="adm-view adm-settings">
      <header className="adm-view-head">
        <div>
          <p className="kicker">{a('settings.kicker')}</p>
          <h1 className="adm-title">{a('settings.title')}</h1>
          <p className="adm-lead">{a('settings.lead')}</p>
        </div>
      </header>
      <ChangePassword />
    </div>
  )
}
