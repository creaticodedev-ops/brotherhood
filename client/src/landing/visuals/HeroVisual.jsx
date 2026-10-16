import { useId } from 'react'
import { areaPath, movingAverage, randomWalk, smoothPath, toPoints } from './paths'

const W = 1440
const H = 900
const series = randomWalk({ seed: 79, count: 64, drift: 0.38, volatility: 2.6 })
const range = [Math.min(...series), Math.max(...series)]
const box = { x0: -20, x1: 1300, yTop: 250, yBottom: 760, range }
const points = toPoints(series, box)
const trend = toPoints(movingAverage(series, 9), box)
const line = smoothPath(points)
const trendLine = smoothPath(trend)
const area = areaPath(points, H)
const end = points[points.length - 1]
const levels = [330, 470, 610, 750]
const ticks = Array.from({ length: Math.floor(W / 48) }, (_, i) => 24 + i * 48)

/** Abstract market movement: decorative only, no real data. */
export const HeroVisual = ({ label }) => {
  const uid = useId().replace(/:/g, '')
  const id = (name) => `${uid}-${name}`
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: 'false' }

  return (
  <svg className="hero-visual" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMaxYMax slice" {...a11y}>
    <defs>
      <linearGradient id={id('stroke')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0.04" />
        <stop offset="0.6" stopColor="#fff" stopOpacity="0.32" />
        <stop offset="0.9" stopColor="#22b573" stopOpacity="0.85" />
        <stop offset="1" stopColor="#22b573" />
      </linearGradient>
      <linearGradient id={id('area')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#009a5a" stopOpacity="0.16" />
        <stop offset="0.55" stopColor="#009a5a" stopOpacity="0.03" />
        <stop offset="1" stopColor="#009a5a" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={id('fade')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.45" stopColor="#fff" stopOpacity="0.5" />
        <stop offset="1" stopColor="#fff" stopOpacity="1" />
      </linearGradient>
      <mask id={id('mask')}>
        <rect width={W} height={H} fill={`url(#${id('fade')})`} />
      </mask>
    </defs>

    <g className="hv-levels">
      {levels.map((y) => (
        <line key={y} x1="0" x2={W} y1={y} y2={y} />
      ))}
    </g>

    <g className="hv-ticks">
      {ticks.map((x, i) => (
        <line key={x} x1={x} x2={x} y1={H - 26} y2={H - (i % 4 === 0 ? 40 : 32)} />
      ))}
    </g>

    <path className="hv-area" d={area} fill={`url(#${id('area')})`} mask={`url(#${id('mask')})`} />
    <path className="hv-trend" d={trendLine} pathLength="1" />
    <path className="hv-line" d={line} stroke={`url(#${id('stroke')})`} pathLength="1" />

    <g className="hv-cross">
      <line x1={end.x} x2={end.x} y1="0" y2={H} />
      <line x1="0" x2={W} y1={end.y} y2={end.y} />
    </g>
    <circle className="hv-pulse" cx={end.x} cy={end.y} r="10" />
    <circle className="hv-dot" cx={end.x} cy={end.y} r="4.5" />
  </svg>
  )
}

export default HeroVisual
