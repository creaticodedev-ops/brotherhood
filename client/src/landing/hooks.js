import { useEffect, useRef, useState } from 'react'

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Adds `.is-in` to every `[data-reveal]` element once it enters the viewport. Re-scans when `rescanKey` changes. */
export const useReveal = (rescanKey) => {
  useEffect(() => {
    const elements = [...document.querySelectorAll('[data-reveal]:not(.is-in)')]
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-in'))
      return undefined
    }
    document.documentElement.classList.add('has-reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-in')
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [rescanKey])
}

/**
 * Returns the id of the last section (in display order) whose top has passed the reading line of the viewport.
 * At the very end of the page the last id wins: the contact block in the footer never reaches that line.
 */
export const useActiveSection = (ids) => {
  const [active, setActive] = useState(ids[0])
  const key = ids.join('|')

  useEffect(() => {
    const list = key.split('|')
    let frame = 0
    const update = () => {
      frame = 0
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        setActive(list[list.length - 1])
        return
      }
      const line = window.innerHeight * 0.45
      let current = list[0]
      list.forEach((id) => {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = id
      })
      setActive(current)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [key])

  return active
}

/**
 * Measures scroll progress through `ref` (0 → 1) and hands it to `onProgress`.
 * In the pinned layout the range is the section's extra height; otherwise its full height.
 */
export const usePinnedProgress = (ref, onProgress) => {
  const callback = useRef(onProgress)
  useEffect(() => {
    callback.current = onProgress
  })

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return undefined
    let frame = 0
    const update = () => {
      frame = 0
      const extra = el.offsetHeight - window.innerHeight
      const range = extra > 100 ? extra : el.offsetHeight || 1
      const progress = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / range))
      callback.current?.(progress)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref])
}

export const scrollToSection = (id) => {
  const target = id === 'top' ? document.body : document.getElementById(id)
  if (!target) return
  const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
  if (id === 'top') window.scrollTo({ top: 0, behavior })
  else target.scrollIntoView({ behavior, block: 'start' })
  window.history.replaceState(null, '', id === 'top' ? window.location.pathname : `#${id}`)
}
