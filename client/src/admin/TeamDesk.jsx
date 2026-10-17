import { useEffect, useState } from 'react'
import { adminApi } from './api'
import { ErrorState } from './parts'
import { PasswordRules } from './PasswordStrength'
import { problemOf } from './passwordRules'

const DEFAULTS = ['recruitment.review', 'recruitment.decide', 'missions.manage', 'finance.record', 'finance.approve', 'members.read']
const EMPTY = { name: '', email: '', password: '', role: 'staff', permissions: ['recruitment.review'] }
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const MESSAGES = {
  short: 'Mot de passe trop court : 12 caractères minimum.',
  long: 'Mot de passe trop long : 128 caractères maximum.',
  weak: 'Mot de passe trop simple : mélangez au moins 3 types (minuscules, majuscules, chiffres, symboles) et 5 caractères différents.',
  name: 'Indiquez un nom d’au moins 2 caractères.',
  email: 'Indiquez une adresse e-mail valide.',
  duplicate: 'Un compte utilise déjà cette adresse e-mail.',
  forbidden: 'Seul un administrateur peut créer ou modifier des comptes.',
  session: 'Votre session a expiré. Reconnectez-vous puis réessayez.',
  server: 'Le compte n’a pas pu être enregistré pour le moment. Réessayez dans un instant.',
  update: 'La modification n’a pas pu être enregistrée. Réessayez.',
}

const messageFor = (error) => {
  const code = error?.body?.error
  if (error?.status === 409) return MESSAGES.duplicate
  if (error?.status === 403) return MESSAGES.forbidden
  if (error?.status === 401) return MESSAGES.session
  if (error?.status === 422) return MESSAGES[code] || MESSAGES.email
  return MESSAGES.server
}

export const TeamDesk = () => {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState('')

  const load = () => adminApi.staff().then(setData).catch(setError)
  useEffect(() => {
    load()
  }, [])

  const update = async (id, change) => {
    setPending(id)
    setNotice(null)
    try {
      await adminApi.saveStaff({ id, ...change })
      await load()
    } catch (err) {
      setNotice({ tone: 'error', text: err?.status === 403 || err?.status === 401 ? messageFor(err) : MESSAGES.update })
    } finally {
      setPending('')
    }
  }

  if (error) return <ErrorState error={error} onRetry={load} />
  if (!data) return <p className="adm-lead">…</p>

  return (
    <div className="adm-view">
      <header className="adm-view-head">
        <div>
          <p className="kicker">Équipe</p>
          <h1 className="adm-title">Accès</h1>
          <p className="adm-lead">Le compte administrateur principal reste celui de la connexion sans e-mail. Les comptes ci-dessous se connectent avec e-mail et mot de passe. Les mots de passe sont hachés.</p>
        </div>
      </header>
      {notice ? (
        <p className={notice.tone === 'ok' ? 'adm-flash is-ok' : 'adm-alert'} role={notice.tone === 'ok' ? 'status' : 'alert'}>
          {notice.text}
        </p>
      ) : null}
      <form
        className="cmd-form"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault()
          if (saving) return
          const name = form.name.trim()
          const email = form.email.trim()
          const problem = name.length < 2 ? 'name' : !EMAIL.test(email) ? 'email' : problemOf(form.password)
          if (problem) {
            setNotice({ tone: 'error', text: MESSAGES[problem] })
            return
          }
          setSaving(true)
          setNotice(null)
          try {
            const { item } = await adminApi.saveStaff({ ...form, name, email })
            setForm({ ...EMPTY, role: form.role })
            setNotice({ tone: 'ok', text: `Compte ${item.role === 'admin' ? 'administrateur' : 'staff'} créé pour ${item.name}.` })
            load()
          } catch (err) {
            setNotice({ tone: 'error', text: messageFor(err) })
          } finally {
            setSaving(false)
          }
        }}
      >
        <input required placeholder="Nom" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="off" />
        <input required type="email" placeholder="E-mail" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="off" />
        <input
          required
          type="password"
          placeholder="Mot de passe (12 caractères min.)"
          value={form.password}
          minLength={12}
          maxLength={128}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          autoComplete="new-password"
          aria-describedby="team-password-rules"
        />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} aria-label="Rôle">
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn btn-primary btn-sm" type="submit" disabled={saving} aria-busy={saving}>
          {saving ? 'Création…' : 'Créer le compte'}
        </button>
      </form>
      {form.password ? <PasswordRules id="team-password-rules" password={form.password} /> : null}
      <ul className="cmd-cards">
        {data.items.map((account) => (
          <li key={account.id}>
            <strong>{account.name}</strong>
            <span>{account.email} · {account.role} · {account.active ? 'actif' : 'inactif'}</span>
            <div className="cmd-filters">
              {account.role === 'staff' ? DEFAULTS.map((permission) => (
                <button
                  key={permission}
                  type="button"
                  disabled={pending === account.id}
                  className={account.permissions.includes('*') || account.permissions.includes(permission) ? 'is-on' : ''}
                  onClick={() => {
                    const next = account.permissions.includes(permission)
                      ? account.permissions.filter((item) => item !== permission)
                      : [...account.permissions.filter((item) => item !== '*'), permission]
                    update(account.id, { permissions: next })
                  }}
                >
                  {permission}
                </button>
              )) : null}
              <button type="button" disabled={pending === account.id} onClick={() => update(account.id, { active: !account.active })}>
                {account.active ? 'Désactiver' : 'Réactiver'}
              </button>
            </div>
          </li>
        ))}
        {!data.items.length ? <li>Aucun compte d’équipe pour l’instant.</li> : null}
      </ul>
    </div>
  )
}
