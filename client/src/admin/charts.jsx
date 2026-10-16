import { useEffect, useMemo, useRef, useState } from 'react'
import { dayKey, formatCount, formatDayLabel, formatMoney, formatShare } from './format'
import { STATUS_ORDER } from './hooks'
import { useAdminText } from './strings'

const HEIGHT = 232
const PAD = { top: 18, right: 8, bottom: 30, left: 34 }

const useWidth = (ref) => {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/** Last `days` calendar days (local time), zero-filled from the server's per-day aggregation. */
const buildSeries = (daily, days) => {
  const rows = new Map(daily.map((row) => [row.day, row]))
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - 1 - index))
    const row = rows.get(dayKey(date))
    return { key: dayKey(date), date, count: row?.count || 0, amount: row?.amount || 0 }
  })
}

const niceScale = (max) => {
  const steps = Math.min(4, Math.max(1, max))
  const step = Math.max(1, Math.ceil(max / steps))
  return { step, steps, top: step * steps }
}

export const DailyChart = ({ daily, days, locale }) => {
  const a = useAdminText()
  const wrapRef = useRef(null)
  const width = useWidth(wrapRef)
  const [hover, setHover] = useState(null)
  const series = useMemo(() => buildSeries(daily, days), [daily, days])
  const total = series.reduce((sum, item) => sum + item.count, 0)
  const { step, steps, top } = niceScale(Math.max(...series.map((item) => item.count)))

  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const slot = innerW / series.length
  const barW = Math.max(3, Math.min(18, slot * 0.56))
  const y = (value) => PAD.top + innerH - (value / top) * innerH
  const ticks = Array.from({ length: steps + 1 }, (_, i) => i * step)

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const index = Math.floor((event.clientX - rect.left - PAD.left) / slot)
    setHover(index >= 0 && index < series.length ? index : null)
  }

  const active = hover !== null ? series[hover] : null

  return (
    <div className="adm-chart" ref={wrapRef} dir="ltr">
      {width ? (
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`${a('overview.chart.axis')} — ${a('overview.chart.period')} : ${formatCount(total, locale)}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((tick) => (
            <g key={tick} className="adm-chart-grid">
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} />
              <text x={PAD.left - 10} y={y(tick)} dy="0.32em" textAnchor="end">
                {formatCount(tick, locale)}
              </text>
            </g>
          ))}
          {series.map((item, index) => {
            const x = PAD.left + index * slot + (slot - barW) / 2
            const h = Math.max(0, y(0) - y(item.count))
            const isToday = index === series.length - 1
            return (
              <g key={item.key} className={`adm-bar${hover === index ? ' is-hover' : ''}${isToday ? ' is-today' : ''}`}>
                {hover === index ? <rect className="adm-bar-focus" x={PAD.left + index * slot} y={PAD.top} width={slot} height={innerH} /> : null}
                {item.count ? (
                  <rect className="adm-bar-fill" x={x} y={y(item.count)} width={barW} height={h} rx={Math.min(3, barW / 2)} style={{ '--i': index }} />
                ) : (
                  <rect className="adm-bar-empty" x={x} y={y(0) - 1} width={barW} height={1} />
                )}
                {index % 5 === (series.length - 1) % 5 ? (
                  <text className="adm-chart-x" x={PAD.left + index * slot + slot / 2} y={HEIGHT - 8} textAnchor="middle">
                    {formatDayLabel(item.date, locale)}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
      ) : (
        <div style={{ height: HEIGHT }} />
      )}
      {active ? (
        <div
          className="adm-tip"
          style={{ left: Math.min(Math.max(PAD.left + hover * slot + slot / 2, 90), width - 90), top: Math.max(8, y(active.count) - 12) }}
          role="status"
        >
          <strong>{formatDayLabel(active.date, locale)}</strong>
          <span>{a('overview.chart.tooltip', { n: formatCount(active.count, locale), amount: formatMoney(active.amount, locale) })}</span>
        </div>
      ) : null}
      {total ? null : <p className="adm-chart-empty">{a('overview.chart.empty')}</p>}
    </div>
  )
}

export const StatusBreakdown = ({ stats, locale }) => {
  const a = useAdminText()
  const total = stats.total || 0
  return (
    <div className="adm-breakdown">
      <div className="adm-stack" aria-hidden="true">
        {total ? (
          STATUS_ORDER.map((status) =>
            stats.statuses[status].count ? (
              <i key={status} className={`is-${status}`} style={{ flexGrow: stats.statuses[status].count }} />
            ) : null,
          )
        ) : (
          <i className="is-empty" />
        )}
      </div>
      <ul className="adm-legend">
        {STATUS_ORDER.map((status) => {
          const { count, amount } = stats.statuses[status]
          return (
            <li key={status}>
              <span className={`adm-legend-dot is-${status}`} aria-hidden="true" />
              <span className="adm-legend-name">{a(`statuses.${status}`)}</span>
              <span className="adm-legend-amount" dir="ltr">
                {formatMoney(amount, locale, 'USD', true)}
              </span>
              <span className="adm-legend-count">{formatCount(count, locale)}</span>
              <span className="adm-legend-share">{formatShare(total ? count / total : 0, locale)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export const BarList = ({ rows, locale }) => {
  const max = Math.max(1, ...rows.map((row) => row.count))
  return (
    <ul className="adm-barlist">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="adm-barlist-head">
            <span>{row.label}</span>
            <span className="adm-barlist-value">
              <strong>{formatCount(row.count, locale)}</strong>
              <em dir="ltr">{formatMoney(row.amount, locale, 'USD', true)}</em>
            </span>
          </div>
          <span className="adm-barlist-track" aria-hidden="true">
            <i style={{ transform: `scaleX(${row.count / max})` }} />
          </span>
        </li>
      ))}
    </ul>
  )
}
