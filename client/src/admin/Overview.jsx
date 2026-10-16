import { useI18n } from '../i18n/I18nProvider'
import { BarList, DailyChart, StatusBreakdown } from './charts'
import { dayKey, formatClock, formatCount, formatMoney, formatShare, fullName, relativeTime } from './format'
import { ChevronIcon } from './icons'
import { useCountUp, useNow } from './hooks'
import { Avatar, ErrorState, StatusPill } from './parts'
import { useAdminText } from './strings'

const Kpi = ({ label, value, foot, accent, index, locale }) => {
  const shown = useCountUp(value)
  return (
    <article className={`adm-kpi${accent ? ' is-accent' : ''}`} style={{ '--i': index }}>
      <p className="adm-kpi-label">{label}</p>
      <p className="adm-kpi-value">{formatCount(Math.round(shown), locale)}</p>
      <p className="adm-kpi-foot">{foot}</p>
    </article>
  )
}

const Panel = ({ title, aside, className = '', children }) => (
  <section className={`adm-panel ${className}`.trim()}>
    <header className="adm-panel-head">
      <h2>{title}</h2>
      {aside}
    </header>
    {children}
  </section>
)

const OverviewSkeleton = () => (
  <div className="adm-skeleton" aria-hidden="true">
    <div className="adm-kpis">
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="adm-ghost is-kpi" />
      ))}
    </div>
    <div className="adm-grid">
      <div className="adm-ghost is-chart" />
      <div className="adm-ghost is-side" />
    </div>
  </div>
)

export const Overview = ({ stats, error, onRetry, onOpen, onViewAll }) => {
  const a = useAdminText()
  const { locale } = useI18n()
  const now = useNow()

  if (!stats) return error ? <ErrorState error={error} onRetry={onRetry} /> : <OverviewSkeleton />

  const { statuses, total } = stats
  const countOf = (key) => statuses[key]?.count || 0
  const today = stats.daily.find((row) => row.day === dayKey(new Date()))?.count || 0
  const incoming = countOf('new') + countOf('pending')
  const reading = countOf('review')
  const accepted = countOf('accepted') + countOf('approved')
  const share = (count) => a('overview.kpi.share', { pct: formatShare(total ? count / total : 0, locale) })

  return (
    <div className="adm-view">
      <header className="adm-view-head">
        <div>
          <p className="kicker">{a('overview.kicker')}</p>
          <h1 className="adm-title">{a('overview.title')}</h1>
          <p className="adm-lead">{a('overview.lead')}</p>
        </div>
        <p className="adm-stamp">{a('overview.updated', { time: formatClock(stats.generatedAt, locale) })}</p>
      </header>

      <div className="adm-kpis">
        <Kpi index={0} locale={locale} label={a('overview.kpi.total')} value={total} foot={a('overview.kpi.today', { n: formatCount(today, locale) })} />
        <Kpi index={1} locale={locale} accent label={a('overview.kpi.pending')} value={incoming} foot={share(incoming)} />
        <Kpi index={2} locale={locale} label={a('overview.kpi.active')} value={reading} foot={share(reading)} />
        <Kpi index={3} locale={locale} label={a('overview.kpi.completed')} value={accepted} foot={share(accepted)} />
      </div>

      <div className="adm-grid">
        <Panel title={a('overview.chart.title')} aside={<span className="adm-panel-note">{a('overview.chart.period')}</span>} className="is-chart">
          <DailyChart daily={stats.daily} days={stats.days} locale={locale} />
        </Panel>

        <Panel title={a('overview.distribution')} aside={<span className="adm-panel-note">{a('overview.capital')}</span>} className="is-side">
          <StatusBreakdown stats={stats} locale={locale} />
        </Panel>

        <Panel
          title={a('overview.recent')}
          className="is-recent"
          aside={
            <button type="button" className="adm-link" onClick={onViewAll}>
              {a('overview.viewAll')}
              <ChevronIcon />
            </button>
          }
        >
          {stats.latest.length ? (
            <ul className="adm-recent">
              {stats.latest.map((item) => (
                <li key={item.id}>
                  <button type="button" className="adm-recent-row" onClick={() => onOpen(item.id)}>
                    <Avatar item={item} />
                    <span className="adm-recent-id">
                      <strong dir="auto">{fullName(item)}</strong>
                      <span dir="auto">
                        {item.city} · {relativeTime(item.createdAt, now, locale, a('justNow'))}
                      </span>
                    </span>
                    <span className="adm-recent-amount" dir="ltr">
                      {item.kind === 'membership' ? (item.squads || []).join(' · ') || '—' : formatMoney(item.amount, locale, item.currency)}
                    </span>
                    <StatusPill status={item.status} />
                    <ChevronIcon />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">{a('overview.empty')}</p>
          )}
        </Panel>

        <div className="adm-stackcol">
          <Panel title={a('overview.archive')}>
            <BarList
              locale={locale}
              rows={[
                { key: 'missions', label: a('overview.missions'), count: stats.archive?.missions || 0 },
                { key: 'published', label: a('overview.archive'), count: stats.archive?.published || 0 },
              ]}
            />
          </Panel>
          <Panel title={a('overview.membership')}>
            <BarList
              locale={locale}
              rows={[
                { key: 'membership', label: a('overview.membership'), count: stats.offers.membership?.count || 0 },
                {
                  key: 'earlier',
                  label: a('overview.earlier'),
                  count: Math.max(0, total - (stats.offers.membership?.count || 0)),
                },
              ]}
            />
          </Panel>
        </div>
      </div>
    </div>
  )
}
