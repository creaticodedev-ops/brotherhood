import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { formatTime, numberLocale } from '../../market/format'
import { useNews } from '../../market/news'
import { prefersReducedMotion } from '../hooks'
import { ArrowIcon, SectionIntro } from '../ui'

const SPEED = 34
const GLIDE_MS = 1100
const NEW_MS = 15 * 60_000
const FRESH_BADGE_MS = 8000
const KEEP_BEHIND = 30

const mod = (n, m) => ((n % m) + m) % m
const easeOut = (t) => 1 - (1 - t) ** 4

const layoutFor = (width) =>
  width < 640
    ? { card: Math.round(Math.min(width * 0.82, 340)), gap: 14 }
    : { card: Math.round(Math.min(380, Math.max(288, width * 0.27))), gap: width < 1100 ? 18 : 22 }

/**
 * Endless sequence of slots (index → headline), generated lazily as slots come into view.
 * Fresh headlines are queued and become the next slots to enter, so they join the motion without any jump.
 */
const createStream = () => ({ order: [], pending: [], known: new Set(), slots: new Map(), min: 0, max: -1, next: 0, prev: 0 })

const slotAt = (stream, n) => {
  const { order, slots } = stream
  while (stream.max < n) {
    stream.max += 1
    const fresh = stream.pending.shift()
    slots.set(stream.max, fresh ? { item: fresh, fresh: true } : { item: order[mod(stream.next++, order.length)] })
  }
  while (stream.min > n) {
    stream.min -= 1
    stream.prev -= 1
    slots.set(stream.min, { item: order[mod(stream.prev, order.length)] })
  }
  return slots.get(n)
}

const pruneBehind = (stream, from) => {
  while (stream.min < from - KEEP_BEHIND) {
    stream.slots.delete(stream.min)
    stream.min += 1
  }
}

/** Merges a refreshed list; returns how many headlines were never seen before. */
const mergeItems = (stream, items) => {
  if (!stream.order.length) {
    stream.order = items
    items.forEach((item) => stream.known.add(item.id))
    return 0
  }
  const fresh = items.filter((item) => !stream.known.has(item.id))
  fresh.forEach((item) => stream.known.add(item.id))
  const upcoming = stream.order[mod(stream.next, stream.order.length)]
  stream.order = items
  stream.next = Math.max(0, items.findIndex((item) => item.id === upcoming?.id))
  stream.pending.push(...fresh)
  return fresh.length
}

const useRelativeTime = (locale, t) => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  return useMemo(() => {
    const rtf = new Intl.RelativeTimeFormat(numberLocale(locale), { numeric: 'auto', style: 'short' })
    const format = (ms) => {
      const minutes = Math.floor((now - ms) / 60_000)
      if (minutes < 1) return t('news.justNow')
      if (minutes < 60) return rtf.format(-minutes, 'minute')
      const hours = Math.floor(minutes / 60)
      return hours < 24 ? rtf.format(-hours, 'hour') : rtf.format(-Math.floor(hours / 24), 'day')
    }
    return { now, format }
  }, [locale, now, t])
}

const NewsCard = ({ item, isNew, time, t }) => (
  <article className={`news-card${isNew ? ' is-new' : ''}${item.summary ? ' has-summary' : ''}`}>
    <a className="news-link" href={item.url} target="_blank" rel="noopener noreferrer" draggable="false">
      <header className="news-card-head">
        <span className="news-cat">{t(`news.categories.${item.category}`)}</span>
        <span className="news-rule" aria-hidden="true" />
        <time dateTime={new Date(item.publishedAt).toISOString()}>{time}</time>
      </header>
      <h3 className="news-title" dir="auto">
        {item.title}
      </h3>
      {item.summary ? (
        <p className="news-summary" dir="auto">
          {item.summary}
        </p>
      ) : null}
      <footer className="news-foot">
        <span className="news-source">
          {isNew ? <i className="news-dot" aria-hidden="true" /> : null}
          {isNew ? <span className="news-new">{t('news.new')}</span> : null}
          {item.source}
        </span>
        <span className="news-read">
          {t('news.read')}
          <ArrowIcon />
          <span className="sr-only">{t('news.external')}</span>
        </span>
      </footer>
    </a>
  </article>
)

const Placeholder = ({ error, retry, t }) =>
  error ? (
    <div className="news-empty container">
      <p>{t('news.error')}</p>
      <button type="button" className="btn btn-ghost btn-sm" onClick={retry}>
        <span>{t('news.retry')}</span>
      </button>
    </div>
  ) : (
    <ul className="news-skeleton" aria-label={t('news.loading')}>
      {[0, 1, 2, 3, 4].map((n) => (
        <li key={n} className="news-ghost" />
      ))}
    </ul>
  )

/** Live headlines on an endless conveyor: eases to a stop on hover/focus, drag/swipe with inertia, RTL aware. */
export const LiveNews = () => {
  const { t, locale, isRtl } = useI18n()
  const { items, updatedAt, error, retry } = useNews(locale)
  const { now, format } = useRelativeTime(locale, t)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const headRef = useRef(null)
  const engineRef = useRef(null)
  const itemsRef = useRef(items)
  const pausedRef = useRef(false)
  const [slots, setSlots] = useState([])
  const [paused, setPaused] = useState(false)
  const [fresh, setFresh] = useState(0)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  // Declared before the engine effect so a locale switch hands the new (empty) list to the fresh engine.
  useEffect(() => {
    itemsRef.current = items
    const count = engineRef.current?.update(items) || 0
    if (count) setFresh(count)
  }, [items])

  useEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    const reduced = prefersReducedMotion()
    const dir = isRtl ? -1 : 1
    const stream = createStream()
    const edgeCache = new WeakMap()
    let width = 0
    let card = 0
    let pitch = 1
    let lead = 0
    let offset = 0
    let speed = 0
    let velocity = 0
    let glide = null
    let hovering = false
    let focused = false
    let drag = null
    let suppressClick = false
    let visible = true
    let frame = 0
    let last = 0
    let range = ''

    const measure = () => {
      const previous = pitch
      width = viewport.clientWidth
      const layout = layoutFor(width)
      card = layout.card
      pitch = card + layout.gap
      const head = headRef.current
      lead = head ? Math.max(0, (width - head.clientWidth) / 2 + parseFloat(getComputedStyle(head).paddingInlineStart)) : 0
      offset *= pitch / previous
      if (glide) glide.to *= pitch / previous
      track.style.setProperty('--news-w', `${card}px`)
    }

    const sync = (force = false) => {
      if (!stream.order.length) return
      const from = Math.floor(offset / pitch) - 1
      const to = Math.floor((offset + width) / pitch) + 1
      const key = `${from}:${to}:${pitch}`
      if (!force && key === range) return
      range = key
      const list = []
      for (let n = from; n <= to; n += 1) list.push({ n, x: n * pitch, ...slotAt(stream, n) })
      pruneBehind(stream, from)
      setSlots(list)
    }

    const paint = () => {
      track.style.transform = `translate3d(${-dir * offset}px, 0, 0)`
      if (reduced) return
      for (const el of track.children) {
        const center = Number(el.dataset.n) * pitch - offset + card / 2
        const edge = Math.min(1, Math.max(0, 1 - Math.min(center, width - center) / (card * 0.8)))
        const rounded = Math.round(edge * 200) / 200
        if (edgeCache.get(el) === rounded) continue
        edgeCache.set(el, rounded)
        el.style.opacity = String(1 - rounded * 0.6)
        el.style.transform = rounded ? `scale(${1 - rounded * 0.04})` : ''
      }
    }

    const glideTo = (to) => {
      if (reduced) {
        offset = to
        glide = null
        sync()
        paint()
        return
      }
      glide = { from: offset, to, start: performance.now() }
      velocity = 0
    }

    const tick = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now
      const target = reduced || hovering || focused || drag || glide || pausedRef.current ? 0 : SPEED
      speed += (target - speed) * Math.min(1, dt * 2.2)
      if (glide) {
        const progress = Math.min(1, (now - glide.start) / GLIDE_MS)
        offset = glide.from + (glide.to - glide.from) * easeOut(progress)
        if (progress === 1) glide = null
      } else if (!drag) {
        offset += (speed + velocity) * dt
        velocity *= Math.exp(-dt * 3.2)
        if (Math.abs(velocity) < 1) velocity = 0
      }
      sync()
      paint()
      frame = visible ? requestAnimationFrame(tick) : 0
    }

    const resume = () => {
      if (!frame && visible) {
        last = 0
        frame = requestAnimationFrame(tick)
      }
    }

    const slotIndex = (el) => {
      const slot = el?.closest?.('[data-n]')
      return slot ? Number(slot.dataset.n) : null
    }

    const onEnter = (event) => {
      if (event.pointerType === 'mouse') hovering = true
    }
    const onLeave = (event) => {
      if (event.pointerType === 'mouse') hovering = false
    }
    const onDown = (event) => {
      if (event.button !== 0) return
      drag = { x: event.clientX, t: performance.now(), id: event.pointerId, moved: false }
      velocity = 0
      glide = null
    }
    const onMove = (event) => {
      if (!drag || event.pointerId !== drag.id) return
      const dx = event.clientX - drag.x
      if (!drag.moved && Math.abs(dx) < 5) return
      if (!drag.moved) {
        drag.moved = true
        viewport.setPointerCapture(event.pointerId)
        viewport.classList.add('is-dragging')
      }
      const now = performance.now()
      const delta = -dir * dx
      offset += delta
      const dt = Math.max(1, now - drag.t) / 1000
      velocity = velocity * 0.6 + (delta / dt) * 0.4
      drag.x = event.clientX
      drag.t = now
      sync()
      paint()
    }
    const onUp = (event) => {
      if (!drag || event.pointerId !== drag.id) return
      if (performance.now() - drag.t > 120) velocity = 0
      velocity = reduced ? 0 : Math.max(-2400, Math.min(2400, velocity))
      if (drag.moved) {
        suppressClick = true
        setTimeout(() => {
          suppressClick = false
        }, 0)
        if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
      }
      viewport.classList.remove('is-dragging')
      drag = null
    }
    const onClick = (event) => {
      if (!suppressClick) return
      event.preventDefault()
      event.stopPropagation()
    }
    const onFocusIn = (event) => {
      focused = event.target.matches(':focus-visible')
      const n = slotIndex(event.target)
      if (n === null || !focused) return
      const x = n * pitch - offset
      if (x < lead) glideTo(n * pitch - lead)
      else if (x + card > width - lead) glideTo(n * pitch + card - (width - lead))
    }
    const onFocusOut = (event) => {
      focused = viewport.contains(event.relatedTarget)
    }
    const onScroll = () => {
      viewport.scrollLeft = 0
    }

    engineRef.current = {
      update(next) {
        if (!next.length) return 0
        const first = !stream.order.length
        const count = mergeItems(stream, next)
        if (first) sync(true)
        return count
      },
      step(direction) {
        const base = glide ? glide.to : offset
        glideTo((Math.round((base + lead) / pitch) + direction) * pitch - lead)
      },
    }

    const resizeObserver = new ResizeObserver(() => {
      measure()
      sync(true)
      paint()
    })
    resizeObserver.observe(viewport)

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) resume()
    })
    intersectionObserver.observe(viewport)

    measure()
    setSlots([])
    engineRef.current.update(itemsRef.current)
    viewport.addEventListener('pointerenter', onEnter)
    viewport.addEventListener('pointerleave', onLeave)
    viewport.addEventListener('pointerdown', onDown)
    viewport.addEventListener('pointermove', onMove)
    viewport.addEventListener('pointerup', onUp)
    viewport.addEventListener('pointercancel', onUp)
    viewport.addEventListener('click', onClick, true)
    viewport.addEventListener('focusin', onFocusIn)
    viewport.addEventListener('focusout', onFocusOut)
    viewport.addEventListener('scroll', onScroll)
    resume()

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      viewport.removeEventListener('pointerenter', onEnter)
      viewport.removeEventListener('pointerleave', onLeave)
      viewport.removeEventListener('pointerdown', onDown)
      viewport.removeEventListener('pointermove', onMove)
      viewport.removeEventListener('pointerup', onUp)
      viewport.removeEventListener('pointercancel', onUp)
      viewport.removeEventListener('click', onClick, true)
      viewport.removeEventListener('focusin', onFocusIn)
      viewport.removeEventListener('focusout', onFocusOut)
      viewport.removeEventListener('scroll', onScroll)
      track.style.transform = ''
      engineRef.current = null
    }
  }, [locale, isRtl])

  useEffect(() => {
    if (!fresh) return undefined
    const id = setTimeout(() => setFresh(0), FRESH_BADGE_MS)
    return () => clearTimeout(id)
  }, [fresh])

  const offline = Boolean(error) && !items.length

  return (
    <section className="section news" id="news" aria-labelledby="news-title">
      <div ref={headRef} className="container news-head">
        <SectionIntro kicker={t('news.kicker')} title={t('news.title')} lead={t('news.lead')} titleId="news-title" />
        <div className="news-meta" data-reveal>
          <p className="news-status">
            <span className={`news-pulse${offline ? ' is-off' : ''}`} aria-hidden="true" />
            <strong>{t('news.live')}</strong>
            {updatedAt ? <span dir="ltr">{formatTime(updatedAt, locale, false)}</span> : null}
            <span className="news-fresh" role="status">
              {fresh ? t(fresh > 1 ? 'news.freshMany' : 'news.freshOne', { count: fresh }) : ''}
            </span>
          </p>
          <div className="news-controls">
            <button type="button" className="news-ctrl is-prev" onClick={() => engineRef.current?.step(-1)} aria-label={t('news.prev')}>
              <ArrowIcon />
            </button>
            <button
              type="button"
              className="news-ctrl"
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
              aria-label={t(paused ? 'news.play' : 'news.pause')}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                {paused ? <path d="M3 1.5v9l7-4.5z" fill="currentColor" /> : <path d="M3 1.5h2v9H3zM7 1.5h2v9H7z" fill="currentColor" />}
              </svg>
            </button>
            <button type="button" className="news-ctrl" onClick={() => engineRef.current?.step(1)} aria-label={t('news.next')}>
              <ArrowIcon />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={`news-viewport${slots.length ? '' : ' is-empty'}`}
        role="region"
        aria-roledescription={t('news.carousel')}
        aria-label={t('news.kicker')}
      >
        <ul ref={trackRef} className="news-track">
          {slots.map((slot) => (
            <li key={slot.n} data-n={slot.n} className={`news-slot${slot.fresh ? ' is-arriving' : ''}`} style={{ insetInlineStart: slot.x }}>
              <NewsCard item={slot.item} isNew={now - slot.item.publishedAt < NEW_MS} time={format(slot.item.publishedAt)} t={t} />
            </li>
          ))}
        </ul>
        {slots.length ? null : <Placeholder error={error} retry={retry} t={t} />}
      </div>

      <p className="container news-sources">{t('news.sources')}</p>
    </section>
  )
}

export default LiveNews
