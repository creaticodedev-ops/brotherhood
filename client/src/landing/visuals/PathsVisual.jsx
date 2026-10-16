import { randomWalk, smoothPath } from './paths'

const W = 720
const H = 360
const ORIGIN = { x: 40, y: 190 }
const END_X = 690
const SPREAD = 150
const STEPS = 48

const half = (t) => SPREAD * Math.sqrt(t)
const xAt = (t) => ORIGIN.x + t * (END_X - ORIGIN.x)

const cone = (() => {
  const upper = []
  const lower = []
  for (let i = 0; i <= STEPS; i += 1) {
    const t = i / STEPS
    upper.push({ x: xAt(t), y: ORIGIN.y - half(t) })
    lower.push({ x: xAt(t), y: ORIGIN.y + half(t) })
  }
  return { upper, lower, area: `${smoothPath(upper)} L${smoothPath([...lower].reverse()).slice(1)} Z` }
})()

/** Three illustrative scenarios (upward, sideways, downward) kept inside the cone. */
const scenarios = [
  { seed: 7, drift: 0.55, key: 'a' },
  { seed: 21, drift: 0.02, key: 'b' },
  { seed: 42, drift: -0.5, key: 'c' },
].map(({ seed, drift, key }) => {
  const walk = randomWalk({ seed, count: STEPS + 1, drift: 0, volatility: 0.5 })
  const pts = walk.map((noise, i) => {
    const t = i / STEPS
    const bound = 0.9 * Math.sqrt(t)
    const v = Math.max(-bound, Math.min(bound, drift * t + noise * 0.14))
    return { x: xAt(t), y: ORIGIN.y - v * SPREAD }
  })
  return { key, d: smoothPath(pts), end: pts[pts.length - 1] }
})

export const PathsVisual = ({ label, start, end }) => (
  <svg className="paths-visual" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
    <defs>
      <linearGradient id="pv-cone" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#009a5a" stopOpacity="0" />
        <stop offset="1" stopColor="#009a5a" stopOpacity="0.14" />
      </linearGradient>
    </defs>
    <path className="pv-cone" d={cone.area} fill="url(#pv-cone)" />
    <path className="pv-edge" d={smoothPath(cone.upper)} />
    <path className="pv-edge" d={smoothPath(cone.lower)} />
    <line className="pv-base" x1={ORIGIN.x} x2={END_X} y1={ORIGIN.y} y2={ORIGIN.y} />
    {scenarios.map((s) => (
      <g key={s.key} className={`pv-path pv-path-${s.key}`}>
        <path d={s.d} pathLength="1" />
        <circle cx={s.end.x} cy={s.end.y} r="3.5" />
      </g>
    ))}
    <circle className="pv-origin" cx={ORIGIN.x} cy={ORIGIN.y} r="5" />
    <text className="pv-axis" x={ORIGIN.x} y={H - 12}>
      {start}
    </text>
    <text className="pv-axis" x={END_X} y={H - 12} textAnchor="end">
      {end}
    </text>
  </svg>
)

export default PathsVisual
