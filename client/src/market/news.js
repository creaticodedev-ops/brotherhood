import { useCallback, useEffect, useState } from 'react'
import { fetchNews } from './api'

const POLL_MS = 45_000
const HIDDEN_POLL_MS = 180_000
const RETRY_MS = 15_000
const EMPTY = []

/** Live headlines for `locale`, refreshed every 45 s (slower while the tab is hidden). */
export const useNews = (locale) => {
  const [state, setState] = useState({ locale, items: [], updatedAt: 0, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let timer = 0
    let controller = null
    let alive = true

    const schedule = (ms) => {
      clearTimeout(timer)
      timer = setTimeout(load, ms)
    }

    async function load() {
      controller?.abort()
      controller = new AbortController()
      try {
        const data = await fetchNews(locale, controller.signal)
        if (!alive) return
        setState({ locale, items: data.items || [], updatedAt: data.updatedAt || Date.now(), error: null })
        schedule(document.hidden ? HIDDEN_POLL_MS : POLL_MS)
      } catch (error) {
        if (!alive || error.name === 'AbortError') return
        setState((prev) => ({ ...prev, locale, error }))
        schedule(RETRY_MS)
      }
    }

    const onVisibility = () => {
      if (!document.hidden) load()
    }

    load()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      alive = false
      clearTimeout(timer)
      controller?.abort()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [locale, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])
  const current = state.locale === locale

  return {
    items: current ? state.items : EMPTY,
    updatedAt: current ? state.updatedAt : 0,
    error: current ? state.error : null,
    retry,
  }
}
