import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { formatMoney, relativeTime } from './format'
import { ErrorState } from './parts'

const EMPTY = { kind: 'expense', amount: '', date: '', description: '', category: '', mission: '', method: 'cash', receipt: '' }

export const CaisseDesk = () => {
  const { locale } = useI18n()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [opening, setOpening] = useState('')
  const [kind, setKind] = useState('')
  const [missions, setMissions] = useState([])
  const [notice, setNotice] = useState('')

  const load = () => {
    setError(null)
    return adminApi
      .ledger(kind ? { kind } : {})
      .then(setData)
      .catch((err) => setError(err))
  }

  useEffect(() => {
    load()
  }, [kind])

  useEffect(() => {
    adminApi.missions('').then((data) => setMissions(data.items || [])).catch(() => {})
  }, [])

  const add = async (event) => {
    event.preventDefault()
    setNotice('')
    try {
      await adminApi.addEntry({ ...form, amount: Number(form.amount), date: form.date || new Date().toISOString(), mission: form.mission || undefined })
      setForm(EMPTY)
      load()
    } catch (err) {
      setNotice(err.body?.error || 'Mouvement refusé')
    }
  }

  if (error) return <ErrorState error={error} onRetry={load} />
  if (!data) return <p className="adm-lead">…</p>

  return (
    <div className="adm-view">
      <header className="adm-view-head">
        <div>
          <p className="kicker">Caisse</p>
          <h1 className="adm-title">{formatMoney(data.summary.balance, locale, 'MAD')}</h1>
          <p className="adm-lead">
            Solde d’ouverture {formatMoney(data.summary.opening, locale, 'MAD')} + entrées {formatMoney(data.summary.income, locale, 'MAD')} − sorties {formatMoney(data.summary.expense, locale, 'MAD')}. Les transferts internes ne changent pas ce solde.
          </p>
        </div>
        <a className="btn btn-sm btn-ghost" href="/api/admin/ops/ledger.csv">Export CSV</a>
      </header>
      {notice ? <p className="adm-alert" role="alert">{notice}</p> : null}
      <form
        className="cmd-form"
        onSubmit={async (event) => {
          event.preventDefault()
          try {
            await adminApi.setOpening(Number(opening))
            setOpening('')
            load()
          } catch (err) {
            setNotice(err.status === 409 ? 'Le solde d’ouverture est figé dès le premier mouvement. Passez une écriture de régularisation.' : 'Solde refusé')
          }
        }}
      >
        <input inputMode="decimal" placeholder="Solde d’ouverture MAD" value={opening} onChange={(event) => setOpening(event.target.value)} />
        <button className="btn btn-sm btn-ghost" type="submit">Enregistrer l’ouverture</button>
      </form>
      <form className="cmd-form" onSubmit={add}>
        <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
          <option value="income">Entrée</option>
          <option value="expense">Sortie</option>
          <option value="transfer">Transfert vers une mission</option>
        </select>
        <input required inputMode="decimal" placeholder="Montant" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        <input required minLength={3} placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <input placeholder="Catégorie" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
        <select value={form.mission} onChange={(event) => setForm({ ...form, mission: event.target.value })}>
          <option value="">Sans mission</option>
          {missions.map((mission) => (
            <option key={mission.id} value={mission.id}>{mission.title}</option>
          ))}
        </select>
        <input placeholder="Moyen" value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })} />
        <input placeholder="Lien du reçu" value={form.receipt} onChange={(event) => setForm({ ...form, receipt: event.target.value })} />
        <button className="btn btn-primary btn-sm" type="submit">Enregistrer</button>
      </form>
      <div className="cmd-filters">
        {['', 'income', 'expense', 'transfer', 'reversal'].map((key) => (
          <button key={key || 'all'} type="button" className={kind === key ? 'is-on' : ''} onClick={() => setKind(key)}>{key || 'Tous'}</button>
        ))}
      </div>
      <table className="cmd-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Montant</th>
            <th>Détail</th>
            <th>Statut</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.items.map((entry) => (
            <tr key={entry.id}>
              <td>{relativeTime(entry.date, locale)}</td>
              <td>{entry.kind}</td>
              <td>{formatMoney(entry.amount, locale, entry.currency || 'MAD')}</td>
              <td>
                {entry.description}
                <small>{entry.actor}{entry.category ? ` · ${entry.category}` : ''}</small>
              </td>
              <td>{entry.status}{entry.approvedAt ? ' · validé' : ''}</td>
              <td>
                {entry.status === 'posted' && entry.kind !== 'reversal' ? (
                  <>
                    {!entry.approvedAt ? (
                      <button type="button" onClick={() => adminApi.approveEntry(entry.id).then(load)}>Valider</button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        const reason = window.prompt('Motif de la contre-passation')
                        if (reason) adminApi.reverseEntry(entry.id, reason).then(load).catch((err) => setNotice(err.body?.error || 'Contre-passation refusée'))
                      }}
                    >
                      Contre-passer
                    </button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
