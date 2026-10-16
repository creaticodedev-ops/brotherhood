import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { formatMoney, relativeTime } from './format'
import { ErrorState } from './parts'

const EMPTY = { title: '', description: '', objectives: '', category: '', plannedAt: '', location: '', status: 'upcoming', assignees: '', budget: '', limit: '', note: '' }

export const MissionsDesk = () => {
  const { locale } = useI18n()
  const [status, setStatus] = useState('')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [open, setOpen] = useState(null)
  const [note, setNote] = useState('')

  const load = () => {
    setError(null)
    return adminApi
      .missions(status)
      .then((data) => setItems(data.items))
      .catch((err) => setError(err))
  }

  useEffect(() => {
    load()
  }, [status])

  const save = async (event) => {
    event.preventDefault()
    const payload = {
      ...form,
      assignees: form.assignees.split(',').map((item) => item.trim()).filter(Boolean),
      budget: Number(form.budget) || 0,
      limit: Number(form.limit) || 0,
      plannedAt: form.plannedAt || null,
    }
    await adminApi.saveMission(payload)
    setForm(EMPTY)
    load()
  }

  const patch = async (id, body) => {
    await adminApi.saveMission({ id, ...body })
    setNote('')
    const data = await adminApi.missions(status)
    setItems(data.items)
    setOpen(data.items.find((item) => item.id === id) || null)
  }

  if (error) return <ErrorState error={error} onRetry={load} />

  return (
    <div className="adm-view">
      <header className="adm-view-head">
        <div>
          <p className="kicker">Missions</p>
          <h1 className="adm-title">Opérations</h1>
          <p className="adm-lead">Budget, dépenses réelles et rapport. Les chiffres viennent des mouvements de la caisse.</p>
        </div>
      </header>
      <div className="cmd-filters">
        {['', 'upcoming', 'ongoing', 'completed', 'archived'].map((key) => (
          <button key={key || 'all'} type="button" className={status === key ? 'is-on' : ''} onClick={() => setStatus(key)}>
            {key || 'Toutes'}
          </button>
        ))}
      </div>
      <form className="cmd-form" onSubmit={save}>
        <input required minLength={3} placeholder="Titre" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <input placeholder="Lieu" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
        <input placeholder="Catégorie" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
        <input type="date" value={form.plannedAt} onChange={(event) => setForm({ ...form, plannedAt: event.target.value })} />
        <input placeholder="Budget MAD" inputMode="decimal" value={form.budget} onChange={(event) => setForm({ ...form, budget: event.target.value })} />
        <input placeholder="Plafond MAD" inputMode="decimal" value={form.limit} onChange={(event) => setForm({ ...form, limit: event.target.value })} />
        <input placeholder="Responsables, séparés par une virgule" value={form.assignees} onChange={(event) => setForm({ ...form, assignees: event.target.value })} />
        <textarea placeholder="Objectif" value={form.objectives} onChange={(event) => setForm({ ...form, objectives: event.target.value })} />
        <button className="btn btn-primary btn-sm" type="submit">Créer la mission</button>
      </form>
      <ul className="cmd-cards">
        {(items || []).map((mission) => (
          <li key={mission.id}>
            <button type="button" onClick={() => setOpen(mission)}>
              <strong>{mission.title}</strong>
              <span>{mission.status}{mission.location ? ` · ${mission.location}` : ''}</span>
              <span>
                Budget {formatMoney(mission.figures?.budget || 0, locale, 'MAD')} · Dépensé {formatMoney(mission.figures?.expense || 0, locale, 'MAD')} · Reste {formatMoney(mission.figures?.remaining || 0, locale, 'MAD')}
              </span>
              {mission.figures?.overrun ? <em>Budget dépassé</em> : null}
            </button>
          </li>
        ))}
      </ul>
      {open ? (
        <section className="adm-panel">
          <header className="adm-panel-head">
            <h2>{open.title}</h2>
            <button type="button" className="adm-link" onClick={() => setOpen(null)}>Fermer</button>
          </header>
          <p>{open.description}</p>
          <p>{open.objectives}</p>
          <p>Entrées {formatMoney(open.figures?.income || 0, locale, 'MAD')} · Transferts internes {formatMoney(open.figures?.allocated || 0, locale, 'MAD')} · Net {formatMoney(open.figures?.net || 0, locale, 'MAD')}</p>
          <div className="cmd-filters">
            {['upcoming', 'ongoing', 'completed', 'archived'].map((key) => (
              <button key={key} type="button" onClick={() => patch(open.id, { status: key })}>{key}</button>
            ))}
          </div>
          <ul className="cmd-list">
            {open.timeline.map((row, index) => (
              <li key={`${row.at}-${index}`}>
                <span>{row.actor}<small>{row.text}</small></span>
                <time>{relativeTime(row.at, locale)}</time>
              </li>
            ))}
          </ul>
          <form
            className="cmd-form"
            onSubmit={(event) => {
              event.preventDefault()
              patch(open.id, { note })
            }}
          >
            <textarea placeholder="Note de suivi" value={note} onChange={(event) => setNote(event.target.value)} />
            <button className="btn btn-sm btn-ghost" type="submit">Ajouter au fil</button>
          </form>
          <label>
            Rapport final
            <textarea defaultValue={open.report} onBlur={(event) => patch(open.id, { report: event.target.value })} />
          </label>
        </section>
      ) : null}
    </div>
  )
}
