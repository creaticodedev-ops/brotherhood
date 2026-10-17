import { useEffect, useRef, useState } from 'react'
import './countdown.css'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const split = (ms) => {
  const safe = Math.max(0, ms)
  const days = Math.floor(safe / DAY)
  const hours = Math.floor((safe % DAY) / HOUR)
  const minutes = Math.floor((safe % HOUR) / MINUTE)
  const seconds = Math.floor((safe % MINUTE) / SECOND)
  return { days, hours, minutes, seconds }
}

const pad = (value) => String(value).padStart(2, '0')

const messageKey = (state) => {
  if (state.messagePreset && state.messagePreset !== 'auto') return state.messagePreset
  if (state.phase === 'open') return 'open'
  if (state.phase === 'scheduled') return 'soon'
  return 'closed'
}

export const useRegistrationWindow = (reloadKey = 0) => {
  const [result, setResult] = useState({ status: 'loading', window: null })

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/registrations/window', { signal: controller.signal, cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((window) => setResult({ status: 'ready', window }))
      .catch((error) => {
        if (error.name !== 'AbortError') setResult({ status: 'ready', window: null })
      })
    return () => controller.abort()
  }, [reloadKey])

  return result
}

export const RegistrationClock = ({ state, copy, children, onElapsed, plain = false }) => {
  const target = state?.showCountdown && state.target ? new Date(state.target).getTime() : null
  const [left, setLeft] = useState(() => (target ? Math.max(0, target - Date.now()) : 0))
  const elapsedRef = useRef(onElapsed)
  const fired = useRef(false)
  elapsedRef.current = onElapsed

  useEffect(() => {
    if (!target) return undefined
    fired.current = false
    let sawTime = false
    const skew = state.serverNow ? Date.now() - new Date(state.serverNow).getTime() : 0
    const tick = () => {
      const remaining = Math.max(0, target - (Date.now() - skew))
      setLeft(remaining)
      if (remaining > 0) sawTime = true
      if (remaining === 0 && sawTime && !fired.current) {
        fired.current = true
        elapsedRef.current?.()
      }
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [target, state?.serverNow])

  if (!state?.configured) return children || null

  const parts = split(left)
  const units = [
    ['days', parts.days],
    ['hours', parts.hours],
    ['minutes', parts.minutes],
    ['seconds', parts.seconds],
  ]
  const headline = state.showCountdown
    ? state.targetKind === 'close'
      ? copy.untilClose
      : copy.untilOpen
    : state.phase === 'open'
      ? copy.openTitle
      : state.phase === 'scheduled'
        ? copy.soonTitle
        : copy.closedTitle

  return (
    <section className={plain ? 'clock is-plain' : 'clock'} aria-label={headline}>
      <p className="clock-kicker">{copy.kicker}</p>
      <p className="clock-title">{headline}</p>
      <p className="clock-message">{copy[messageKey(state)]}</p>
      {state.showCountdown ? (
        <ol className="clock-grid">
          {units.map(([key, value]) => (
            <li key={key}>
              <span className="clock-value">{key === 'days' ? String(value) : pad(value)}</span>
              <span className="clock-unit">{copy[key]}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {children}
    </section>
  )
}
