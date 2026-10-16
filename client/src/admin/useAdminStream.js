import { useEffect, useRef, useState } from 'react'
import { adminApi, STREAM_URL, UNAUTHORIZED_EVENT } from './api'

const EVENTS = ['registration', 'application', 'notifications']
const RECONNECT_MS = 5000

/**
 * Subscribes to the admin Server-Sent Events stream. `onEvent(type, data)` receives
 * `registration`, `application`, `notifications`, and `resync` after a reconnection.
 * Returns whether the stream is currently connected.
 */
export const useAdminStream = (onEvent) => {
  const handler = useRef(onEvent)
  const [live, setLive] = useState(false)

  useEffect(() => {
    handler.current = onEvent
  })

  useEffect(() => {
    let source = null
    let timer = 0
    let alive = true
    let connectedOnce = false

    const connect = () => {
      source = new EventSource(STREAM_URL)
      source.addEventListener('ready', () => {
        setLive(true)
        if (connectedOnce) handler.current('resync', {})
        connectedOnce = true
      })
      EVENTS.forEach((type) =>
        source.addEventListener(type, (event) => {
          try {
            handler.current(type, JSON.parse(event.data))
          } catch {
            /* malformed event */
          }
        }),
      )
      // The stream keeps the cookie it was opened with: after a password change in Settings this tab holds
      // a newer session, so the session is checked before signing out.
      source.addEventListener('expired', () => {
        source.close()
        setLive(false)
        recover(0)
      })
      source.onerror = () => {
        setLive(false)
        if (source.readyState !== EventSource.CLOSED) return
        // The browser gave up (HTTP error): check the session before trying again.
        recover(RECONNECT_MS)
      }
    }

    const recover = (delay) => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        if (!alive) return
        try {
          const session = await adminApi.session()
          if (!session.authenticated) {
            window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
            return
          }
        } catch {
          /* API unreachable — retry anyway */
        }
        if (alive) connect()
      }, delay)
    }

    connect()
    return () => {
      alive = false
      clearTimeout(timer)
      source?.close()
    }
  }, [])

  return live
}
