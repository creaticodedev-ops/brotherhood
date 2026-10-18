import { useEffect, useId, useRef, useState } from 'react'
import { adminApi } from './api'
import { CheckIcon, LockIcon } from './icons'
import { ErrorState } from './parts'
import { PasswordRules } from './PasswordStrength'
import { problemOf } from './passwordRules'
import { useAdminText } from './strings'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const EMPTY = { name: '', email: '', password: '', role: 'staff', permissions: ['recruitment.review'] }
const RESERVED = ['team_manage', 'settings_manage']
const permKey = (permission) => permission.replace('.', '_')
const sameSet = (a, b) => a.length === b.length && a.every((item) => b.includes(item))

const errorFor = (a, error) => {
  const code = error?.body?.error
  if (error?.status === 409) return a('team.errors.duplicate')
  if (error?.status === 403) return a('team.errors.forbidden')
  if (error?.status === 401) return a('team.errors.session')
  if (error?.status === 422 && ['short', 'long', 'weak', 'name', 'email', 'permissions', 'role'].includes(code)) return a(`team.errors.${code}`)
  return a('team.errors.server')
}

const grantable = (catalog, role) => {
  const all = catalog.groups.flatMap((group) => group.permissions)
  return role === 'admin' ? all : all.filter((permission) => !catalog.adminOnly.includes(permission))
}

const Confirm = ({ title, lines, onCancel, onConfirm, busy }) => {
  const a = useAdminText()
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => dialog?.open && dialog.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="adm-confirm"
      aria-labelledby="team-confirm-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <div className="adm-confirm-card">
        <h2 id="team-confirm-title">{title}</h2>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <div className="adm-confirm-actions">
          <button type="button" className="btn btn-sm" onClick={onCancel} disabled={busy} autoFocus>
            {a('team.cancel')}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onConfirm} disabled={busy}>
            {a('team.confirm')}
          </button>
        </div>
      </div>
    </dialog>
  )
}

const RoleChoice = ({ name, value, onChange, disabled }) => {
  const a = useAdminText()
  return (
    <div className="team-roles" role="radiogroup" aria-label={a('team.role')}>
      {['staff', 'admin'].map((role) => (
        <label key={role} className={`team-role${value === role ? ' is-on' : ''}`}>
          <input type="radio" name={name} value={role} checked={value === role} disabled={disabled} onChange={() => onChange(role)} />
          <span className="team-role-head">
            <strong>{a(`team.roles.${role}`)}</strong>
            <span className="team-role-dot" aria-hidden="true" />
          </span>
          <small>{a(`team.roleHelp.${role}`)}</small>
        </label>
      ))}
    </div>
  )
}

const PermissionMatrix = ({ catalog, role, value, onChange, disabled, initial }) => {
  const a = useAdminText()
  const uid = useId()
  const allowed = grantable(catalog, role)
  const toggle = (permission) => onChange(value.includes(permission) ? value.filter((item) => item !== permission) : [...value, permission])

  return (
    <div className="team-matrix">
      {catalog.groups.map((group) => {
        const open = group.permissions.filter((permission) => allowed.includes(permission))
        const granted = open.filter((permission) => value.includes(permission))
        const full = open.length > 0 && granted.length === open.length
        return (
          <fieldset key={group.id} className="team-group" disabled={disabled}>
            <legend className="team-group-head">
              <span>{a(`team.groups.${group.id}`)}</span>
              <span className="team-group-meta">
                <span className="team-group-count">{a('team.count', { n: granted.length, total: open.length })}</span>
                {open.length ? (
                  <button
                    type="button"
                    className="team-group-all"
                    onClick={() => onChange(full ? value.filter((item) => !open.includes(item)) : [...new Set([...value, ...open])])}
                  >
                    {full ? a('team.clearAll') : a('team.grantAll')}
                  </button>
                ) : null}
              </span>
            </legend>
            <ul>
              {group.permissions.map((permission) => {
                const available = allowed.includes(permission)
                const on = available && value.includes(permission)
                const changed = initial && available && on !== initial.includes(permission)
                const id = `${uid}-${permKey(permission)}`
                return (
                  <li key={permission} className={`team-perm${on ? ' is-on' : ''}${available ? '' : ' is-locked'}${changed ? ' is-changed' : ''}`}>
                    <input id={id} type="checkbox" checked={on} disabled={!available} onChange={() => toggle(permission)} aria-describedby={`${id}-text`} />
                    <label htmlFor={id}>
                      <span className="team-perm-box" aria-hidden="true">
                        {available ? <CheckIcon size={14} /> : <LockIcon />}
                      </span>
                      <span className="team-perm-copy">
                        <strong>{a(`team.perms.${permKey(permission)}.name`)}</strong>
                        <small id={`${id}-text`}>{a(`team.perms.${permKey(permission)}.text`)}</small>
                      </span>
                      {available ? null : <span className="team-perm-tag">{a('team.adminOnly')}</span>}
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        )
      })}
      <div className="team-group is-reserved">
        <p className="team-group-head">
          <span>{a('team.groups.reserved')}</span>
        </p>
        <ul>
          {RESERVED.map((key) => (
            <li key={key} className="team-perm is-locked is-reserved">
              <span className="team-perm-row">
                <span className="team-perm-box" aria-hidden="true">
                  <LockIcon />
                </span>
                <span className="team-perm-copy">
                  <strong>{a(`team.perms.${key}.name`)}</strong>
                  <small>{a(`team.perms.${key}.text`)}</small>
                </span>
                <span className="team-perm-tag">{a('team.superOnly')}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const permissionNames = (a, list) => list.map((permission) => a(`team.perms.${permKey(permission)}.name`)).join(', ')

const AccountCard = ({ account, catalog, onSaved }) => {
  const a = useAdminText()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState(account.role)
  const [draft, setDraft] = useState(account.permissions)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const panelId = useId()

  useEffect(() => {
    setRole(account.role)
    setDraft(account.permissions)
  }, [account])

  const allowed = grantable(catalog, role)
  const nextPermissions = draft.filter((permission) => allowed.includes(permission))
  const dirty = role !== account.role || !sameSet(nextPermissions, account.permissions) || (account.legacyAccess && open)
  const initials = account.name
    .split(/\s+/)
    .map((part) => Array.from(part)[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const send = async (body, success) => {
    setSaving(true)
    setMessage(null)
    try {
      const { item } = await adminApi.saveStaff({ id: account.id, ...body })
      onSaved(item)
      setMessage({ tone: 'ok', text: success(item) })
    } catch (error) {
      setMessage({ tone: 'error', text: errorFor(a, error) })
    } finally {
      setSaving(false)
      setConfirm(null)
    }
  }

  const saveAccess = () => {
    const removed = account.permissions.filter((permission) => !nextPermissions.includes(permission))
    const added = nextPermissions.filter((permission) => !account.permissions.includes(permission))
    const lines = []
    if (role !== account.role) lines.push(a('team.confirmRole', { from: a(`team.roles.${account.role}`), to: a(`team.roles.${role}`) }))
    if (removed.length) lines.push(a('team.confirmRevoke', { list: permissionNames(a, removed) }))
    if (added.length) lines.push(a('team.confirmGrant', { list: permissionNames(a, added) }))
    const run = () => send({ role, permissions: nextPermissions }, (item) => a('team.saved', { name: item.name }))
    if (role !== account.role || removed.length) setConfirm({ lines, run })
    else run()
  }

  const toggleActive = () => {
    const run = () => send({ active: !account.active }, (item) => a('team.statusSaved', { name: item.name }))
    if (account.active) setConfirm({ lines: [a('team.confirmDeactivate', { name: account.name })], run })
    else run()
  }

  return (
    <li className={`team-account${open ? ' is-open' : ''}${account.active ? '' : ' is-inactive'}`}>
      <div className="team-account-head">
        <span className="team-account-avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="team-account-who">
          <strong dir="auto">{account.name}</strong>
          <span dir="ltr">{account.email}</span>
        </span>
        <span className="team-account-badges">
          <span className={`team-badge is-${account.role}`}>{a(`team.roles.${account.role}`)}</span>
          <span className={`team-badge ${account.active ? 'is-active' : 'is-inactive'}`}>{account.active ? a('team.active') : a('team.inactive')}</span>
          <span className="team-badge is-count">{account.permissions.length ? a('team.accessCount', { n: account.permissions.length }) : a('team.noAccess')}</span>
        </span>
        <button type="button" className="btn btn-ghost btn-sm team-account-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
          {open ? a('team.close') : a('team.manage')}
        </button>
      </div>

      {open ? (
        <div className="team-account-body" id={panelId}>
          {account.legacyAccess ? <p className="team-note">{a('team.legacy')}</p> : null}
          <section className="team-section">
            <h3>{a('team.role')}</h3>
            <RoleChoice name={`role-${account.id}`} value={role} onChange={setRole} disabled={saving} />
          </section>
          <section className="team-section">
            <h3>{a('team.access')}</h3>
            <PermissionMatrix catalog={catalog} role={role} value={draft} onChange={setDraft} disabled={saving} initial={account.permissions} />
          </section>
          {message ? (
            <p className={message.tone === 'ok' ? 'adm-flash is-ok' : 'adm-alert'} role={message.tone === 'ok' ? 'status' : 'alert'}>
              {message.text}
            </p>
          ) : null}
          <footer className="team-account-foot">
            <button type="button" className="adm-link team-status" onClick={toggleActive} disabled={saving}>
              {account.active ? a('team.deactivate') : a('team.activate')}
            </button>
            <span className="team-account-actions">
              {dirty ? <span className="team-unsaved">{a('team.unsaved')}</span> : null}
              <button
                type="button"
                className="btn btn-sm"
                disabled={saving || !dirty}
                onClick={() => {
                  setRole(account.role)
                  setDraft(account.permissions)
                  setMessage(null)
                }}
              >
                {a('team.cancel')}
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={saving || !dirty} aria-busy={saving} onClick={saveAccess}>
                {saving ? a('team.saving') : a('team.save')}
              </button>
            </span>
          </footer>
        </div>
      ) : null}

      {confirm ? <Confirm title={a('team.confirmTitle')} lines={confirm.lines} busy={saving} onCancel={() => setConfirm(null)} onConfirm={confirm.run} /> : null}
    </li>
  )
}

export const TeamDesk = () => {
  const a = useAdminText()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [invalid, setInvalid] = useState('')

  const load = () =>
    adminApi
      .staff()
      .then((result) => {
        setData(result)
        setError(null)
      })
      .catch(setError)

  useEffect(() => {
    load()
  }, [])

  if (error) return <ErrorState error={error} onRetry={load} />
  if (!data) return <p className="adm-lead">…</p>

  const catalog = data.catalog
  const allowed = grantable(catalog, form.role)
  const chosen = form.permissions.filter((permission) => allowed.includes(permission))

  const submit = async (event) => {
    event.preventDefault()
    if (saving) return
    const name = form.name.trim()
    const email = form.email.trim()
    const problem = name.length < 2 ? 'name' : !EMAIL.test(email) ? 'email' : problemOf(form.password)
    if (problem) {
      setInvalid(problem === 'name' || problem === 'email' ? problem : 'password')
      setNotice({ tone: 'error', text: a(`team.errors.${problem}`) })
      return
    }
    setInvalid('')
    setSaving(true)
    setNotice(null)
    try {
      const { item } = await adminApi.saveStaff({ name, email, password: form.password, role: form.role, permissions: chosen })
      setForm({ ...EMPTY, role: form.role })
      setNotice({ tone: 'ok', text: a('team.created', { role: a(`team.roles.${item.role}`), name: item.name }) })
      setData((current) => ({ ...current, items: [item, ...current.items] }))
    } catch (err) {
      const code = err?.body?.error
      setInvalid(err?.status === 409 || code === 'email' ? 'email' : code === 'name' ? 'name' : ['short', 'long', 'weak'].includes(code) ? 'password' : '')
      setNotice({ tone: 'error', text: errorFor(a, err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="adm-view team">
      <header className="adm-view-head">
        <div>
          <p className="kicker">{a('team.kicker')}</p>
          <h1 className="adm-title">{a('team.title')}</h1>
          <p className="adm-lead">{a('team.lead')}</p>
        </div>
      </header>

      <p className="team-rule">
        <LockIcon />
        <span>{a('team.rule')}</span>
      </p>

      <form className="adm-panel team-create" noValidate onSubmit={submit} aria-labelledby="team-create-title">
        <header className="team-create-head">
          <h2 id="team-create-title">{a('team.createTitle')}</h2>
          <p>{a('team.createLead')}</p>
        </header>

        <section className="team-section">
          <h3>
            <span>01</span>
            {a('team.identity')}
          </h3>
          <div className="team-fields">
            <label className="cmd-field">
              <span>
                {a('team.name')} <em>{a('team.required')}</em>
              </span>
              <input
                required
                value={form.name}
                placeholder={a('team.namePlaceholder')}
                aria-invalid={invalid === 'name' || undefined}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                autoComplete="off"
                maxLength={80}
              />
            </label>
            <label className="cmd-field">
              <span>
                {a('team.email')} <em>{a('team.required')}</em>
              </span>
              <input
                required
                type="email"
                dir="ltr"
                value={form.email}
                placeholder={a('team.emailPlaceholder')}
                aria-invalid={invalid === 'email' || undefined}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                autoComplete="off"
                maxLength={254}
              />
            </label>
          </div>
        </section>

        <section className="team-section">
          <h3>
            <span>02</span>
            {a('team.login')}
          </h3>
          <div className="team-fields">
            <label className="cmd-field">
              <span>
                {a('team.password')} <em>{a('team.required')}</em>
              </span>
              <input
                required
                type="password"
                value={form.password}
                placeholder={a('team.passwordPlaceholder')}
                minLength={12}
                maxLength={128}
                aria-invalid={invalid === 'password' || undefined}
                aria-describedby="team-password-rules"
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                autoComplete="new-password"
              />
            </label>
            <div className="team-rules">
              <PasswordRules id="team-password-rules" password={form.password} />
            </div>
          </div>
        </section>

        <section className="team-section">
          <h3>
            <span>03</span>
            {a('team.role')}
          </h3>
          <RoleChoice name="team-new-role" value={form.role} onChange={(role) => setForm({ ...form, role })} disabled={saving} />
        </section>

        <section className="team-section">
          <h3>
            <span>04</span>
            {a('team.access')}
          </h3>
          <PermissionMatrix catalog={catalog} role={form.role} value={form.permissions} onChange={(permissions) => setForm({ ...form, permissions })} disabled={saving} />
        </section>

        {notice ? (
          <p className={notice.tone === 'ok' ? 'adm-flash is-ok' : 'adm-alert'} role={notice.tone === 'ok' ? 'status' : 'alert'}>
            {notice.text}
          </p>
        ) : null}

        <footer className="team-create-foot">
          <span>{a('team.selected', { n: chosen.length })}</span>
          <button className="btn btn-primary" type="submit" disabled={saving} aria-busy={saving}>
            {saving ? a('team.saving') : a('team.submit')}
          </button>
        </footer>
      </form>

      <section className="team-accounts" aria-labelledby="team-list-title">
        <header className="team-accounts-head">
          <h2 id="team-list-title">{a('team.listTitle')}</h2>
          <span>{data.items.length}</span>
        </header>
        {data.items.length ? (
          <ul>
            {data.items.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                catalog={catalog}
                onSaved={(item) => setData((current) => ({ ...current, items: current.items.map((row) => (row.id === item.id ? item : row)) }))}
              />
            ))}
          </ul>
        ) : (
          <p className="adm-empty">{a('team.empty')}</p>
        )}
      </section>
    </div>
  )
}
