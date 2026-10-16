import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../landing/hooks'

export const STATUS_ORDER = ['pending', 'approved', 'active', 'completed', 'rejected']

/** Re-renders every `ms` so relative times stay current. */
export const useNow = (ms = 30_000) => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

/** Eases a displayed number towards `value` (instant with reduced motion). */
export const useCountUp = (value, duration = 900) => {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? value : 0))
  const from = useRef(0)
  useEffect(() => {
    if (prefersReducedMotion()) {
      from.current = value
      setShown(value)
      return undefined
    }
    const start = performance.now()
    const origin = from.current
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration)
      const next = origin + (value - origin) * (1 - (1 - t) ** 4)
      setShown(t === 1 ? value : next)
      from.current = next
      if (t < 1) frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [value, duration])
  return shown
}

/** Escape closes, Tab stays inside, focus returns to the opener on close. */
export const useDialogFocus = (ref, open, onClose) => {
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    if (!open) return undefined
    const panel = ref.current
    const previous = document.activeElement
    const frame = requestAnimationFrame(() => panel?.querySelector('[data-autofocus]')?.focus())
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close.current()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const focusable = [...panel.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex="0"]')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus({ preventScroll: true })
    }
  }, [open, ref])
}
