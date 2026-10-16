import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { fetchOverview } from './api'
import { formatPercent, formatPrice, trendOf } from './format'
import { instrumentName } from './instruments'

const REFRESH_MS = 15_000
const MAX_RESULTS = 16

/** Polls the watchlist rows for `ids`; rows already received are kept while switching lists. */
const useOverview = (ids) => {
  const key = ids.join(',')
  const [rows, setRows] = useState({})

  useEffect(() => {
    if (!key) return undefined
    let controller
    let timer = 0
    const load = () => {
      controller?.abort()
      controller = new AbortController()
      fetchOverview({ ids: key.split(',') }, controller.signal)
        .then((data) =>
          setRows((prev) => {
            const next = { ...prev }
            for (const row of data.items) if (!row.error) next[row.id] = row
            return next
          }),
        )
        .catch(() => {})
    }
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (!document.hidden) load()
        schedule()
      }, REFRESH_MS)
    }
    load()
    schedule()
    return () => {
      window.clearTimeout(timer)
      controller?.abort()
    }
  }, [key])

  return rows
}

const Sparkline = ({ values, trend }) => {
  if (!values || values.length < 2) return <span className="mkt-spark" aria-hidden="true" />
  const width = 64
  const height = 22
  const min = Math.min(...values)
  const max = Math.max(...values)
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y = max === min ? height / 2 : height - 1 - ((value - min) / (max - min)) * (height - 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className={`mkt-spark is-${trend}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} />
    </svg>
  )
}

/** Market navigator: categories, search and a live watchlist. Selecting a row loads it in the terminal. */
export const MarketNavigator = ({ catalog, error, onRetry, selected, selectedQuote, onSelect }) => {
  const { t, tm, locale } = useI18n()
  const [category, setCategory] = useState(() => catalog?.byId[selected]?.category || 'metals')
  const [query, setQuery] = useState('')
  const search = query.trim().toLowerCase()

  const list = useMemo(() => {
    if (!catalog) return []
    if (!search) return catalog.instruments.filter((item) => item.category === category)
    return catalog.instruments
      .filter((item) =>
        [item.id, item.symbol, item.name, instrumentName(item, tm)].some((value) => value?.toLowerCase().includes(search)),
      )
      .slice(0, MAX_RESULTS)
  }, [catalog, category, search, tm])

  const rows = useOverview(list.map((item) => item.id))
  const listRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ left: 0, top: 0 })
  }, [category, search])

  useEffect(() => {
    listRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selected, category, search, catalog])

  const onSearchKey = (event) => {
    if (event.key === 'Escape' && query) {
      event.preventDefault()
      event.stopPropagation()
      setQuery('')
    }
  }

  return (
    <nav className="term-nav" aria-labelledby="term-nav-title">
      <div className="mkt-head">
        <h3 id="term-nav-title">{t('terminal.markets')}</h3>
        <label className="mkt-search">
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKey}
            placeholder={t('terminal.search')}
            aria-label={t('terminal.search')}
            autoComplete="off"
            spellCheck="false"
          />
        </label>
      </div>

      {catalog ? (
        <div className="mkt-tabs" role="group" aria-label={t('terminal.markets')}>
          {catalog.categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={!search && category === item}
              onClick={() => {
                setCategory(item)
                setQuery('')
              }}
            >
              {t(`terminal.categories.${item}`)}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="mkt-empty">
          <p>{t('terminal.status.error')}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
            {t('terminal.retry')}
          </button>
        </div>
      ) : !catalog ? (
        <ul className="mkt-list is-loading" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((n) => (
            <li key={n}>
              <span className="mkt-row is-skeleton" />
            </li>
          ))}
        </ul>
      ) : list.length ? (
        <ul className="mkt-list" ref={listRef}>
          {list.map((item) => {
            const isSelected = item.id === selected
            const row = rows[item.id]
            const live = isSelected && selectedQuote ? selectedQuote : row
            const trend = trendOf(live?.changePct)
            const open = live ? live.marketOpen : null
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="mkt-row"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(item.id)}
                  title={open === false ? t('terminal.status.closed') : undefined}
                >
                  <span className="mkt-id">
                    <strong dir="ltr">
                      <i className={`mkt-dot${open ? ' is-open' : ''}`} aria-hidden="true" />
                      {item.symbol}
                    </strong>
                    <small>{instrumentName(item, tm)}</small>
                  </span>
                  <Sparkline values={row?.spark} trend={trendOf(row?.changePct)} />
                  <span className="mkt-quote" dir="ltr">
                    <span className="mkt-price">{formatPrice(live?.price, locale, item.digits)}</span>
                    <span className={`mkt-change is-${trend}`}>{formatPercent(live?.changePct, locale)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mkt-empty">{t('terminal.noResults')}</p>
      )}
    </nav>
  )
}

export default MarketNavigator
