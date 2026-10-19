import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { fill } from './contentCopy'
import { DateField } from './DatePicker'
import { formatCount, formatDate, formatMoney, parseAmount, relativeDay, relativeTime } from './format'
import { useNow, useScrollHint } from './hooks'
import { ArrowIcon, ChevronIcon, PlusIcon, SearchIcon } from './icons'
import { errorKey, useOpsCopy } from './opsCopy'
import { ErrorState, LoadingState } from './parts'
import { useAdminText } from './strings'

const STATUSES = ['upcoming', 'ongoing', 'completed', 'archived']
const EMPTY = { title: '', description: '', objectives: '', category: '', plannedAt: '', location: '', status: 'upcoming', assignees: '', budget: '', limit: '' }

const toDay = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const toForm = (mission) =>
  mission
    ? {
        title: mission.title,
        description: mission.description,
        objectives: mission.objectives,
        category: mission.category,
        plannedAt: toDay(mission.plannedAt),
        location: mission.location,
        status: mission.status,
        assignees: mission.assignees.join(', '),
        budget: mission.budget ? String(mission.budget) : '',
        limit: mission.limit ? String(mission.limit) : '',
      }
    : EMPTY

const amount = (value) => (String(value ?? '').trim() ? parseAmount(value) : 0)

const SORTS = {
  date: (a, b) => (a.plannedAt ? new Date(a.plannedAt).getTime() : Infinity) - (b.plannedAt ? new Date(b.plannedAt).getTime() : Infinity),
  recent: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  title: (a, b) => a.title.localeCompare(b.title),
  budget: (a, b) => (b.budget || 0) - (a.budget || 0),
}

const Progress = ({ spent, budget }) => {
  const ratio = budget > 0 ? Math.min(1, spent / budget) : 0
  return (
    <span className={`ops-progress${spent > budget && budget > 0 ? ' is-over' : ''}`} aria-hidden="true">
      <i style={{ transform: `scaleX(${ratio})` }} />
    </span>
  )
}

const MissionForm = ({ t, common, mission, onSaved, onCancel }) => {
  const [form, setForm] = useState(() => toForm(mission))
  const [problem, setProblem] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    const budget = amount(form.budget)
    const limit = amount(form.limit)
    if (form.title.trim().length < 3) return setProblem(t.form.invalidTitle)
    if (Number.isNaN(budget) || Number.isNaN(limit)) return setProblem(t.form.invalidAmount)
    setProblem('')
    setSaving(true)
    try {
      const { item } = await adminApi.saveMission({
        ...(mission ? { id: mission.id } : {}),
        ...form,
        title: form.title.trim(),
        assignees: form.assignees.split(',').map((name) => name.trim()).filter(Boolean),
        budget,
        limit,
        plannedAt: form.plannedAt || null,
      })
      onSaved(item, mission ? t.form.updated : fill(t.form.created, { title: item.title }))
    } catch (error) {
      setProblem(error.status === 422 ? t.form.invalidTitle : common.errors[errorKey(error)])
      setSaving(false)
    }
  }

  return (
    <form className="adm-panel ops-form" onSubmit={submit} noValidate>
      <header className="adm-panel-head">
        <h2>{mission ? t.detail.edit : t.create}</h2>
        <button type="button" className="adm-link" onClick={onCancel}>
          {common.cancel}
        </button>
      </header>
      <div className="ops-fields">
        <label className="cmd-field is-wide">
          <span>
            {t.form.title} <em>{common.required}</em>
          </span>
          <input value={form.title} onChange={set('title')} placeholder={t.form.titlePlaceholder} maxLength={140} required aria-invalid={problem === t.form.invalidTitle || undefined} />
        </label>
        <label className="cmd-field">
          <span>{t.form.location}</span>
          <input value={form.location} onChange={set('location')} maxLength={160} />
        </label>
        <label className="cmd-field">
          <span>{t.form.category}</span>
          <input value={form.category} onChange={set('category')} maxLength={80} />
        </label>
        <div className="cmd-field">
          <span id="mission-date-label">{t.form.date}</span>
          <DateField id="mission-date" labelledBy="mission-date-label" value={form.plannedAt} onChange={(plannedAt) => setForm((current) => ({ ...current, plannedAt }))} />
        </div>
        <label className="cmd-field">
          <span>{t.form.status}</span>
          <select value={form.status} onChange={set('status')}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {t.statuses[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="cmd-field">
          <span>{t.form.budget}</span>
          <input value={form.budget} onChange={set('budget')} inputMode="decimal" placeholder="0" />
        </label>
        <label className="cmd-field">
          <span>{t.form.limit}</span>
          <input value={form.limit} onChange={set('limit')} inputMode="decimal" placeholder="0" aria-describedby="mission-limit-hint" />
          <small id="mission-limit-hint" className="ops-hint">
            {t.form.limitHint}
          </small>
        </label>
        <label className="cmd-field is-wide">
          <span>{t.form.assignees}</span>
          <input value={form.assignees} onChange={set('assignees')} aria-describedby="mission-assignees-hint" />
          <small id="mission-assignees-hint" className="ops-hint">
            {t.form.assigneesHint}
          </small>
        </label>
        <label className="cmd-field is-wide">
          <span>{t.form.description}</span>
          <textarea value={form.description} onChange={set('description')} maxLength={4000} rows={4} />
        </label>
        <label className="cmd-field is-wide">
          <span>{t.form.objectives}</span>
          <textarea value={form.objectives} onChange={set('objectives')} maxLength={2000} rows={3} />
        </label>
      </div>
      {problem ? (
        <p className="adm-alert" role="alert">
          {problem}
        </p>
      ) : null}
      <div className="ops-form-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          {common.cancel}
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? common.saving : mission ? t.form.update : t.form.submit}
        </button>
      </div>
    </form>
  )
}

const MissionDetail = ({ t, common, mission, canManage, canFinance, locale, onBack, onEdit, onChanged, onNavigate }) => {
  const a = useAdminText()
  const now = useNow()
  const [note, setNote] = useState('')
  const [report, setReport] = useState(mission.report)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState(null)
  const figures = mission.figures || {}
  const money = (value) => formatMoney(value || 0, locale, mission.currency || 'MAD')

  const patch = async (key, body, done) => {
    setBusy(key)
    setMessage(null)
    try {
      const { item } = await adminApi.saveMission({ id: mission.id, ...body })
      onChanged(item)
      setMessage({ tone: 'ok', text: done(item) })
      return true
    } catch (error) {
      setMessage({ tone: 'error', text: common.errors[errorKey(error)] })
      return false
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="adm-view ops-detail">
      <button type="button" className="adm-link ops-back" onClick={onBack}>
        <ChevronIcon className="adm-chevron is-back" />
        {t.detail.back}
      </button>
      <header className="adm-view-head">
        <div>
          <p className="kicker">{t.title}</p>
          <h1 className="adm-title" dir="auto">
            {mission.title}
          </h1>
          <p className="ops-tags">
            <span className={`hq-tag is-${mission.status}`}>{t.statuses[mission.status]}</span>
            {figures.overrun ? <span className="hq-tag is-late">{t.overrun}</span> : null}
            <span className="adm-muted">
              {[mission.plannedAt ? `${formatDate(mission.plannedAt, locale)} · ${relativeDay(mission.plannedAt, now, locale)}` : t.noDate, mission.location, mission.category].filter(Boolean).join(' · ')}
            </span>
          </p>
        </div>
        {canManage ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit}>
            {t.detail.edit}
          </button>
        ) : null}
      </header>

      {message ? (
        <p className={message.tone === 'ok' ? 'adm-flash' : 'adm-alert'} role={message.tone === 'ok' ? 'status' : 'alert'}>
          {message.text}
        </p>
      ) : null}

      <div className="ops-detail-grid">
        <section className="adm-panel">
          <header className="adm-panel-head">
            <h2>{t.detail.figures}</h2>
            {canFinance ? (
              <button type="button" className="adm-link" onClick={() => onNavigate('caisse', { mission: mission.id })}>
                {t.detail.ledger}
                <ArrowIcon />
              </button>
            ) : null}
          </header>
          {mission.figures ? (
            <>
              <dl className="hq-figures">
                <div>
                  <dt>{t.detail.budget}</dt>
                  <dd>{money(figures.budget)}</dd>
                </div>
                <div>
                  <dt>{t.detail.spent}</dt>
                  <dd>{money(figures.expense)}</dd>
                </div>
                <div>
                  <dt>{t.detail.remaining}</dt>
                  <dd className={figures.remaining < 0 ? 'is-down' : ''}>{money(figures.remaining)}</dd>
                </div>
              </dl>
              <Progress spent={figures.expense || 0} budget={figures.budget || 0} />
              <dl className="hq-figures is-compact">
                <div>
                  <dt>{t.detail.income}</dt>
                  <dd>{money(figures.income)}</dd>
                </div>
                <div>
                  <dt>{t.detail.allocated}</dt>
                  <dd>{money(figures.allocated)}</dd>
                </div>
                <div>
                  <dt>{t.detail.net}</dt>
                  <dd>{money(figures.net)}</dd>
                </div>
              </dl>
            </>
          ) : (
            <dl className="hq-figures is-compact">
              <div>
                <dt>{t.detail.budget}</dt>
                <dd>{money(mission.budget)}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="adm-panel">
          <header className="adm-panel-head">
            <h2>{t.detail.assignees}</h2>
          </header>
          {mission.assignees.length ? (
            <ul className="ops-people">
              {mission.assignees.map((name) => (
                <li key={name} dir="auto">
                  <span aria-hidden="true">{name.trim().slice(0, 1).toUpperCase()}</span>
                  {name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-muted">{t.detail.none}</p>
          )}
          {canManage ? (
            <div className="ops-status">
              <p className="ops-label">{t.detail.status}</p>
              <div className="hq-range is-wrap" role="radiogroup" aria-label={t.detail.status}>
                {STATUSES.map((status) => (
                  <button
                    key={status}
                    type="button"
                    role="radio"
                    aria-checked={mission.status === status}
                    disabled={Boolean(busy)}
                    onClick={() => mission.status !== status && patch('status', { status }, (item) => fill(t.detail.statusSaved, { status: t.statuses[item.status] }))}
                  >
                    {t.statuses[status]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {mission.description || mission.objectives ? (
          <section className="adm-panel ops-span">
            {mission.description ? (
              <>
                <h2 className="ops-label">{t.form.description}</h2>
                <p className="ops-text" dir="auto">
                  {mission.description}
                </p>
              </>
            ) : null}
            {mission.objectives ? (
              <>
                <h2 className="ops-label">{t.form.objectives}</h2>
                <p className="ops-text" dir="auto">
                  {mission.objectives}
                </p>
              </>
            ) : null}
          </section>
        ) : null}

        <section className="adm-panel ops-span">
          <header className="adm-panel-head">
            <h2>{t.detail.timeline}</h2>
          </header>
          {mission.timeline.length ? (
            <ul className="hq-feed">
              {[...mission.timeline].reverse().map((row, index) => (
                <li key={`${row.at}-${index}`}>
                  <span className="hq-feed-who" aria-hidden="true">
                    {(row.actor || '·').trim().slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hq-feed-body">
                    <strong dir="auto">{row.actor || common.unknown}</strong>
                    <small className="ops-text" dir="auto">
                      {row.text}
                    </small>
                  </span>
                  <time dateTime={row.at}>{relativeTime(row.at, now, locale, a('justNow'))}</time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-muted">{t.detail.timelineEmpty}</p>
          )}
          {canManage ? (
            <form
              className="ops-note"
              onSubmit={async (event) => {
                event.preventDefault()
                if (!note.trim()) return
                if (await patch('note', { note: note.trim() }, () => t.detail.noteAdded)) setNote('')
              }}
            >
              <label className="cmd-field">
                <span>{t.detail.note}</span>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder={t.detail.notePlaceholder} maxLength={2000} rows={3} />
              </label>
              <button type="submit" className="btn btn-ghost btn-sm" disabled={!note.trim() || Boolean(busy)}>
                {busy === 'note' ? common.saving : t.detail.addNote}
              </button>
            </form>
          ) : null}
        </section>

        <section className="adm-panel ops-span">
          <header className="adm-panel-head">
            <h2>{t.detail.report}</h2>
          </header>
          {canManage ? (
            <form
              className="ops-note"
              onSubmit={(event) => {
                event.preventDefault()
                patch('report', { report }, () => t.detail.reportSaved)
              }}
            >
              <label className="cmd-field">
                <span className="sr-only">{t.detail.report}</span>
                <textarea value={report} onChange={(event) => setReport(event.target.value)} placeholder={t.detail.reportHint} maxLength={8000} rows={5} />
              </label>
              <button type="submit" className="btn btn-ghost btn-sm" disabled={report === mission.report || Boolean(busy)}>
                {busy === 'report' ? common.saving : t.detail.saveReport}
              </button>
            </form>
          ) : mission.report ? (
            <p className="ops-text" dir="auto">
              {mission.report}
            </p>
          ) : (
            <p className="adm-muted">{t.detail.none}</p>
          )}
        </section>
      </div>
    </div>
  )
}

export const MissionsDesk = ({ intent = null, canManage = false, canFinance = false, onNavigate }) => {
  const { locale } = useI18n()
  const copy = useOpsCopy()
  const t = copy.missions
  const { common } = copy
  const now = useNow()
  const tabsRef = useScrollHint()
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('date')
  const [openId, setOpenId] = useState(intent?.id || null)
  const [editing, setEditing] = useState(intent?.create && canManage ? { mission: null } : null)
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .missions('', controller.signal)
      .then((data) => {
        setItems(data.items)
        setError(null)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err)
      })
    return () => controller.abort()
  }, [attempt])

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((key) => [key, (items || []).filter((item) => item.status === key).length])), [items])
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (items || [])
      .filter((item) => !status || item.status === status)
      .filter((item) => !needle || [item.title, item.location, item.category, ...item.assignees].some((value) => String(value || '').toLowerCase().includes(needle)))
      .sort(SORTS[sort])
  }, [items, status, query, sort])

  const replace = (item) => setItems((list) => [item, ...(list || []).filter((row) => row.id !== item.id)])

  if (error && !items) return <ErrorState error={error} onRetry={() => setAttempt((n) => n + 1)} />
  if (!items) return <LoadingState label={common.loading} rows={4} />

  const open = openId ? items.find((item) => item.id === openId) : null

  if (editing) {
    return (
      <div className="adm-view">
        <MissionForm
          t={t}
          common={common}
          mission={editing.mission}
          onCancel={() => setEditing(null)}
          onSaved={(item, text) => {
            replace(item)
            setEditing(null)
            setOpenId(item.id)
            setNotice(text)
          }}
        />
      </div>
    )
  }

  if (open) {
    return (
      <>
        {notice ? (
          <p className="adm-flash" role="status">
            {notice}
          </p>
        ) : null}
        <MissionDetail
          key={open.id}
          t={t}
          common={common}
          mission={open}
          locale={locale}
          canManage={canManage}
          canFinance={canFinance}
          onNavigate={onNavigate}
          onBack={() => {
            setOpenId(null)
            setNotice('')
          }}
          onEdit={() => {
            setNotice('')
            setEditing({ mission: open })
          }}
          onChanged={(item) => {
            setNotice('')
            replace(item)
          }}
        />
      </>
    )
  }

  return (
    <div className="adm-view">
      <header className="adm-view-head">
        <div>
          <p className="kicker">{t.kicker}</p>
          <h1 className="adm-title">{t.title}</h1>
          <p className="adm-lead">{t.lead}</p>
        </div>
        {canManage ? (
          <button type="button" className="btn btn-primary btn-sm ops-cta" onClick={() => setEditing({ mission: null })}>
            <PlusIcon />
            {t.create}
          </button>
        ) : null}
      </header>

      {!canManage ? <p className="ops-note-banner">{t.assignedOnly}</p> : null}

      <div className="ops-toolbar">
        <div className="hq-range is-tabs" ref={tabsRef} role="tablist" aria-label={t.form.status}>
          <button type="button" role="tab" aria-selected={!status} onClick={() => setStatus('')}>
            {t.filters.all}
            <span className="adm-count">{formatCount(items.length, locale)}</span>
          </button>
          {STATUSES.map((key) => (
            <button key={key} type="button" role="tab" aria-selected={status === key} onClick={() => setStatus(key)}>
              {t.statuses[key]}
              <span className="adm-count">{formatCount(counts[key], locale)}</span>
            </button>
          ))}
        </div>
        <div className="ops-toolbar-row">
          <label className="adm-search">
            <SearchIcon />
            <span className="sr-only">{t.search}</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
          </label>
          <label className="ops-select">
            <span className="sr-only">{t.sort.label}</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label={t.sort.label}>
              {Object.keys(SORTS).map((key) => (
                <option key={key} value={key}>
                  {t.sort.label} : {t.sort[key]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="ops-count" aria-live="polite">
        {fill(t.count, { n: formatCount(visible.length, locale) })}
      </p>

      {visible.length ? (
        <ul className="ops-cards">
          {visible.map((mission) => {
            const figures = mission.figures || {}
            return (
              <li key={mission.id}>
                <button type="button" className={`ops-card${figures.overrun ? ' is-over' : ''}`} onClick={() => setOpenId(mission.id)}>
                  <span className="ops-card-top">
                    <span className={`hq-tag is-${mission.status}`}>{t.statuses[mission.status]}</span>
                    {figures.overrun ? <span className="hq-tag is-late">{t.overrun}</span> : null}
                  </span>
                  <strong dir="auto">{mission.title}</strong>
                  <span className="ops-card-meta">
                    {[mission.plannedAt ? `${formatDate(mission.plannedAt, locale)} · ${relativeDay(mission.plannedAt, now, locale)}` : t.noDate, mission.location].filter(Boolean).join(' · ')}
                  </span>
                  {mission.assignees.length ? (
                    <span className="ops-card-meta" dir="auto">
                      {mission.assignees.join(', ')}
                    </span>
                  ) : null}
                  {figures.budget ? (
                    <span className="ops-card-money">
                      <Progress spent={figures.expense || 0} budget={figures.budget} />
                      <span>
                        {formatMoney(figures.expense || 0, locale, 'MAD')} / {formatMoney(figures.budget, locale, 'MAD')}
                      </span>
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="adm-empty">{items.length ? t.empty : t.none}</p>
      )}
    </div>
  )
}
