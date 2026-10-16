import { formatPercent, formatPrice, formatSigned, trendOf } from '../../market/format'
import { useGoldQuote } from '../../market/goldQuote'
import { rangePosition } from '../../market/stats'

const TICKS = Array.from({ length: 120 }, (_, i) => i * 3)
const C = 200
const ARC_FROM = -140
const ARC_SPAN = 280

const polar = (deg, radius) => {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: C + radius * Math.cos(a), y: C + radius * Math.sin(a) }
}

const arc = (from, to, radius) => {
  const s = polar(from, radius)
  const e = polar(to, radius)
  return `M${s.x} ${s.y} A${radius} ${radius} 0 ${to - from > 180 ? 1 : 0} 1 ${e.x} ${e.y}`
}

/** Live XAU/USD price inside a precision dial; the arc shows the price within today's range. */
export const GoldQuoteDial = ({ labels, locale, onOpen }) => {
  const { quote, status, direction, seq } = useGoldQuote()
  const pos = quote ? rangePosition(quote.price, quote.low, quote.high) : null
  const angle = pos == null ? null : ARC_FROM + pos * ARC_SPAN
  const marker = angle == null ? null : polar(angle, 160)
  const trend = trendOf(quote?.change)

  return (
    <button type="button" className={`gold is-${status}`} onClick={onOpen} aria-label={labels.open}>
      <svg className="gold-svg" viewBox="0 0 400 400" aria-hidden="true">
        <g className="gold-dial">
          <circle className="gold-ring" cx={C} cy={C} r="196" />
          <g className="gold-ticks">
            {TICKS.map((deg) => {
              const major = deg % 30 === 0
              const a = polar(deg, 186)
              const b = polar(deg, major ? 170 : 178)
              return <line key={deg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={major ? 'is-major' : undefined} />
            })}
          </g>
        </g>
        <path className="gold-track" d={arc(ARC_FROM, ARC_FROM + ARC_SPAN, 160)} />
        {angle != null && angle > ARC_FROM + 0.5 ? <path className="gold-arc" d={arc(ARC_FROM, angle, 160)} /> : null}
        {marker ? (
          <g className="gold-marker" transform={`translate(${marker.x} ${marker.y})`}>
            <circle r="9" className="gold-marker-halo" />
            <circle r="4" />
          </g>
        ) : null}
        <circle className="gold-ring is-inner" cx={C} cy={C} r="146" />
      </svg>

      <span className="gold-face" dir="ltr">
        <span className="gold-head">
          <i className="gold-live" aria-hidden="true" />
          XAU/USD
        </span>
        <span key={seq} className={`gold-price${direction ? ` is-${direction}` : ''}`}>
          {quote ? formatPrice(quote.price, locale) : status === 'error' ? '—' : '····'}
        </span>
        <span className="gold-unit">{labels.unit}</span>
        <span className={`gold-change is-${trend}`}>
          {quote?.change != null ? `${formatSigned(quote.change, locale)} · ${formatPercent(quote.changePct, locale)}` : labels.status}
        </span>
        <span className="gold-range">
          <span>
            {labels.low} {formatPrice(quote?.low, locale)}
          </span>
          <span>
            {labels.high} {formatPrice(quote?.high, locale)}
          </span>
        </span>
      </span>
    </button>
  )
}

export default GoldQuoteDial
