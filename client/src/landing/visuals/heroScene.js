/**
 * Immersive hero market scene (Canvas 2D).
 * Purely illustrative: every curve is procedural noise, never market data.
 */

const BG = '#050605'
const WHITE = '244, 245, 243'
const GREEN = '34, 181, 115'
const GREEN_DEEP = '0, 154, 90'

const LAYERS = [
  { seed: 11, depth: 0.25, y: 0.5, amp: 0.06, alpha: 0.05, speed: 0.025, scale: 2.0, slope: 0.1 },
  { seed: 23, depth: 0.45, y: 0.64, amp: 0.08, alpha: 0.075, speed: 0.035, scale: 2.4, slope: 0.14 },
  { seed: 37, depth: 0.6, y: 0.44, amp: 0.05, alpha: 0.05, speed: 0.03, scale: 1.7, slope: 0.08 },
  { seed: 53, depth: 0.8, y: 0.74, amp: 0.07, alpha: 0.09, speed: 0.045, scale: 2.9, slope: 0.16 },
]

const SCENARIOS = [
  { end: -0.9, alpha: 0.16, seed: 71 },
  { end: -0.3, alpha: 0.34, seed: 83, accent: true },
  { end: 0.55, alpha: 0.16, seed: 97 },
]

const MAX_PIXELS = 4_500_000

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v))
const lerp = (a, b, k) => a + (b - a) * k
const smooth = (k) => k * k * (3 - 2 * k)
const easeOutCubic = (k) => 1 - (1 - k) ** 3
const fract = (v) => v - Math.floor(v)
const hash = (n) => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453)

const noise = (x, seed) => {
  const i = Math.floor(x)
  const f = x - i
  const offset = seed * 57.31
  return lerp(hash(i + offset), hash(i + 1 + offset), smooth(f))
}

/** Fractal value noise, roughly in [-0.5, 0.5]. */
const fbm = (x, seed, octaves = 5) => {
  let amplitude = 0.5
  let frequency = 1
  let sum = 0
  let norm = 0
  for (let o = 0; o < octaves; o += 1) {
    sum += amplitude * noise(x * frequency, seed + o * 13)
    norm += amplitude
    amplitude *= 0.52
    frequency *= 2.03
  }
  return sum / norm - 0.5
}

const strokePath = (ctx, xs, ys, from = 0, to = xs.length) => {
  ctx.beginPath()
  ctx.moveTo(xs[from], ys[from])
  for (let i = from + 1; i < to; i += 1) ctx.lineTo(xs[i], ys[i])
  ctx.stroke()
}

export const createHeroScene = (canvas, { reducedMotion = false, mirror = false } = {}) => {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return null

  let width = 0
  let height = 0
  let dpr = 1
  let mirrored = mirror
  let time = reducedMotion ? 12 : 0
  let intro = reducedMotion ? 10 : 0
  let progress = 0
  let progressTarget = 0
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, px: null }
  const cross = { x: 0, alpha: 0 }

  let started = false
  let running = false
  let inView = true
  let frame = 0
  let last = 0

  const draw = (dt = 0) => {
    if (!width || !height) return
    const W = width
    const H = height
    const narrow = W < 768
    const portrait = narrow || H > W * 1.05
    const ps = smooth(clamp(progress))
    const lift = ps * H * 0.04
    const zoom = 1 + ps * 0.2
    const mapY = (y, depth = 1) => H * 0.5 + (y - H * 0.5) * (1 + (zoom - 1) * depth) - lift * depth
    const parallaxX = mirrored ? -pointer.x : pointer.x
    const reveal = easeOutCubic(clamp(intro / 2.6))
    const settled = clamp((intro - 2.3) / 0.9)

    ctx.setTransform(mirrored ? -dpr : dpr, 0, 0, dpr, mirrored ? W * dpr : 0, 0)
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, W, H)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    /* Main series — computed first so the ambient light can follow the head. */
    const fullHeadX = W * (portrait ? 0.86 + 0.04 * ps : 0.72 + 0.16 * ps)
    const headX = Math.max(2, fullHeadX * reveal)
    const step = narrow ? 4 : 5
    const y0 = H * (portrait ? 0.97 : 0.88)
    const y1 = H * (portrait ? 0.5 : 0.3)
    const amp = H * (portrait ? 0.06 : 0.1)
    const drift = time * 0.035
    const ox = parallaxX * 10
    const oy = pointer.y * 8
    const xs = []
    const ys = []
    for (let x = 0; ; x += step) {
      const px = Math.min(x, headX)
      const u = px / fullHeadX
      const base = lerp(y0, y1, u)
      const wave = amp * 2 * fbm((px / W) * 3.2 + drift, 7, 6)
      const tick = H * 0.012 * fbm((px / W) * 38 + time * 0.4, 19, 2)
      xs.push(px + ox)
      ys.push(mapY(base + wave + tick) + oy)
      if (px >= headX) break
    }
    const n = xs.length
    const hx = xs[n - 1]
    const hy = ys[n - 1]

    /* Ambient light around the most recent value. */
    const ambient = ctx.createRadialGradient(hx, hy, 0, hx, hy, Math.max(W, H) * 0.6)
    ambient.addColorStop(0, `rgba(${GREEN_DEEP}, 0.09)`)
    ambient.addColorStop(0.45, `rgba(${GREEN_DEEP}, 0.025)`)
    ambient.addColorStop(1, `rgba(${GREEN_DEEP}, 0)`)
    ctx.fillStyle = ambient
    ctx.fillRect(0, 0, W, H)

    /* Price grid drifting with time. */
    const spacing = narrow ? 96 : 140
    const shift = (time * 14) % spacing
    ctx.lineWidth = 1
    ctx.strokeStyle = `rgba(${WHITE}, 0.035)`
    ctx.beginPath()
    for (let x = -shift; x < W; x += spacing) {
      ctx.moveTo(Math.round(x) + 0.5, 0)
      ctx.lineTo(Math.round(x) + 0.5, H)
    }
    for (let i = 1; i < 7; i += 1) {
      const y = Math.round((H * i) / 7) + 0.5
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
    }
    ctx.stroke()
    ctx.strokeStyle = `rgba(${WHITE}, 0.16)`
    ctx.beginPath()
    for (let i = 1; i < 7; i += 1) {
      const y = Math.round((H * i) / 7) + 0.5
      ctx.moveTo(W - 28, y)
      ctx.lineTo(W - 20, y)
    }
    ctx.stroke()

    /* Background market lines, each on its own parallax depth. */
    const layerFade = clamp(intro / 1.4)
    const layerStep = narrow ? 7 : 8
    LAYERS.forEach((layer) => {
      const lx = parallaxX * 24 * layer.depth
      const ly = pointer.y * 16 * layer.depth
      ctx.strokeStyle = `rgba(${WHITE}, ${layer.alpha * layerFade})`
      ctx.beginPath()
      for (let x = -layerStep; x <= W + layerStep; x += layerStep) {
        const u = x / W
        const y = H * layer.y - H * layer.slope * u + H * layer.amp * 2 * fbm(u * layer.scale + time * layer.speed, layer.seed, 4)
        const py = mapY(y, layer.depth) + ly
        if (x === -layerStep) ctx.moveTo(x + lx, py)
        else ctx.lineTo(x + lx, py)
      }
      ctx.stroke()
    })

    /* Volume bars, locked to the same drift as the series. */
    const barStep = narrow ? 7 : 9
    const barShift = (time * W * 0.035) / 3.2
    const baseline = H * 0.975 - lift * 0.3
    const firstBar = Math.floor(barShift / barStep)
    ctx.lineWidth = 2
    ctx.lineCap = 'butt'
    for (let b = firstBar; ; b += 1) {
      const x = b * barStep - barShift + ox
      if (x > hx) break
      if (x < -barStep) continue
      const level = (0.25 + 0.75 * hash(b * 1.7 + 3)) * (0.55 + fbm(b * 0.05, 41, 3))
      const h = H * 0.075 * clamp(level, 0.05, 1)
      const recent = x > hx - W * 0.08
      ctx.strokeStyle = recent ? `rgba(${GREEN}, 0.34)` : `rgba(${WHITE}, 0.07)`
      ctx.beginPath()
      ctx.moveTo(x, baseline)
      ctx.lineTo(x, baseline - h)
      ctx.stroke()
    }
    ctx.lineCap = 'round'

    /* Area under the series. */
    let minY = H
    for (let i = 0; i < n; i += 1) minY = Math.min(minY, ys[i])
    const area = ctx.createLinearGradient(0, minY, 0, H)
    area.addColorStop(0, `rgba(${GREEN}, 0.13)`)
    area.addColorStop(0.55, `rgba(${GREEN}, 0.035)`)
    area.addColorStop(1, `rgba(${GREEN}, 0)`)
    ctx.fillStyle = area
    ctx.beginPath()
    ctx.moveTo(xs[0], H)
    for (let i = 0; i < n; i += 1) ctx.lineTo(xs[i], ys[i])
    ctx.lineTo(hx, H)
    ctx.closePath()
    ctx.fill()

    /* Moving average. */
    const windowSize = 28
    if (n > windowSize) {
      const ma = []
      let acc = 0
      for (let i = 0; i < n; i += 1) {
        acc += ys[i]
        if (i >= windowSize) acc -= ys[i - windowSize]
        ma.push(i >= windowSize - 1 ? acc / windowSize : ys[i])
      }
      ctx.lineWidth = 1
      ctx.strokeStyle = `rgba(${WHITE}, 0.13)`
      strokePath(ctx, xs, ma, windowSize - 1, n)
    }

    /* Main line. */
    const line = ctx.createLinearGradient(xs[0], 0, Math.max(hx, xs[0] + 1), 0)
    line.addColorStop(0, `rgba(${WHITE}, 0.12)`)
    line.addColorStop(0.4, `rgba(${WHITE}, 0.4)`)
    line.addColorStop(0.82, `rgba(${WHITE}, 0.8)`)
    line.addColorStop(1, `rgb(${GREEN})`)
    const halo = ctx.createLinearGradient(xs[0], 0, Math.max(hx, xs[0] + 1), 0)
    halo.addColorStop(0, `rgba(${GREEN}, 0)`)
    halo.addColorStop(0.6, `rgba(${GREEN}, 0.03)`)
    halo.addColorStop(1, `rgba(${GREEN}, 0.1)`)
    ctx.lineWidth = narrow ? 5 : 7
    ctx.strokeStyle = halo
    strokePath(ctx, xs, ys)
    ctx.lineWidth = narrow ? 1.6 : 2
    ctx.strokeStyle = line
    strokePath(ctx, xs, ys)

    /* Forward scenarios — an uncertainty cone, not a forecast. */
    const room = W - hx
    const coneAlpha = settled * (1 - ps * 0.5)
    if (room > 40 && coneAlpha > 0.01) {
      const spread = H * (narrow ? 0.07 : 0.11)
      const paths = SCENARIOS.map((scenario) => {
        const px = []
        const py = []
        for (let x = hx; ; x += 10) {
          const cx = Math.min(x, W + 10)
          const k = (cx - hx) / (room + 10)
          const wobble = H * 0.012 * fbm(cx / W * 6 + time * 0.05, scenario.seed, 3) * k
          px.push(cx)
          py.push(hy + spread * scenario.end * k ** 1.15 + wobble)
          if (cx >= W + 10) break
        }
        return { ...scenario, px, py }
      })
      const upper = paths[0]
      const lower = paths[2]
      ctx.fillStyle = `rgba(${WHITE}, ${0.03 * coneAlpha})`
      ctx.beginPath()
      ctx.moveTo(upper.px[0], upper.py[0])
      for (let i = 1; i < upper.px.length; i += 1) ctx.lineTo(upper.px[i], upper.py[i])
      for (let i = lower.px.length - 1; i >= 0; i -= 1) ctx.lineTo(lower.px[i], lower.py[i])
      ctx.closePath()
      ctx.fill()
      ctx.setLineDash([3, 6])
      ctx.lineWidth = 1
      paths.forEach((path) => {
        ctx.strokeStyle = path.accent
          ? `rgba(${GREEN}, ${path.alpha * coneAlpha})`
          : `rgba(${WHITE}, ${path.alpha * coneAlpha})`
        strokePath(ctx, path.px, path.py)
      })
      ctx.setLineDash([])
    }

    /* Head: now-line, level, glow, pulse. */
    if (settled > 0) {
      ctx.lineWidth = 1
      ctx.setLineDash([2, 6])
      ctx.strokeStyle = `rgba(${WHITE}, ${0.1 * settled})`
      ctx.beginPath()
      ctx.moveTo(Math.round(hx) + 0.5, 0)
      ctx.lineTo(Math.round(hx) + 0.5, H)
      ctx.stroke()
      ctx.strokeStyle = `rgba(${GREEN}, ${0.22 * settled})`
      ctx.beginPath()
      ctx.moveTo(0, Math.round(hy) + 0.5)
      ctx.lineTo(W, Math.round(hy) + 0.5)
      ctx.stroke()
      ctx.setLineDash([])
    }

    const headAlpha = clamp(intro / 0.6)
    const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 120)
    glow.addColorStop(0, `rgba(${GREEN}, ${0.16 * headAlpha})`)
    glow.addColorStop(1, `rgba(${GREEN}, 0)`)
    ctx.fillStyle = glow
    ctx.fillRect(hx - 120, hy - 120, 240, 240)

    if (!reducedMotion && settled > 0) {
      const phase = (time % 2.8) / 2.8
      ctx.lineWidth = 1.25
      ctx.strokeStyle = `rgba(${GREEN}, ${(1 - phase) * 0.45 * settled})`
      ctx.beginPath()
      ctx.arc(hx, hy, 6 + easeOutCubic(phase) * 26, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.fillStyle = `rgba(${GREEN}, ${headAlpha})`
    ctx.beginPath()
    ctx.arc(hx, hy, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * headAlpha})`
    ctx.beginPath()
    ctx.arc(hx, hy, 1.5, 0, Math.PI * 2)
    ctx.fill()

    /* Pointer crosshair, snapped to the series. */
    let target = null
    if (pointer.px !== null && settled > 0) {
      const local = mirrored ? W - pointer.px : pointer.px
      if (local >= xs[0] && local <= hx) target = local
    }
    const follow = dt ? Math.min(1, dt * 14) : 1
    const fade = dt ? Math.min(1, dt * 8) : 1
    if (target !== null) {
      cross.x = cross.alpha > 0.02 ? lerp(cross.x, target, follow) : target
      cross.alpha = lerp(cross.alpha, 1, fade)
    } else {
      cross.alpha = lerp(cross.alpha, 0, fade)
    }
    if (cross.alpha > 0.02) {
      const i = clamp(Math.round((cross.x - xs[0]) / step), 0, n - 1)
      const cx = xs[i]
      const cy = ys[i]
      ctx.lineWidth = 1
      ctx.strokeStyle = `rgba(${WHITE}, ${0.16 * cross.alpha})`
      ctx.beginPath()
      ctx.moveTo(Math.round(cx) + 0.5, 0)
      ctx.lineTo(Math.round(cx) + 0.5, H)
      ctx.stroke()
      ctx.setLineDash([2, 5])
      ctx.strokeStyle = `rgba(${WHITE}, ${0.12 * cross.alpha})`
      ctx.beginPath()
      ctx.moveTo(0, Math.round(cy) + 0.5)
      ctx.lineTo(W, Math.round(cy) + 0.5)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = BG
      ctx.strokeStyle = `rgba(${WHITE}, ${0.8 * cross.alpha})`
      ctx.lineWidth = 1.25
      ctx.beginPath()
      ctx.arc(cx, cy, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  const tick = (now) => {
    frame = 0
    if (!running) return
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
    last = now
    time += dt
    intro += dt
    progress += (progressTarget - progress) * Math.min(1, dt * 5)
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3)
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3)
    draw(dt)
    frame = requestAnimationFrame(tick)
  }

  const sync = () => {
    const shouldRun = started && inView && !document.hidden && !reducedMotion
    if (shouldRun && !running) {
      running = true
      last = 0
      frame = requestAnimationFrame(tick)
    } else if (!shouldRun && running) {
      running = false
      if (frame) cancelAnimationFrame(frame)
      frame = 0
    }
  }

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    width = rect.width
    height = rect.height
    if (!width || !height) return
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    dpr = Math.max(1, Math.min(ratio, Math.sqrt(MAX_PIXELS / (width * height))))
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    if (!running) draw()
  }

  const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
  resizeObserver?.observe(canvas)

  const intersectionObserver =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting
          sync()
        })
      : null
  intersectionObserver?.observe(canvas)

  document.addEventListener('visibilitychange', sync)
  window.addEventListener('resize', resize)

  return {
    start() {
      started = true
      resize()
      sync()
    },
    stop() {
      started = false
      sync()
    },
    resize,
    setProgress(value) {
      if (reducedMotion) return
      progressTarget = clamp(value)
    },
    setPointer(nx, ny, px = null) {
      if (reducedMotion) return
      pointer.tx = clamp(nx, -1, 1)
      pointer.ty = clamp(ny, -1, 1)
      pointer.px = px
    },
    setMirror(value) {
      if (mirrored === value) return
      mirrored = value
      if (!running) draw()
    },
    destroy() {
      started = false
      sync()
      resizeObserver?.disconnect()
      intersectionObserver?.disconnect()
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('resize', resize)
    },
  }
}
