import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { DailyChart, StatusBreakdown } from './charts'
import { fill } from './contentCopy'
import { formatClock, formatCount, formatDate, formatMoney, formatMonth, fullName, relativeDay, relativeTime } from './format'
import { useCountUp, useNow } from './hooks'
import { ApplicationsIcon, ArrowIcon, CalendarIcon, ContentIcon, MissionIcon, PlusIcon, RefreshIcon, SearchIcon, TeamIcon, WalletIcon } from './icons'
import { useOpsCopy } from './opsCopy'
import { Avatar, ErrorState, StatusPill } from './parts'
import { useAdminText } from './strings'

const RANGES = [7, 30, 90]

const Kpi = ({ label, value, format, foot, accent, index, onClick }) => {
  const shown = useCountUp(value)
  const body = (
    <>
      <span className="adm-kpi-label">{label}</span>
      <span className="adm-kpi-value">{format(Math.round(shown))}</span>
      <span className="adm-kpi-foot">{foot}</span>
    </>
  )
  const className = `adm-kpi${accent ? ' is-accent' : ''}${onClick ? ' is-link' : ''}`
  return onClick ? (
    <button type="button" className={className} style={{ '--i': index }} onClick={onClick}>
      {body}
    </button>
  ) : (
    <article className={className} style={{ '--i': index }}>
      {body}
    </article>
  )
}

const Panel = ({ title, aside, className = '', children }) => (
  <section className={`adm-panel hq-panel ${className}`.trim()}>
    <header className="adm-panel-head">
      <h2>{title}</h2>
      {aside}
    </header>
    {children}
  </section>
)

const GoLink = ({ label, onClick }) => (
  <button type="button" className="adm-link" onClick={onClick}>
    {label}
    <ArrowIcon />
  </button>
)

const Skeleton = () => (
  <div className="adm-skeleton" aria-hidden="true">
    <div className="adm-kpis">
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="adm-ghost is-kpi" />
      ))}
    </div>
    <div className="hq-grid">
      <div className="adm-ghost is-chart hq-span-8" />
      <div className="adm-ghost is-side hq-span-4" />
    </div>
  </div>
)

const GlobalSearch = ({ t, show, onOpen, onNavigate }) => {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState({ q: '', hits: null, failed: false })
  const q = query.trim()

  useEffect(() => {
    if (q.length < 2) return undefined
    const controller = new AbortController()
    const timer = setTimeout(() => {
      adminApi
        .search(q, controller.signal)
        .then((hits) => setResult({ q, hits, failed: false }))
        .catch((error) => {
          if (error.name !== 'AbortError') setResult({ q, hits: null, failed: true })
        })
    }, 220)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  const scopes = [show.notifications ? t.search.members : null, t.search.missions, show.content ? t.search.stories : null].filter(Boolean)
  const current = result.q === q ? result : null
  const hits = current?.hits
  const total = hits ? hits.applications.length + hits.missions.length + hits.stories.length : 0
  const pick = (action) => {
    setQuery('')
    action()
  }

  return (
    <div className="hq-search">
      <label className="adm-search">
        <SearchIcon />
        <span className="sr-only">{t.search.label}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
          placeholder={`${t.search.placeholder} ${scopes.join(' · ')}`}
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>
      {q ? (
        <div className="hq-results" role="region" aria-live="polite" aria-label={t.search.label}>
          {q.length < 2 ? (
            <p className="hq-results-note">{t.search.hint}</p>
          ) : current?.failed ? (
            <p className="hq-results-note is-error">{t.common?.errors?.load}</p>
          ) : !hits ? (
            <p className="hq-results-note">
              <span className="adm-spinner" aria-hidden="true" />
            </p>
          ) : !total ? (
            <p className="hq-results-note">{fill(t.search.empty, { q })}</p>
          ) : (
            <>
              {hits.applications.length ? (
                <div className="hq-results-group">
                  <p>{t.search.groups.applications}</p>
                  {hits.applications.map((item) => (
                    <button key={item.id} type="button" onClick={() => pick(() => onOpen(item.id))}>
                      <ApplicationsIcon />
                      <span dir="auto">{item.name}</span>
                      <small dir="auto">{item.city}</small>
                      <StatusPill status={item.status} />
                    </button>
                  ))}
                </div>
              ) : null}
              {hits.missions.length ? (
                <div className="hq-results-group">
                  <p>{t.search.groups.missions}</p>
                  {hits.missions.map((item) => (
                    <button key={item.id} type="button" onClick={() => pick(() => onNavigate('missions', { id: item.id }))}>
                      <MissionIcon />
                      <span dir="auto">{item.title}</span>
                      <small dir="auto">{item.location}</small>
                      <span className={`hq-tag is-${item.status}`}>{t.missionStatus[item.status]}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {hits.stories.length ? (
                <div className="hq-results-group">
                  <p>{t.search.groups.stories}</p>
                  {hits.stories.map((item) => (
                    <button key={item.id} type="button" onClick={() => pick(() => onNavigate('content', { id: item.id }))}>
                      <ContentIcon />
                      <span dir="auto">{item.title}</span>
                      <small />
                      {item.published ? null : <span className="hq-tag">{t.search.draft}</span>}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export const CommandHome = ({ actor, permit, show, stats, error, onRetry, days, onDays, version, onOpen, onNavigate }) => {
  const copy = useOpsCopy()
  const t = { ...copy.home, common: copy.common, missionStatus: copy.missions.statuses }
  const a = useAdminText()
  const { locale } = useI18n()
  const now = useNow()
  const [ops, setOps] = useState(null)
  const [opsError, setOpsError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .summary(controller.signal)
      .then((data) => {
        setOps(data)
        setOpsError(null)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setOpsError(err)
      })
    return () => controller.abort()
  }, [version, attempt])

  if (!stats && !ops) return error && opsError ? <ErrorState error={error} onRetry={() => (onRetry(), setAttempt((n) => n + 1))} /> : <Skeleton />

  const money = (value) => formatMoney(value, locale, ops?.finance?.currency || 'MAD')
  const ago = (value) => relativeTime(value, now, locale, a('justNow'))
  const count = (key) => stats?.statuses?.[key]?.count || 0
  const waiting = count('new') + count('pending')
  const reviewing = count('review')
  const missions = ops?.missions
  const finance = ops?.finance
  const period = stats?.period
  const go = (view, intent) => () => onNavigate(view, intent)
  const retryOps = () => setAttempt((n) => n + 1)
  const opsFailed = !ops && opsError

  const delta = period ? period.received - period.previous : 0
  const deltaText = !period ? '' : !period.previous && !period.received ? t.flow.noPrevious : delta > 0 ? fill(t.flow.up, { n: formatCount(delta, locale) }) : delta < 0 ? fill(t.flow.down, { n: formatCount(-delta, locale) }) : t.flow.same

  const quick = [
    show.applications ? { key: 'review', icon: ApplicationsIcon, label: t.quick.review, badge: waiting, onClick: go('applications') } : null,
    permit('missions.manage') ? { key: 'mission', icon: PlusIcon, label: t.quick.mission, onClick: go('missions', { create: true }) } : null,
    permit('finance.record') ? { key: 'entry', icon: WalletIcon, label: t.quick.entry, onClick: go('caisse', { create: true }) } : null,
    show.content ? { key: 'story', icon: ContentIcon, label: t.quick.story, onClick: go('content', { create: true }) } : null,
    show.registration ? { key: 'registration', icon: CalendarIcon, label: t.quick.registration, onClick: go('registration') } : null,
    show.team ? { key: 'team', icon: TeamIcon, label: t.quick.team, onClick: go('team') } : null,
  ].filter(Boolean)

  const queue = []
  if (stats && show.applications && waiting) {
    queue.push({
      key: 'waiting',
      tone: 'alert',
      text: fill(t.queue.waiting, { n: formatCount(waiting, locale) }),
      hint: period?.oldestWaiting ? fill(t.queue.waitingSince, { time: ago(period.oldestWaiting) }) : '',
      onClick: go('applications'),
    })
  }
  if (stats && show.applications && reviewing) {
    queue.push({ key: 'review', text: fill(t.queue.review, { n: formatCount(reviewing, locale) }), hint: t.queue.reviewHint, onClick: go('applications') })
  }
  if (finance?.unapproved) {
    queue.push({ key: 'unapproved', tone: 'alert', text: fill(t.queue.unapproved, { n: formatCount(finance.unapproved, locale) }), hint: t.queue.unapprovedHint, onClick: go('caisse') })
  }
  ;(ops?.deadlines || [])
    .filter((mission) => mission.overdue)
    .forEach((mission) =>
      queue.push({
        key: `overdue-${mission.id}`,
        tone: 'alert',
        text: fill(t.queue.overdue, { title: mission.title }),
        hint: fill(t.queue.overdueHint, { time: relativeDay(mission.plannedAt, now, locale) }),
        onClick: go('missions', { id: mission.id }),
      }),
    )
  ;(missions?.overrun || []).forEach((mission) =>
    queue.push({ key: `overrun-${mission.id}`, tone: 'alert', text: fill(t.queue.overrun, { title: mission.title }), hint: t.queue.overrunHint, onClick: go('missions', { id: mission.id }) }),
  )
  if (permit('missions.manage') && missions?.unscheduled) {
    queue.push({ key: 'unscheduled', text: fill(t.queue.unscheduled, { n: formatCount(missions.unscheduled, locale) }), hint: t.queue.unscheduledHint, onClick: go('missions') })
  }
  if (ops?.content?.drafts) {
    queue.push({ key: 'drafts', text: fill(t.queue.drafts, { n: formatCount(ops.content.drafts, locale) }), hint: t.queue.draftsHint, onClick: go('content') })
  }
  if (ops?.content?.withoutImages) {
    queue.push({ key: 'images', text: fill(t.queue.noImages, { n: formatCount(ops.content.withoutImages, locale) }), hint: t.queue.noImagesHint, onClick: go('content') })
  }

  const phase = ops?.registration?.phase
  const firstName = actor?.superAdmin ? '' : String(actor?.name || '').trim().split(/\s+/)[0]

  return (
    <div className="adm-view hq">
      <header className="adm-view-head">
        <div>
          <p className="kicker">{t.kicker}</p>
          <h1 className="adm-title">{firstName ? fill(t.hello, { name: firstName }) : t.title}</h1>
          <p className="adm-lead">{t.lead}</p>
        </div>
        <div className="hq-stamp">
          {stats ? (
            (error || opsError) && ops ? (
              <p className="adm-stamp is-stale" role="status">
                {fill(t.common.stale, { time: formatClock(ops.generatedAt || stats.generatedAt, locale) })}
              </p>
            ) : (
              <p className="adm-stamp">{fill(t.common.updated, { time: formatClock(stats.generatedAt, locale) })}</p>
            )
          ) : null}
          <button
            type="button"
            className="adm-icon-btn is-sm"
            onClick={() => {
              onRetry()
              retryOps()
            }}
            aria-label={t.common.refresh}
            title={t.common.refresh}
          >
            <RefreshIcon />
          </button>
        </div>
      </header>

      <GlobalSearch t={t} show={show} onOpen={onOpen} onNavigate={onNavigate} />

      {quick.length ? (
        <nav className="hq-actions" aria-label={t.quick.title}>
          {quick.map((action) => {
            const Icon = action.icon
            return (
              <button key={action.key} type="button" className="hq-action" onClick={action.onClick}>
                <span className="hq-action-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span>{action.label}</span>
                {action.badge ? <span className="adm-count is-alert">{formatCount(action.badge, locale)}</span> : null}
              </button>
            )
          })}
        </nav>
      ) : null}

      <div className="adm-kpis hq-kpis">
        {stats ? (
          <>
            <Kpi
              index={0}
              label={t.kpi.waiting}
              value={waiting}
              format={(n) => formatCount(n, locale)}
              accent={waiting > 0}
              foot={waiting && period?.oldestWaiting ? fill(t.kpi.waitingFoot, { time: ago(period.oldestWaiting) }) : t.kpi.waitingNone}
              onClick={show.applications ? go('applications') : null}
            />
            <Kpi
              index={1}
              label={t.kpi.applications}
              value={stats.total || 0}
              format={(n) => formatCount(n, locale)}
              foot={fill(t.kpi.applicationsFoot, { n: formatCount(period?.received || 0, locale), range: t.flow.ranges[days] })}
              onClick={show.applications ? go('applications') : null}
            />
          </>
        ) : null}
        {missions ? (
          <Kpi
            index={2}
            label={missions.scope === 'assigned' ? t.kpi.missionsAssigned : t.kpi.missions}
            value={(missions.upcoming || 0) + (missions.ongoing || 0)}
            format={(n) => formatCount(n, locale)}
            foot={fill(t.kpi.missionsFoot, { ongoing: formatCount(missions.ongoing || 0, locale), upcoming: formatCount(missions.upcoming || 0, locale) })}
            onClick={go('missions')}
          />
        ) : null}
        {finance ? (
          <Kpi
            index={3}
            label={t.kpi.caisse}
            value={finance.balance}
            format={money}
            foot={fill(t.kpi.caisseFoot, { income: money(finance.month.income), expense: money(finance.month.expense) })}
            onClick={go('caisse')}
          />
        ) : ops ? (
          <Kpi index={3} label={t.kpi.members} value={ops.members} format={(n) => formatCount(n, locale)} foot={t.kpi.membersFoot} />
        ) : null}
      </div>

      <div className="hq-grid">
        <Panel
          title={t.flow.title}
          className="hq-span-8 is-chart"
          aside={
            <div className="hq-range" role="radiogroup" aria-label={t.flow.range}>
              {RANGES.map((range) => (
                <button key={range} type="button" role="radio" aria-checked={days === range} onClick={() => onDays(range)}>
                  {t.flow.ranges[range]}
                </button>
              ))}
            </div>
          }
        >
          {stats ? (
            <>
              <dl className="hq-figures">
                <div>
                  <dt>{t.flow.received}</dt>
                  <dd>{formatCount(period?.received || 0, locale)}</dd>
                </div>
                <div>
                  <dt>{t.flow.accepted}</dt>
                  <dd>{formatCount(period?.decided.accepted || 0, locale)}</dd>
                </div>
                <div>
                  <dt>{t.flow.rejected}</dt>
                  <dd>{formatCount(period?.decided.rejected || 0, locale)}</dd>
                </div>
              </dl>
              <p className={`hq-delta${delta > 0 ? ' is-up' : delta < 0 ? ' is-down' : ''}`}>{deltaText}</p>
              <DailyChart daily={stats.daily} days={stats.days} locale={locale} periodLabel={t.flow.ranges[stats.days]} emptyLabel={fill(t.flow.empty, { range: t.flow.ranges[stats.days] })} />
            </>
          ) : error ? (
            <ErrorState error={error} onRetry={onRetry} />
          ) : (
            <div className="adm-ghost is-chart" />
          )}
        </Panel>

        <Panel title={t.queue.title} className="hq-span-4 hq-queue">
          {opsFailed ? (
            <ErrorState error={opsError} onRetry={retryOps} />
          ) : !ops || !stats ? (
            <div className="adm-ghost is-side" />
          ) : queue.length ? (
            <ul className="hq-list">
              {queue.map((item) => (
                <li key={item.key}>
                  <button type="button" className={`hq-row${item.tone ? ` is-${item.tone}` : ''}`} onClick={item.onClick}>
                    <i aria-hidden="true" />
                    <span>
                      <strong dir="auto">{item.text}</strong>
                      {item.hint ? <small>{item.hint}</small> : null}
                    </span>
                    <ArrowIcon />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hq-done">{t.queue.empty}</p>
          )}
        </Panel>

        {stats && show.notifications ? (
          <>
            <Panel title={t.recent.title} className="hq-span-8" aside={show.applications ? <GoLink label={t.recent.all} onClick={go('applications')} /> : null}>
              {stats.latest?.length ? (
                <ul className="adm-recent">
                  {stats.latest.map((item) => (
                    <li key={item.id} className="adm-recent-item">
                      <Avatar item={item} viewable={show.applications} />
                      <button type="button" className="adm-recent-row" onClick={() => onOpen(item.id)}>
                        <span className="adm-recent-id">
                          <strong dir="auto">{fullName(item)}</strong>
                          <span dir="auto">
                            {[item.city, ago(item.createdAt)].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <StatusPill status={item.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="adm-empty">{t.recent.empty}</p>
              )}
            </Panel>
            <Panel title={t.statuses} className="hq-span-4">
              <StatusBreakdown stats={stats} locale={locale} />
            </Panel>
          </>
        ) : null}

        <Panel title={t.deadlines.title} className="hq-span-8" aside={<GoLink label={t.deadlines.all} onClick={go('missions')} />}>
          {opsFailed ? (
            <ErrorState error={opsError} onRetry={retryOps} />
          ) : !ops ? (
            <div className="adm-ghost is-list" />
          ) : ops.deadlines.length ? (
            <ul className="hq-list">
              {ops.deadlines.map((mission) => (
                <li key={mission.id}>
                  <button type="button" className={`hq-row is-mission${mission.overdue ? ' is-alert' : ''}`} onClick={go('missions', { id: mission.id })}>
                    <span className="hq-date" aria-hidden="true">
                      <strong>{formatCount(new Date(mission.plannedAt).getDate(), locale)}</strong>
                      <small>{formatMonth(mission.plannedAt, locale)}</small>
                    </span>
                    <span>
                      <strong dir="auto">{mission.title}</strong>
                      <small>
                        {[relativeDay(mission.plannedAt, now, locale), mission.location].filter(Boolean).join(' · ')}
                      </small>
                    </span>
                    <span className={`hq-tag is-${mission.overdue ? 'late' : mission.status}`}>{mission.overdue ? t.deadlines.overdue : t.missionStatus[mission.status]}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty">{t.deadlines.empty}</p>
          )}
        </Panel>

        <div className="hq-span-4 hq-stack">
          {ops ? (
            <Panel title={t.registration.title} className="hq-reg" aside={show.registration ? <GoLink label={t.registration.manage} onClick={go('registration')} /> : null}>
              <p className={`hq-phase is-${phase}`}>
                <i aria-hidden="true" />
                {t.registration[phase] || phase}
              </p>
              <ul className="hq-meta">
                {ops.registration.opensAt && phase === 'scheduled' ? <li>{fill(t.registration.opensAt, { date: formatDate(ops.registration.opensAt, locale) })}</li> : null}
                {ops.registration.closesAt && phase === 'open' ? <li>{fill(t.registration.closesAt, { date: formatDate(ops.registration.closesAt, locale) })}</li> : null}
                <li>{ops.registration.override === 'auto' ? t.registration.auto : t.registration.forced}</li>
              </ul>
            </Panel>
          ) : null}
          {ops?.content ? (
            <Panel title={t.content.title} aside={<GoLink label={t.content.manage} onClick={go('content')} />}>
              <dl className="hq-figures is-compact">
                <div>
                  <dt>{t.content.published}</dt>
                  <dd>{formatCount(ops.content.published, locale)}</dd>
                </div>
                <div>
                  <dt>{t.content.drafts}</dt>
                  <dd>{formatCount(ops.content.drafts, locale)}</dd>
                </div>
                <div>
                  <dt>{t.content.featured}</dt>
                  <dd>{formatCount(ops.content.featured, locale)}</dd>
                </div>
              </dl>
            </Panel>
          ) : null}
          {ops && finance ? (
            <Panel title={t.kpi.members}>
              <p className="hq-big">{formatCount(ops.members, locale)}</p>
              <p className="adm-muted">{t.kpi.membersFoot}</p>
            </Panel>
          ) : null}
        </div>

        {ops?.activity ? (
          <Panel title={t.activity.title} className="hq-span-12" aside={show.audit ? <GoLink label={t.activity.all} onClick={go('audit')} /> : null}>
            {ops.activity.length ? (
              <ul className="hq-feed">
                {ops.activity.map((event) => (
                  <li key={event.id}>
                    <span className="hq-feed-who" aria-hidden="true">
                      {(event.actor || '·').trim().slice(0, 1).toUpperCase()}
                    </span>
                    <span className="hq-feed-body">
                      <strong>{copy.audit.actions[event.action] || event.action}</strong>
                      <small dir="auto">{[event.actor || t.common.unknown, event.detail].filter(Boolean).join(' · ')}</small>
                    </span>
                    <time dateTime={event.createdAt}>{ago(event.createdAt)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-empty">{t.activity.empty}</p>
            )}
          </Panel>
        ) : null}
      </div>
    </div>
  )
}
