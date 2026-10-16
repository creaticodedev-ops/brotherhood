import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { DailyChart } from './charts'
import { formatClock, formatCount, formatMoney, relativeTime } from './format'
import { ErrorState } from './parts'
import { useAdminText } from './strings'

const money = (value, locale) => formatMoney(value, locale, 'MAD')

export const CommandHome = ({ stats, error, onRetry, onOpen, onNavigate }) => {
  const a = useAdminText()
  const { locale } = useI18n()
  const [ops, setOps] = useState(null)
  const [opsError, setOpsError] = useState(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .summary(controller.signal)
      .then((data) => setOps(data))
      .catch((err) => {
        if (err.name !== 'AbortError') setOpsError(err)
      })
    return () => controller.abort()
  }, [stats])

  useEffect(() => {
    if (query.trim().length < 2) return undefined
    const controller = new AbortController()
    const timer = setTimeout(() => {
      adminApi
        .search(query.trim(), controller.signal)
        .then(setHits)
        .catch(() => {})
    }, 220)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  if (!stats) return error ? <ErrorState error={error} onRetry={onRetry} /> : <p className="adm-lead">…</p>

  const count = (key) => stats.statuses?.[key]?.count || 0
  const applications = stats.total || 0
  const fresh = count('new')
  const review = count('pending') + count('review')
  const approved = count('approved') + count('accepted') + count('active')
  const rejected = count('rejected')

  return (
    <div className="adm-view">
      <header className="adm-view-head">
        <div>
          <p className="kicker">Command center</p>
          <h1 className="adm-title">THE BROTHERHOOD</h1>
          <p className="adm-lead">{a('overview.lead')}</p>
        </div>
        <p className="adm-stamp">{a('overview.updated', { time: formatClock(stats.generatedAt, locale) })}</p>
      </header>

      <label className="cmd-search">
        <span>Recherche</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Candidat, ville, mission" />
      </label>
      {hits ? (
        <div className="cmd-hits">
          {hits.applications.map((item) => (
            <button key={item.id} type="button" onClick={() => onOpen(item.id)}>
              {item.name} · {item.city}
            </button>
          ))}
          {hits.missions.map((item) => (
            <button key={item.id} type="button" onClick={() => onNavigate('missions')}>
              {item.title}
            </button>
          ))}
        </div>
      ) : null}

      <div className="adm-kpis">
        <article className="adm-kpi is-accent">
          <p className="adm-kpi-label">Missions</p>
          <p className="adm-kpi-value">{formatCount(ops?.missions.total || 0, locale)}</p>
          <p className="adm-kpi-foot">{ops ? `${ops.missions.ongoing} en cours · ${ops.missions.upcoming} à venir · ${ops.missions.completed} terminées` : '—'}</p>
        </article>
        <article className="adm-kpi">
          <p className="adm-kpi-label">Candidatures</p>
          <p className="adm-kpi-value">{formatCount(applications, locale)}</p>
          <p className="adm-kpi-foot">{fresh} nouvelles · {review} en lecture · {approved} retenues · {rejected} refusées</p>
        </article>
        <article className="adm-kpi">
          <p className="adm-kpi-label">Membres actifs</p>
          <p className="adm-kpi-value">{formatCount(ops?.members || 0, locale)}</p>
          <p className="adm-kpi-foot">Candidatures retenues</p>
        </article>
        <article className="adm-kpi">
          <p className="adm-kpi-label">Caisse</p>
          <p className="adm-kpi-value">{ops?.finance ? money(ops.finance.balance, locale) : '—'}</p>
          <p className="adm-kpi-foot">{ops?.finance ? `Entrées ${money(ops.finance.income, locale)} · Sorties ${money(ops.finance.expense, locale)}` : 'Réservé aux comptes autorisés'}</p>
        </article>
      </div>

      <div className="adm-grid">
        <section className="adm-panel is-chart">
          <header className="adm-panel-head">
            <h2>Candidatures récentes</h2>
          </header>
          <DailyChart daily={stats.daily} days={stats.days} locale={locale} />
        </section>
        <section className="adm-panel">
          <header className="adm-panel-head">
            <h2>À traiter</h2>
          </header>
          <ul className="cmd-list">
            <li>
              <button type="button" onClick={() => onNavigate('applications')}>
                {formatCount(review + fresh, locale)} candidatures en attente
              </button>
            </li>
            <li>
              <button type="button" onClick={() => onNavigate('caisse')}>
                {formatCount(ops?.pendingExpenses || 0, locale)} dépenses sans validation
              </button>
            </li>
            {(ops?.deadlines || []).map((mission) => (
              <li key={mission.id}>
                <button type="button" onClick={() => onNavigate('missions')}>
                  {mission.title}
                  <small>{mission.plannedAt ? relativeTime(mission.plannedAt, locale) : mission.status}</small>
                </button>
              </li>
            ))}
            {(ops?.missions.items || [])
              .filter((mission) => mission.figures?.overrun)
              .map((mission) => (
                <li key={`${mission.id}-over`}>
                  <button type="button" onClick={() => onNavigate('missions')}>
                    Budget dépassé · {mission.title}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      </div>

      <section className="adm-panel">
        <header className="adm-panel-head">
          <h2>Activité</h2>
        </header>
        {opsError ? <p className="adm-alert">Le centre de commande n’a pas pu charger les opérations.</p> : null}
        <ul className="cmd-list">
          {(ops?.activity || []).map((event) => (
            <li key={event.id}>
              <span>
                {event.actor || 'Admin'} · {event.action}
                <small>{event.detail}</small>
              </span>
              <time>{relativeTime(event.createdAt, locale)}</time>
            </li>
          ))}
          {!ops?.activity?.length ? <li>Aucune action enregistrée pour l’instant.</li> : null}
        </ul>
      </section>
    </div>
  )
}
