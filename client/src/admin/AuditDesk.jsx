import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { fill } from './contentCopy'
import { DateField } from './DatePicker'
import { formatCount, formatDateTime } from './format'
import { useScrollHint } from './hooks'
import { SearchIcon } from './icons'
import { errorKey, useOpsCopy } from './opsCopy'
import { ErrorState, LoadingState } from './parts'

const AREAS = ['all', 'applications', 'missions', 'finance', 'team', 'content', 'registration']

const useDebounced = (value, ms) => {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])
  return settled
}

export const AuditDesk = () => {
  const { locale } = useI18n()
  const copy = useOpsCopy()
  const t = copy.audit
  const { common } = copy
  const tabsRef = useScrollHint()
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [state, setState] = useState({ items: null, more: false, error: null })
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreError, setMoreError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const q = useDebounced(query.trim(), 250)

  const params = {
    q,
    area: area === 'all' ? '' : area,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : '',
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : '',
  }
  const key = JSON.stringify(params)

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .audit(JSON.parse(key), controller.signal)
      .then((data) => setState({ items: data.items, more: data.more, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((current) => ({ ...current, error }))
      })
    return () => controller.abort()
  }, [key, attempt])

  const loadMore = async () => {
    const last = state.items?.[state.items.length - 1]
    if (!last) return
    setLoadingMore(true)
    setMoreError('')
    try {
      const data = await adminApi.audit({ ...params, before: last.id })
      setState((current) => ({ items: [...current.items, ...data.items], more: data.more, error: null }))
    } catch (error) {
      setMoreError(common.errors[errorKey(error)])
    } finally {
      setLoadingMore(false)
    }
  }

  const filtered = Boolean(query.trim() || area !== 'all' || from || to)

  return (
    <div className="adm-view">
      <header className="adm-view-head">
        <div>
          <p className="kicker">{t.kicker}</p>
          <h1 className="adm-title">{t.title}</h1>
          <p className="adm-lead">{t.lead}</p>
        </div>
      </header>

      <div className="ops-toolbar">
        <div className="hq-range is-tabs" ref={tabsRef} role="tablist" aria-label={t.title}>
          {AREAS.map((key) => (
            <button key={key} type="button" role="tab" aria-selected={area === key} onClick={() => setArea(key)}>
              {t.areas[key]}
            </button>
          ))}
        </div>
        <div className="ops-filters">
          <label className="adm-search">
            <SearchIcon />
            <span className="sr-only">{t.search}</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} />
          </label>
          <div className="cmd-field">
            <span id="audit-from-label">{common.from}</span>
            <DateField id="audit-from" labelledBy="audit-from-label" value={from} onChange={setFrom} />
          </div>
          <div className="cmd-field">
            <span id="audit-to-label">{common.to}</span>
            <DateField id="audit-to" labelledBy="audit-to-label" value={to} onChange={setTo} />
          </div>
          {filtered ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setQuery('')
                setArea('all')
                setFrom('')
                setTo('')
              }}
            >
              {common.reset}
            </button>
          ) : null}
        </div>
      </div>

      {state.error && !state.items ? (
        <ErrorState error={state.error} onRetry={() => setAttempt((n) => n + 1)} />
      ) : !state.items ? (
        <LoadingState label={common.loading} rows={6} />
      ) : state.items.length ? (
        <section className="adm-panel">
          <p className="ops-count" aria-live="polite">
            {fill(t.count, { n: formatCount(state.items.length, locale) })}
          </p>
          <ul className="hq-feed is-journal">
            {state.items.map((event) => (
              <li key={event.id}>
                <span className="hq-feed-who" aria-hidden="true">
                  {(event.actor || '·').trim().slice(0, 1).toUpperCase()}
                </span>
                <span className="hq-feed-body">
                  <strong>{t.actions[event.action] || event.action}</strong>
                  <small dir="auto">{[event.actor || common.unknown, event.detail].filter(Boolean).join(' · ')}</small>
                </span>
                <time dateTime={event.createdAt}>{formatDateTime(event.createdAt, locale)}</time>
              </li>
            ))}
          </ul>
          {moreError ? (
            <p className="adm-alert" role="alert">
              {moreError}
            </p>
          ) : null}
          {state.more ? (
            <div className="ops-more">
              <button type="button" className="btn btn-ghost btn-sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? common.loading : t.more}
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="adm-empty">{t.empty}</p>
      )}
    </div>
  )
}
