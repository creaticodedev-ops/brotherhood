/** Deterministic, purely decorative series — never real market data. */
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const randomWalk = ({ seed, count, drift = 0, volatility = 1 }) => {
  const rand = seeded(seed)
  const out = [0]
  for (let i = 1; i < count; i += 1) out.push(out[i - 1] + drift + (rand() - 0.5) * volatility)
  return out
}

export const movingAverage = (series, window) =>
  series.map((_, i) => {
    const from = Math.max(0, i - window + 1)
    const slice = series.slice(from, i + 1)
    return slice.reduce((sum, v) => sum + v, 0) / slice.length
  })

/** Maps a series onto a box; `range` lets several series share one scale. */
export const toPoints = (series, { x0, x1, yTop, yBottom, range }) => {
  const min = range ? range[0] : Math.min(...series)
  const max = range ? range[1] : Math.max(...series)
  const span = max - min || 1
  const step = (x1 - x0) / (series.length - 1)
  return series.map((v, i) => ({ x: x0 + i * step, y: yBottom - ((v - min) / span) * (yBottom - yTop) }))
}

const r = (n) => Math.round(n * 10) / 10

/** Catmull-Rom spline through the points, as cubic Bézier segments. */
export const smoothPath = (pts) => {
  let d = `M${r(pts[0].x)} ${r(pts[0].y)}`
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2.x)} ${r(p2.y)}`
  }
  return d
}

export const areaPath = (pts, baseY) =>
  `${smoothPath(pts)} L${r(pts[pts.length - 1].x)} ${baseY} L${r(pts[0].x)} ${baseY} Z`
