import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi } from './api'
import { formatCount, formatDateTime, formatMoney, fullName } from './format'
import { CheckIcon, ChevronIcon, CloseIcon, SearchIcon, SortIcon } from './icons'
import { STATUS_ORDER } from './hooks'
import { Avatar, ErrorState, StatusPill } from './parts'
import { useAdminText } from './strings'
import { confirmationMessage, openWhatsApp } from './whatsapp'

const OFFERS = ['essential', 'advanced', 'premium']
const DURATIONS = ['15d', '1m']
const PAGE_SIZES = [20, 50, 100]
const SEARCH_DELAY = 250

const COLUMNS = [
  { key: 'applicant', sort: 'name' },
  { key: 'city', sort: 'city' },
  { key: 'amount', sort: 'amount', numeric: true },
  { key: 'duration' },
  { key: 'offer' },
  { key: 'date', sort: 'createdAt' },
  { key: 'status', sort: 'status' },
]

const useDebounced = (value, ms) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

export const Applications = ({ version, fresh, onOpen, onChanged }) => {
  const a = useAdminText()
  const { t, locale } = useI18n()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [offer, setOffer] = useState('')
  const [duration, setDuration] = useState('')
  const [sort, setSort] = useState({ key: 'createdAt', order: 'desc' })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(PAGE_SIZES[0])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState({})
  const [attempt, setAttempt] = useState(0)
  const q = useDebounced(query.trim(), SEARCH_DELAY)
  const listRef = useRef(null)

  useEffect(() => {
    setPage(1)
  }, [q, status, offer, duration, sort, limit])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    const params = { page, limit, sort: sort.key, order: sort.order }
    if (q) params.q = q
    if (status) params.status = status
    if (offer) params.offer = offer
    if (duration) params.duration = duration
    adminApi
      .applications(params, controller.signal)
      .then((result) => {
        setData(result)
        setError(null)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err)
        setLoading(false)
      })
    return () => controller.abort()
  }, [q, status, offer, duration, sort, page, limit, version, attempt])

  const toggleSort = (key) =>
    setSort((prev) => (prev.key === key ? { key, order: prev.order === 'asc' ? 'desc' : 'asc' } : { key, order: key === 'name' || key === 'city' ? 'asc' : 'desc' }))

  const changeStatus = useCallback(
    async (item, next) => {
      setBusy((prev) => ({ ...prev, [item.id]: next }))
      try {
        const { item: updated } = await adminApi.setStatus(item.id, next)
        setData((prev) => prev && { ...prev, items: prev.items.map((row) => (row.id === updated.id ? updated : row)) })
        if (next === 'approved' && updated.phone && !openWhatsApp(updated.phone, confirmationMessage(updated))) onOpen(updated.id)
        onChanged()
      } catch {
        setAttempt((n) => n + 1)
      } finally {
        setBusy((prev) => {
          const rest = { ...prev }
          delete rest[item.id]
          return rest
        })
      }
    },
    [onChanged, onOpen],
  )

  const goTo = (next) => {
    setPage(next)
    listRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const counts = data?.counts || {}
  const allCount = STATUS_ORDER.reduce((sum, key) => sum + (counts[key] || 0), 0)
  const filtered = Boolean(q || status || offer || duration)
  const reset = () => {
    setQuery('')
    setStatus('')
    setOffer('')
    setDuration('')
  }

  return (
    <div className="adm-view">
      <header className="adm-view-head">
        <div>
          <p className="kicker">{a('table.kicker')}</p>
          <h1 className="adm-title">{a('table.title')}</h1>
          <p className="adm-lead">{a('table.lead')}</p>
        </div>
      </header>

      <div className="adm-toolbar">
        <label className="adm-search">
          <SearchIcon />
          <span className="sr-only">{a('table.search')}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={a('table.search')} dir="auto" />
          {query ? (
            <button type="button" className="adm-search-clear" onClick={() => setQuery('')} aria-label={a('table.clear')}>
              <CloseIcon size={14} />
            </button>
          ) : null}
        </label>
        <div className="adm-selects">
          <select value={offer} onChange={(event) => setOffer(event.target.value)} aria-label={a('table.offer')}>
            <option value="">{a('table.allOffers')}</option>
            {OFFERS.map((id) => (
              <option key={id} value={id}>
                {t(`offers.items.${id}.name`)}
              </option>
            ))}
          </select>
          <select value={duration} onChange={(event) => setDuration(event.target.value)} aria-label={a('table.duration')}>
            <option value="">{a('table.allDurations')}</option>
            {DURATIONS.map((id) => (
              <option key={id} value={id}>
                {t(`register.durations.${id}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="adm-chips" role="group" aria-label={a('table.statusFilter')}>
        <button type="button" className="adm-chip" aria-pressed={!status} onClick={() => setStatus('')}>
          {a('table.all')}
          <span>{formatCount(allCount, locale)}</span>
        </button>
        {STATUS_ORDER.map((key) => (
          <button key={key} type="button" className="adm-chip" aria-pressed={status === key} onClick={() => setStatus(key)}>
            <i className={`is-${key}`} aria-hidden="true" />
            {a(`statuses.${key}`)}
            <span>{formatCount(counts[key] || 0, locale)}</span>
          </button>
        ))}
        {filtered ? (
          <button type="button" className="adm-link adm-reset" onClick={reset}>
            {a('table.reset')}
          </button>
        ) : null}
      </div>

      <section ref={listRef} className={`adm-panel adm-table-panel${loading && data ? ' is-loading' : ''}`} aria-busy={loading}>
        <span className="adm-progress" aria-hidden="true" />
        {error && !data ? (
          <ErrorState error={error} onRetry={() => setAttempt((n) => n + 1)} />
        ) : !data ? (
          <div className="adm-table-ghosts" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className="adm-ghost is-row" />
            ))}
          </div>
        ) : data.items.length ? (
          <table className="adm-table">
            <caption className="sr-only">
              {a('table.title')} — {a('table.results', { n: formatCount(data.total, locale) })}
            </caption>
            <thead>
              <tr>
                {COLUMNS.map((column) => {
                  const active = column.sort && sort.key === column.sort
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      className={column.numeric ? 'is-num' : undefined}
                      aria-sort={active ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined}
                    >
                      {column.sort ? (
                        <button type="button" className="adm-th" onClick={() => toggleSort(column.sort)} title={a('table.sortBy', { column: a(`table.${column.key}`) })}>
                          {a(`table.${column.key}`)}
                          <SortIcon direction={active ? sort.order : null} />
                        </button>
                      ) : (
                        a(`table.${column.key}`)
                      )}
                    </th>
                  )
                })}
                <th scope="col" className="is-actions">
                  <span className="sr-only">{a('table.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} className={`${fresh.has(item.id) ? 'is-fresh' : ''}${busy[item.id] ? ' is-busy' : ''}`.trim() || undefined} onClick={() => onOpen(item.id)}>
                  <td className="adm-cell-applicant">
                    <Avatar item={item} />
                    <span>
                      <button
                        type="button"
                        className="adm-name"
                        dir="auto"
                        onClick={(event) => {
                          event.stopPropagation()
                          onOpen(item.id)
                        }}
                      >
                        {fullName(item)}
                      </button>
                      <span className="adm-sub" dir="ltr">
                        {item.email || a('detail.noEmail')}
                      </span>
                    </span>
                  </td>
                  <td data-label={a('table.city')} dir="auto">
                    {item.city}
                  </td>
                  <td data-label={a('table.amount')} className="is-num adm-amount" dir="ltr">
                    {formatMoney(item.amount, locale, item.currency)}
                  </td>
                  <td data-label={a('table.duration')}>{t(`register.durations.${item.duration}`)}</td>
                  <td data-label={a('table.offer')}>{t(`offers.items.${item.offer}.name`)}</td>
                  <td data-label={a('table.date')} className="adm-date">
                    {formatDateTime(item.createdAt, locale)}
                  </td>
                  <td data-label={a('table.status')}>
                    <StatusPill status={item.status} />
                  </td>
                  <td className="is-actions" onClick={(event) => event.stopPropagation()}>
                    {item.status === 'pending' ? (
                      <span className="adm-quick">
                        <button
                          type="button"
                          className="adm-quick-btn is-approve"
                          disabled={Boolean(busy[item.id])}
                          onClick={() => changeStatus(item, 'approved')}
                          aria-label={`${a('actions.approved')} — ${fullName(item)}`}
                          title={a('actions.approved')}
                        >
                          <CheckIcon />
                        </button>
                        <button
                          type="button"
                          className="adm-quick-btn is-reject"
                          disabled={Boolean(busy[item.id])}
                          onClick={() => changeStatus(item, 'rejected')}
                          aria-label={`${a('actions.rejected')} — ${fullName(item)}`}
                          title={a('actions.rejected')}
                        >
                          <CloseIcon size={16} />
                        </button>
                      </span>
                    ) : null}
                    <button type="button" className="adm-open" onClick={() => onOpen(item.id)} aria-label={`${a('table.open')} — ${fullName(item)}`}>
                      <ChevronIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="adm-empty">{a(filtered ? 'table.empty' : 'table.none')}</p>
        )}

        {data && data.total ? (
          <footer className="adm-pager">
            <span>{a('table.results', { n: formatCount(data.total, locale) })}</span>
            <label className="adm-perpage">
              {a('table.perPage')}
              <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <span className="adm-pager-nav">
              <button type="button" className="adm-icon-btn is-sm is-prev" disabled={data.page <= 1} onClick={() => goTo(data.page - 1)} aria-label={a('table.prev')}>
                <ChevronIcon />
              </button>
              <span>{a('table.page', { page: formatCount(data.page, locale), pages: formatCount(data.pages, locale) })}</span>
              <button type="button" className="adm-icon-btn is-sm" disabled={data.page >= data.pages} onClick={() => goTo(data.page + 1)} aria-label={a('table.next')}>
                <ChevronIcon />
              </button>
            </span>
          </footer>
        ) : null}
      </section>
    </div>
  )
}
