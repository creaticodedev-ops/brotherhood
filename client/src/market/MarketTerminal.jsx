import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { Logo } from '../landing/ui'
import { fetchCandles, GOLD, TIMEFRAMES } from './api'
import { formatPercent, formatPrice, formatSigned, formatTime, trendOf } from './format'
import { instrumentMeta, instrumentName, useInstruments } from './instruments'
import { MarketNavigator } from './MarketNavigator'
import { retryQuote, useQuote } from './quoteStore'
import { computeStats, rangePosition } from './stats'
import { TerminalChart } from './TerminalChart'
import './market.css'

const PERIODS = ['w1', 'm1', 'm3', 'ytd', 'y1']
const RETRY_MS = 5000

/** Loads candles for `symbol` / `tf` and refreshes them every `refreshMs`. */
const useCandles = (symbol, tf, refreshMs) => {
  const key = `${symbol}|${tf}`
  const [state, setState] = useState({ key: null, candles: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let controller
    let timer = 0
    const load = () => {
      controller?.abort()
      controller = new AbortController()
      fetchCandles(symbol, tf, controller.signal)
        .then((data) => {
          setState({ key, candles: data.candles, error: null })
          timer = window.setTimeout(load, refreshMs)
        })
        .catch((error) => {
          if (error.name === 'AbortError') return
          setState((prev) => (prev.key === key ? { ...prev, error: error.message } : { key, candles: null, error: error.message }))
          timer = window.setTimeout(load, Math.min(refreshMs, RETRY_MS))
        })
    }
    load()
    return () => {
      window.clearTimeout(timer)
      controller?.abort()
    }
  }, [key, symbol, tf, refreshMs, attempt])

  const reload = () => setAttempt((n) => n + 1)
  return state.key === key ? { ...state, reload } : { key, candles: null, error: null, reload }
}

const Trend = ({ value }) => (
  <svg className="trend-glyph" width="9" height="9" viewBox="0 0 10 10" aria-hidden="true">
    {value === 'down' ? <path d="M1 3h8L5 8z" /> : value === 'up' ? <path d="M1 7h8L5 2z" /> : <path d="M1 4.5h8v1H1z" />}
  </svg>
)

const RangeBar = ({ low, high, value, locale, digits, lowLabel, highLabel }) => {
  const pos = rangePosition(value, low, high)
  return (
    <div className="range">
      <div className="range-track" dir="ltr">
        {pos != null ? <span className="range-fill" style={{ '--pos': pos }} /> : null}
        {pos != null ? <i className="range-dot" style={{ '--pos': pos }} /> : null}
      </div>
      <div className="range-ends" dir="ltr">
        <span>
          <small>{lowLabel}</small>
          {formatPrice(low, locale, digits)}
        </span>
        <span>
          <small>{highLabel}</small>
          {formatPrice(high, locale, digits)}
        </span>
      </div>
    </div>
  )
}

const PriceDisplay = ({ value, locale, digits, direction, seq }) => {
  const text = formatPrice(value, locale, digits)
  const cut = digits > 0 ? Math.max(text.lastIndexOf(','), text.lastIndexOf('.')) : -1
  return (
    <p key={seq} className={`term-price${direction ? ` is-${direction}` : ''}`} dir="ltr" aria-live="off">
      <span>{cut > 0 ? text.slice(0, cut) : text}</span>
      {cut > 0 ? <small>{text.slice(cut)}</small> : null}
    </p>
  )
}

export const MarketTerminal = ({ onClose }) => {
  const { t, tm, locale } = useI18n()
  const [symbol, setSymbol] = useState(GOLD)
  const [tf, setTf] = useState('15m')
  const [chartType, setChartType] = useState('candles')
  const instruments = useInstruments()
  const meta = instrumentMeta(instruments.catalog, symbol)
  const digits = meta?.digits ?? 2
  const live = useQuote(symbol)
  const series = useCandles(symbol, tf, tf === '1m' ? 20_000 : 60_000)
  const daily = useCandles(symbol, '1d', 5 * 60_000)
  const quote = live.quote

  const stats = useMemo(() => computeStats(daily.candles, quote?.price, meta?.days), [daily.candles, quote?.price, meta?.days])
  const maxPerf = stats ? Math.max(1, ...PERIODS.map((p) => Math.abs(stats.performance[p] ?? 0))) : 1
  const changeTrend = trendOf(quote?.change)

  useEffect(() => {
    const onKey = (event) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey || event.altKey) return
      const index = Number(event.key) - 1
      if (index >= 0 && index < TIMEFRAMES.length) setTf(TIMEFRAMES[index])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const legendLabels = { O: t('terminal.legend.o'), H: t('terminal.legend.h'), L: t('terminal.legend.l'), C: t('terminal.legend.c') }
  const displaySymbol = meta?.symbol ?? symbol
  const subtitle = meta
    ? [instrumentName(meta, tm), t(`terminal.categories.${meta.category}`), meta.base ? null : meta.currency].filter(Boolean).join(' · ')
    : ''

  return (
    <div className="term">
      <header className="term-bar">
        <div className="term-brand">
          <Logo className="term-logo" />
          <span className="term-divider" aria-hidden="true" />
          <h2 id="terminal-title">{t('terminal.title')}</h2>
        </div>
        <div className={`term-status is-${live.status}`} role="status">
          <i aria-hidden="true" />
          <span>{t(`terminal.status.${live.status}`)}</span>
          {quote ? (
            <time dir="ltr" dateTime={new Date(quote.ts).toISOString()}>
              {formatTime(quote.ts, locale)}
            </time>
          ) : null}
        </div>
        <button type="button" className="term-close" onClick={onClose} aria-label={t('terminal.close')}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="term-body">
        <MarketNavigator
          catalog={instruments.catalog}
          error={instruments.error}
          onRetry={instruments.retry}
          selected={symbol}
          selectedQuote={quote}
          onSelect={setSymbol}
        />

        <section className="term-main" aria-label={t('terminal.chartLabel', { symbol: displaySymbol })}>
          <div className="term-quote" key={symbol}>
            <div className="term-instrument">
              <span className="term-symbol" dir="ltr">
                {displaySymbol}
              </span>
              <span className="term-name">{subtitle}</span>
            </div>
            <div className="term-price-row">
              {quote ? (
                <PriceDisplay value={quote.price} locale={locale} digits={digits} direction={live.direction} seq={live.seq} />
              ) : (
                <p className="term-price is-skeleton" aria-hidden="true">
                  <span>0 000</span>
                </p>
              )}
              <p className={`term-change is-${changeTrend}`} dir="ltr">
                <Trend value={changeTrend} />
                <span>{formatSigned(quote?.change, locale, digits)}</span>
                <span>({formatPercent(quote?.changePct, locale)})</span>
                <small>{t('terminal.vsPrevClose')}</small>
              </p>
            </div>
            <dl className="term-book" dir="ltr">
              <div>
                <dt>{t('terminal.bid')}</dt>
                <dd>{formatPrice(quote?.bid, locale, digits)}</dd>
              </div>
              <div>
                <dt>{t('terminal.ask')}</dt>
                <dd>{formatPrice(quote?.ask, locale, digits)}</dd>
              </div>
              <div>
                <dt>{t('terminal.spread')}</dt>
                <dd>{formatPrice(quote?.spread, locale, digits)}</dd>
              </div>
            </dl>
          </div>

          <div className="term-toolbar">
            <div className="seg" role="group" aria-label={t('terminal.timeframe')}>
              {TIMEFRAMES.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={tf === item}
                  onClick={() => setTf(item)}
                  title={`${t(`terminal.tf.${item}`)} · ${index + 1}`}
                >
                  {t(`terminal.tfShort.${item}`)}
                </button>
              ))}
            </div>
            <div className="seg is-icons" role="group" aria-label={t('terminal.chartType')}>
              <button type="button" aria-pressed={chartType === 'candles'} onClick={() => setChartType('candles')} title={t('terminal.candles')}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M4 2v12M12 3v10" stroke="currentColor" strokeWidth="1.2" />
                  <rect x="2.5" y="5" width="3" height="6" fill="currentColor" />
                  <rect x="10.5" y="6" width="3" height="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <span className="sr-only">{t('terminal.candles')}</span>
              </button>
              <button type="button" aria-pressed={chartType === 'area'} onClick={() => setChartType('area')} title={t('terminal.area')}>
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M1 12l4-5 3 3 3-6 4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">{t('terminal.area')}</span>
              </button>
            </div>
          </div>

          <div className={`term-chart${series.candles ? '' : ' is-loading'}`}>
            <TerminalChart
              symbol={symbol}
              digits={digits}
              candles={series.candles}
              tf={tf}
              type={chartType}
              price={quote?.price}
              quoteTs={quote?.ts}
              locale={locale}
              labels={legendLabels}
            />
            {!series.candles && !series.error ? <div className="term-chart-veil" aria-hidden="true" /> : null}
            {series.error && !series.candles ? (
              <div className="term-error" role="alert">
                <p>{t('terminal.status.error')}</p>
                <button type="button" className="btn btn-ghost btn-sm" onClick={series.reload}>
                  {t('terminal.retry')}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="term-side">
          <section className="term-card">
            <h3>{t('terminal.session')}</h3>
            <dl className="term-stats">
              <div>
                <dt>{t('terminal.open')}</dt>
                <dd dir="ltr">{formatPrice(quote?.open, locale, digits)}</dd>
              </div>
              <div>
                <dt>{t('terminal.prevClose')}</dt>
                <dd dir="ltr">{formatPrice(quote?.prevClose, locale, digits)}</dd>
              </div>
            </dl>
            <RangeBar
              low={quote?.low}
              high={quote?.high}
              value={quote?.price}
              locale={locale}
              digits={digits}
              lowLabel={t('terminal.low')}
              highLabel={t('terminal.high')}
            />
          </section>

          <section className="term-card">
            <h3>{t('terminal.performance')}</h3>
            <ul className="perf">
              {PERIODS.map((period) => {
                const value = stats?.performance[period]
                const trend = trendOf(value)
                return (
                  <li key={period} className={`is-${trend}`}>
                    <span>{t(`terminal.perf.${period}`)}</span>
                    <span className="perf-bar" dir="ltr">
                      <i style={{ '--w': Number.isFinite(value) ? Math.abs(value) / maxPerf : 0 }} />
                    </span>
                    <strong dir="ltr">{formatPercent(value, locale)}</strong>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="term-card">
            <h3>{t('terminal.risk')}</h3>
            <dl className="term-stats">
              <div>
                <dt>{t('terminal.vol30')}</dt>
                <dd dir="ltr">{formatPercent(stats?.volatility, locale, 1).replace('+', '')}</dd>
              </div>
              <div>
                <dt>{t('terminal.atr14')}</dt>
                <dd dir="ltr">{formatPrice(stats?.atr, locale, digits)}</dd>
              </div>
            </dl>
            <RangeBar
              low={stats?.low52}
              high={stats?.high52}
              value={quote?.price}
              locale={locale}
              digits={digits}
              lowLabel={t('terminal.low52')}
              highLabel={t('terminal.high52')}
            />
          </section>

          <section className="term-card is-feed">
            <h3>{t('terminal.feed')}</h3>
            {live.ticks.length ? (
              <ol className="feed" dir="ltr">
                {live.ticks.slice(0, 12).map((tick) => (
                  <li key={`${tick.ts}-${tick.price}`} className={tick.direction ? `is-${tick.direction}` : undefined}>
                    <time>{formatTime(tick.ts, locale)}</time>
                    <Trend value={tick.direction || 'flat'} />
                    <span>{formatPrice(tick.price, locale, digits)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="term-muted">{t('terminal.feedEmpty')}</p>
            )}
            {live.status === 'error' ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => retryQuote(symbol)}>
                {t('terminal.retry')}
              </button>
            ) : null}
          </section>
        </aside>
      </div>

      <footer className="term-foot">
        <p>{t('terminal.sources')}</p>
        <p>
          {t('terminal.chartsBy')}{' '}
          <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">
            TradingView Lightweight Charts™
          </a>
        </p>
      </footer>
    </div>
  )
}

export default MarketTerminal
