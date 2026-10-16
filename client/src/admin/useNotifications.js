import { useCallback, useEffect, useState } from 'react'
import { adminApi } from './api'

/** Notification list + unread counter, kept in sync with the server and other admin tabs. */
export const useNotifications = () => {
  const [filter, setFilter] = useState('all')
  const [state, setState] = useState({ items: [], unread: 0, loaded: false, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .notifications(filter, controller.signal)
      .then((data) => setState({ items: data.items, unread: data.unread, loaded: true, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((prev) => ({ ...prev, loaded: true, error }))
      })
    return () => controller.abort()
  }, [filter, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  const add = useCallback((notification) => {
    setState((prev) => ({
      ...prev,
      unread: prev.unread + (notification.read ? 0 : 1),
      items: [notification, ...prev.items.filter((item) => item.id !== notification.id)],
    }))
  }, [])

  const sync = useCallback(({ unread, item, read }) => {
    setState((prev) => ({
      ...prev,
      unread,
      items: prev.items.map((entry) => {
        if (item && entry.id === item.id) return item
        if (read === 'all' || (Array.isArray(read) && read.includes(entry.id))) return { ...entry, read: true }
        return entry
      }),
    }))
  }, [])

  const setRead = useCallback(async (id, read) => {
    setState((prev) => ({
      ...prev,
      unread: Math.max(0, prev.unread + (prev.items.find((item) => item.id === id)?.read === read ? 0 : read ? -1 : 1)),
      items: prev.items.map((item) => (item.id === id ? { ...item, read } : item)),
    }))
    try {
      const data = await adminApi.setRead(id, read)
      setState((prev) => ({ ...prev, unread: data.unread }))
    } catch {
      setAttempt((n) => n + 1)
    }
  }, [])

  const readAll = useCallback(async () => {
    setState((prev) => ({ ...prev, unread: 0, items: prev.items.map((item) => ({ ...item, read: true })) }))
    try {
      await adminApi.readAll()
    } catch {
      setAttempt((n) => n + 1)
    }
  }, [])

  return { ...state, filter, setFilter, reload, add, sync, setRead, readAll }
}
