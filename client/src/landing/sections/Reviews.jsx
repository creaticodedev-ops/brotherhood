import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { prefersReducedMotion } from '../hooks'

const SPEED = 36
const VARIANTS = ['feature', 'standard', 'inverse', 'compact']
const OFFER_LEVEL = { essential: 1, advanced: 2, premium: 3 }

const initials = (name = '') =>
  name
    .replace(/\./g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

const ReviewCard = ({ item, index, total, offerName, hidden }) => (
  <li className={`review is-${VARIANTS[index % VARIANTS.length]}`} aria-hidden={hidden || undefined}>
    <article>
      <header className="review-head">
        <span className="review-index" dir="ltr">
          {String(index + 1).padStart(2, '0')}
          <small>/{String(total).padStart(2, '0')}</small>
        </span>
        <span className="review-rule" aria-hidden="true" />
        <span className="review-offer">
          <span className="offer-bars" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <i key={n} className={n <= OFFER_LEVEL[item.offer] ? 'is-on' : undefined} />
            ))}
          </span>
          {offerName}
        </span>
      </header>
      <blockquote className="review-quote">
        <p>{item.quote}</p>
      </blockquote>
      <footer className="review-author">
        <span className="review-monogram" aria-hidden="true">
          {initials(item.name)}
        </span>
        <span className="review-who">
          <strong>{item.name}</strong>
          <small>
            {item.profile} · {item.city}
          </small>
        </span>
      </footer>
    </article>
  </li>
)

/** Continuous editorial carousel: eases to a stop on hover, drag/swipe with inertia, RTL aware. */
export const Reviews = () => {
  const { t, tm, isRtl } = useI18n()
  const items = tm('reviews.items') || []
  const viewportRef = useRef(null)
  const trackRef = useRef(null)
  const pausedRef = useRef(false)
  const [isStatic] = useState(prefersReducedMotion)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    if (isStatic) return undefined
    const viewport = viewportRef.current
    const track = trackRef.current
    let half = track.scrollWidth / 2
    let pos = 0
    let speed = 0
    let velocity = 0
    let hovering = false
    let visible = true
    let drag = null
    let frame = 0
    let last = 0

    const normalize = () => {
      if (half > 0) pos = ((pos % half) + half) % half
    }
    const paint = () => {
      track.style.transform = `translate3d(${isRtl ? pos : -pos}px, 0, 0)`
    }

    const tick = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
      last = now
      const target = hovering || drag || pausedRef.current ? 0 : SPEED
      speed += (target - speed) * Math.min(1, dt * 2.4)
      if (!drag) {
        pos += (speed + velocity) * dt
        velocity *= Math.exp(-dt * 3.5)
        if (Math.abs(velocity) < 1) velocity = 0
      }
      normalize()
      paint()
      frame = visible ? requestAnimationFrame(tick) : 0
    }

    const resume = () => {
      if (!frame && visible) {
        last = 0
        frame = requestAnimationFrame(tick)
      }
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
    }
    const onMove = (event) => {
      if (!drag || event.pointerId !== drag.id) return
      const dx = event.clientX - drag.x
      if (!drag.moved && Math.abs(dx) < 4) return
      if (!drag.moved) {
        drag.moved = true
        viewport.setPointerCapture(event.pointerId)
        viewport.classList.add('is-dragging')
      }
      const now = performance.now()
      const delta = isRtl ? dx : -dx
      pos += delta
      const dt = Math.max(1, now - drag.t) / 1000
      velocity = velocity * 0.6 + (delta / dt) * 0.4
      drag.x = event.clientX
      drag.t = now
      normalize()
      paint()
    }
    const onUp = (event) => {
      if (!drag || event.pointerId !== drag.id) return
      if (performance.now() - drag.t > 120) velocity = 0
      velocity = Math.max(-2400, Math.min(2400, velocity))
      if (drag.moved && viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
      viewport.classList.remove('is-dragging')
      drag = null
    }

    const resizeObserver = new ResizeObserver(() => {
      half = track.scrollWidth / 2
      normalize()
    })
    resizeObserver.observe(track)

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) resume()
    })
    intersectionObserver.observe(viewport)

    viewport.addEventListener('pointerenter', onEnter)
    viewport.addEventListener('pointerleave', onLeave)
    viewport.addEventListener('pointerdown', onDown)
    viewport.addEventListener('pointermove', onMove)
    viewport.addEventListener('pointerup', onUp)
    viewport.addEventListener('pointercancel', onUp)
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
      track.style.transform = ''
    }
  }, [isStatic, isRtl, items.length])

  const offerName = (id) => t(`offers.items.${id}.name`)
  const loop = isStatic ? [items] : [items, items]

  return (
    <section className="section reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="container reviews-head">
        <header className="section-intro" data-reveal>
          <p className="kicker">{t('reviews.kicker')}</p>
          <h2 className="h2" id="reviews-title">
            {t('reviews.title')}
          </h2>
        </header>
        <div className="reviews-meta" data-reveal>
          <span className="tag is-outline">{t('reviews.illustrative')}</span>
          {isStatic ? null : (
            <button
              type="button"
              className="reviews-toggle"
              aria-pressed={paused}
              onClick={() => setPaused((value) => !value)}
              aria-label={t(paused ? 'reviews.play' : 'reviews.pause')}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                {paused ? <path d="M3 1.5v9l7-4.5z" fill="currentColor" /> : <path d="M3 1.5h2v9H3zM7 1.5h2v9H7z" fill="currentColor" />}
              </svg>
            </button>
          )}
        </div>
      </div>

      <div ref={viewportRef} className={`reviews-viewport${isStatic ? ' is-static' : ''}`}>
        <ul ref={trackRef} className="reviews-track">
          {loop.map((list, copy) =>
            list.map((item, index) => (
              <ReviewCard
                key={`${copy}-${index}`}
                item={item}
                index={index}
                total={items.length}
                offerName={offerName(item.offer)}
                hidden={copy > 0}
              />
            )),
          )}
        </ul>
      </div>
    </section>
  )
}

export default Reviews
