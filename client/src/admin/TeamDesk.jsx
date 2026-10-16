import { useEffect, useState } from 'react'
import { adminApi } from './api'
import { ErrorState } from './parts'

const DEFAULTS = ['recruitment.review', 'recruitment.decide', 'missions.manage', 'finance.record', 'finance.approve', 'members.read']

export const TeamDesk = () => {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', permissions: ['recruitment.review'] })
  const [notice, setNotice] = useState('')

  const load = () => adminApi.staff().then(setData).catch(setError)
  useEffect(() => {
    load()
  }, [])

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
      {notice ? <p className="adm-alert">{notice}</p> : null}
      <form
        className="cmd-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setNotice('')
          try {
            await adminApi.saveStaff(form)
            setForm({ ...form, name: '', email: '', password: '' })
            load()
          } catch (err) {
            setNotice(err.body?.error || 'Compte refusé')
          }
        }}
      >
        <input required placeholder="Nom" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input required type="email" placeholder="E-mail" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input required type="password" placeholder="Mot de passe" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <button className="btn btn-primary btn-sm" type="submit">Créer le compte</button>
      </form>
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
                  className={account.permissions.includes('*') || account.permissions.includes(permission) ? 'is-on' : ''}
                  onClick={() => {
                    const next = account.permissions.includes(permission)
                      ? account.permissions.filter((item) => item !== permission)
                      : [...account.permissions.filter((item) => item !== '*'), permission]
                    adminApi.saveStaff({ id: account.id, permissions: next }).then(load)
                  }}
                >
                  {permission}
                </button>
              )) : null}
              <button type="button" onClick={() => adminApi.saveStaff({ id: account.id, active: !account.active }).then(load)}>
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
