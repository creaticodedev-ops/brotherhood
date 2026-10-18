import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nProvider'
import { ChevronIcon } from './icons'
import { useAdminText } from './strings'

const INTL = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-MA-u-nu-latn' }
const SHEET_BELOW = 560
const GAP = 8
const TOP_CLEARANCE = 84
const HOURS = Array.from({ length: 24 }, (_, n) => n)
const MINUTES = Array.from({ length: 60 }, (_, n) => n)

const pad = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const utc = (y, m, d) => new Date(Date.UTC(y, m, d))
const partsOf = (date) => ({ y: date.getUTCFullYear(), m: date.getUTCMonth(), d: date.getUTCDate() })

/** Reads the same strings a native date / datetime-local input produces, without any timezone shift. */
const parse = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value || '')
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]), h: Number(match[4] || 0), min: Number(match[5] || 0) }
}

/** Wall-clock "now" in the zone the form is edited in, so "today" matches the schedule's own clock. */
const nowIn = (timeZone) => {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date())
        .map((part) => [part.type, part.value]),
    )
    return { y: Number(parts.year), m: Number(parts.month) - 1, d: Number(parts.day), h: Number(parts.hour) % 24, min: Number(parts.minute) }
  } catch {
    const now = new Date()
    return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate(), h: now.getHours(), min: now.getMinutes() }
  }
}

const shiftMonth = (y, m, delta) => partsOf(utc(y, m + delta, 1))

export const DateField = ({ id, value, onChange, mode = 'date', min, max, timeZone, invalid = false, disabled = false, labelledBy }) => {
  const a = useAdminText()
  const { locale, isRtl } = useI18n()
  const intl = INTL[locale] || INTL.fr
  const withTime = mode === 'datetime'
  const fallbackId = useId()
  const fieldId = id || fallbackId
  const panelId = `${fieldId}-picker`
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days')
  const [sheet, setSheet] = useState(false)
  const [position, setPosition] = useState(null)
  const selected = parse(value)
  const today = useMemo(() => (open ? nowIn(timeZone) : null), [open, timeZone])
  const [cursor, setCursor] = useState(() => selected || nowIn(timeZone))
  const [focusDay, setFocusDay] = useState('')
  const minDay = (min || '').slice(0, 10)
  const maxDay = (max || '').slice(0, 10)

  const formats = useMemo(
    () => ({
      field: new Intl.DateTimeFormat(intl, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
      title: new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      month: new Intl.DateTimeFormat(intl, { month: 'short', timeZone: 'UTC' }),
      weekday: new Intl.DateTimeFormat(intl, { weekday: 'narrow', timeZone: 'UTC' }),
      weekdayLong: new Intl.DateTimeFormat(intl, { weekday: 'long', timeZone: 'UTC' }),
      full: new Intl.DateTimeFormat(intl, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
    }),
    [intl],
  )

  const label = selected
    ? `${formats.field.format(utc(selected.y, selected.m, selected.d))}${withTime ? ` · ${pad(selected.h)}:${pad(selected.min)}` : ''}`
    : ''

  const allowed = useCallback((day) => (!minDay || day >= minDay) && (!maxDay || day <= maxDay), [minDay, maxDay])

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    setView('days')
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const openPicker = () => {
    if (disabled) return
    const start = selected || nowIn(timeZone)
    setCursor({ y: start.y, m: start.m })
    setFocusDay(ymd(start.y, start.m, start.d))
    setView('days')
    setOpen(true)
  }

  const emit = (y, m, d, h, mi) => onChange(withTime ? `${ymd(y, m, d)}T${pad(h)}:${pad(mi)}` : ymd(y, m, d))

  const choose = (y, m, d) => {
    if (!allowed(ymd(y, m, d))) return
    emit(y, m, d, selected?.h ?? 0, selected?.min ?? 0)
    if (!withTime) close()
    else setFocusDay(ymd(y, m, d))
  }

  const place = useCallback(() => {
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    if (vw < SHEET_BELOW) {
      setSheet(true)
      setPosition(null)
      return
    }
    setSheet(false)
    const rect = trigger.getBoundingClientRect()
    const width = Math.min(336, vw - GAP * 2)
    const height = panel.scrollHeight
    let left = isRtl ? rect.right - width : rect.left
    left = Math.min(Math.max(GAP, left), vw - width - GAP)
    const below = vh - rect.bottom - GAP * 2
    const above = rect.top - GAP * 2
    if (height <= below || below >= above) {
      setPosition({ top: rect.bottom + GAP, left, width, maxHeight: below })
    } else {
      const fit = Math.min(height, above)
      setPosition({ top: Math.max(GAP, rect.top - GAP - fit), left, width, maxHeight: above })
    }
  }, [isRtl])

  useLayoutEffect(() => {
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!open || !trigger || !panel || document.documentElement.clientWidth < SHEET_BELOW) return
    const rect = trigger.getBoundingClientRect()
    const need = panel.scrollHeight + GAP * 2
    if (window.innerHeight - rect.bottom >= need || rect.top >= need) return
    const shift = Math.min(rect.top - TOP_CLEARANCE, rect.bottom + need - window.innerHeight)
    if (shift > 0) window.scrollBy(0, shift)
  }, [open])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, view, place])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (panelRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return
      close(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, place, close])

  useEffect(() => {
    if (!open || view !== 'days' || !focusDay) return
    panelRef.current?.querySelector(`[data-day="${focusDay}"]`)?.focus({ preventScroll: true })
  }, [open, view, focusDay, cursor])

  const weeks = useMemo(() => {
    const offset = (utc(cursor.y, cursor.m, 1).getUTCDay() + 6) % 7
    return Array.from({ length: 6 }, (_, row) =>
      Array.from({ length: 7 }, (_, col) => partsOf(utc(cursor.y, cursor.m, 1 - offset + row * 7 + col))),
    )
  }, [cursor])

  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, n) => utc(2024, 0, 1 + n)), [])

  const moveFocus = (day, delta) => {
    const next = partsOf(utc(day.y, day.m, day.d + delta))
    setFocusDay(ymd(next.y, next.m, next.d))
    if (next.m !== cursor.m || next.y !== cursor.y) setCursor({ y: next.y, m: next.m })
  }

  const onDayKey = (event, day) => {
    const forward = isRtl ? -1 : 1
    const weekday = (utc(day.y, day.m, day.d).getUTCDay() + 6) % 7
    const steps = {
      ArrowRight: forward,
      ArrowLeft: -forward,
      ArrowDown: 7,
      ArrowUp: -7,
      Home: -weekday,
      End: 6 - weekday,
    }
    if (event.key in steps) {
      event.preventDefault()
      moveFocus(day, steps[event.key])
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(day.y, day.m, day.d)
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      const months = (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1)
      const target = shiftMonth(day.y, day.m, months)
      const last = utc(target.y, target.m + 1, 0).getUTCDate()
      setCursor({ y: target.y, m: target.m })
      setFocusDay(ymd(target.y, target.m, Math.min(day.d, last)))
    }
  }

  const stepMonth = (delta) => {
    const next = shiftMonth(cursor.y, cursor.m, delta)
    setCursor({ y: next.y, m: next.m })
    const last = utc(next.y, next.m + 1, 0).getUTCDate()
    const focused = parse(focusDay)
    setFocusDay(ymd(next.y, next.m, Math.min(focused?.d || 1, last)))
  }

  const setTime = (patch) => {
    if (!selected) return
    const time = { h: selected.h, min: selected.min, ...patch }
    emit(selected.y, selected.m, selected.d, time.h, time.min)
  }

  const todayKey = today ? ymd(today.y, today.m, today.d) : ''
  const selectedKey = selected ? ymd(selected.y, selected.m, selected.d) : ''
  const PrevIcon = <ChevronIcon className="adm-picker-chevron is-prev" />
  const NextIcon = <ChevronIcon className="adm-picker-chevron" />

  const panel = open
    ? createPortal(
        <>
          {sheet ? <div className="adm-picker-scrim" aria-hidden="true" /> : null}
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={withTime ? a('picker.dateTime') : a('picker.date')}
            className={`adm-picker${sheet ? ' is-sheet' : ''}`}
            dir={isRtl ? 'rtl' : 'ltr'}
            style={position ? { top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight } : undefined}
          >
            <header className="adm-picker-head">
              <button
                type="button"
                className="adm-picker-title"
                aria-expanded={view === 'months'}
                aria-label={`${a('picker.months')} — ${formats.title.format(utc(cursor.y, cursor.m, 1))}`}
                onClick={() => setView(view === 'months' ? 'days' : 'months')}
              >
                <span>{view === 'months' ? cursor.y : formats.title.format(utc(cursor.y, cursor.m, 1))}</span>
                <ChevronIcon className={`adm-picker-caret${view === 'months' ? ' is-up' : ''}`} />
              </button>
              <span className="adm-picker-nav">
                <button
                  type="button"
                  className="adm-picker-step"
                  aria-label={view === 'months' ? a('picker.prevYear') : a('picker.prevMonth')}
                  onClick={() => (view === 'months' ? setCursor({ ...cursor, y: cursor.y - 1 }) : stepMonth(-1))}
                >
                  {PrevIcon}
                </button>
                <button
                  type="button"
                  className="adm-picker-step"
                  aria-label={view === 'months' ? a('picker.nextYear') : a('picker.nextMonth')}
                  onClick={() => (view === 'months' ? setCursor({ ...cursor, y: cursor.y + 1 }) : stepMonth(1))}
                >
                  {NextIcon}
                </button>
              </span>
            </header>

            {view === 'months' ? (
              <div className="adm-picker-months">
                {Array.from({ length: 12 }, (_, m) => (
                  <button
                    key={m}
                    type="button"
                    className={`adm-picker-month${m === cursor.m ? ' is-current' : ''}${selected && selected.y === cursor.y && selected.m === m ? ' is-selected' : ''}`}
                    aria-pressed={m === cursor.m}
                    onClick={() => {
                      setCursor({ y: cursor.y, m })
                      const last = utc(cursor.y, m + 1, 0).getUTCDate()
                      setFocusDay(ymd(cursor.y, m, Math.min(parse(focusDay)?.d || 1, last)))
                      setView('days')
                    }}
                  >
                    {formats.month.format(utc(cursor.y, m, 1))}
                  </button>
                ))}
              </div>
            ) : (
              <table className="adm-picker-grid" role="grid" aria-label={formats.title.format(utc(cursor.y, cursor.m, 1))}>
                <thead>
                  <tr>
                    {weekdays.map((day) => (
                      <th key={day.toISOString()} scope="col" abbr={formats.weekdayLong.format(day)}>
                        {formats.weekday.format(day)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week) => (
                    <tr key={ymd(week[0].y, week[0].m, week[0].d)}>
                      {week.map((day) => {
                        const key = ymd(day.y, day.m, day.d)
                        const outside = day.m !== cursor.m
                        const blocked = !allowed(key)
                        const classes = [
                          'adm-picker-day',
                          outside ? 'is-outside' : '',
                          key === todayKey ? 'is-today' : '',
                          key === selectedKey ? 'is-selected' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')
                        return (
                          <td key={key} role="gridcell" aria-selected={key === selectedKey}>
                            <button
                              type="button"
                              className={classes}
                              data-day={key}
                              tabIndex={key === focusDay ? 0 : -1}
                              disabled={blocked}
                              aria-current={key === todayKey ? 'date' : undefined}
                              aria-label={formats.full.format(utc(day.y, day.m, day.d))}
                              onClick={() => choose(day.y, day.m, day.d)}
                              onKeyDown={(event) => onDayKey(event, day)}
                              onFocus={() => setFocusDay(key)}
                            >
                              {day.d}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {withTime ? (
              <div className="adm-picker-time">
                <span className="adm-picker-time-label">{a('picker.time')}</span>
                <span className="adm-picker-time-fields" dir="ltr">
                  <select aria-label={a('picker.hours')} value={selected?.h ?? 0} disabled={!selected} onChange={(event) => setTime({ h: Number(event.target.value) })}>
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {pad(h)}
                      </option>
                    ))}
                  </select>
                  <span aria-hidden="true">:</span>
                  <select aria-label={a('picker.minutes')} value={selected?.min ?? 0} disabled={!selected} onChange={(event) => setTime({ min: Number(event.target.value) })}>
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {pad(m)}
                      </option>
                    ))}
                  </select>
                </span>
                {!selected ? <span className="adm-picker-hint">{a('picker.dateFirst')}</span> : null}
              </div>
            ) : null}

            <footer className="adm-picker-foot">
              <button
                type="button"
                className="adm-picker-link"
                disabled={!value}
                onClick={() => {
                  onChange('')
                  close()
                }}
              >
                {a('picker.clear')}
              </button>
              <span className="adm-picker-actions">
                <button
                  type="button"
                  className="adm-picker-link"
                  disabled={!allowed(todayKey)}
                  onClick={() => {
                    const now = nowIn(timeZone)
                    setCursor({ y: now.y, m: now.m })
                    setFocusDay(ymd(now.y, now.m, now.d))
                    emit(now.y, now.m, now.d, withTime ? now.h : 0, withTime ? now.min : 0)
                    if (!withTime) close()
                  }}
                >
                  {withTime ? a('picker.now') : a('picker.today')}
                </button>
                {withTime ? (
                  <button type="button" className="btn btn-primary btn-sm adm-picker-done" onClick={() => close()}>
                    {a('picker.done')}
                  </button>
                ) : null}
              </span>
            </footer>
          </div>
        </>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={triggerRef}
        id={fieldId}
        type="button"
        className={`adm-picker-trigger${open ? ' is-open' : ''}${value ? '' : ' is-empty'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-invalid={invalid || undefined}
        aria-labelledby={labelledBy ? `${labelledBy} ${fieldId}-value` : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : openPicker())}
      >
        <span className="adm-picker-value" id={`${fieldId}-value`}>{label || (withTime ? a('picker.dateTime') : a('picker.date'))}</span>
        <svg className="adm-picker-icon" width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.5" y="3.5" width="13" height="12" rx="2" />
            <path d="M2.5 7.5h13M6 2v3M12 2v3" />
          </g>
        </svg>
      </button>
      {panel}
    </>
  )
}
