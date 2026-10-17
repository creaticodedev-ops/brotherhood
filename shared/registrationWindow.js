export const WINDOW_ZONE = 'Africa/Casablanca'
export const WINDOW_ZONES = ['Africa/Casablanca', 'UTC', 'Europe/Paris', 'Europe/London']
export const MESSAGE_PRESETS = ['auto', 'soon', 'open', 'closed']
export const OVERRIDES = ['auto', 'open', 'closed']

const pad = (value) => String(value).padStart(2, '0')

const partsInZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const pick = (type) => parts.find((part) => part.type === type)?.value || ''
  let hour = pick('hour')
  if (hour === '24') hour = '00'
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour,
    minute: pick('minute'),
    second: pick('second'),
  }
}

/** Milliseconds to add to UTC to reach the clock time in `timeZone`. */
export const zoneOffsetMs = (utcMs, timeZone) => {
  const part = partsInZone(new Date(utcMs), timeZone)
  const zoned = Date.UTC(Number(part.year), Number(part.month) - 1, Number(part.day), Number(part.hour), Number(part.minute), Number(part.second))
  return zoned - utcMs
}

/** `YYYY-MM-DDTHH:mm` as read on a clock in `timeZone`, or ''. */
export const utcToZonedInput = (value, timeZone = WINDOW_ZONE) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const part = partsInZone(date, timeZone)
  return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}`
}

/**
 * Interprets a datetime-local value as wall time in `timeZone`.
 * Returns `{ ok: true, date: null }` when the field is empty.
 */
export const parseZonedInput = (value, timeZone = WINDOW_ZONE) => {
  if (value == null || value === '') return { ok: true, date: null }
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) return { ok: false, date: null }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return { ok: false, date: null }
  const wall = Date.UTC(year, month - 1, day, hour, minute)
  let utc = wall
  for (let pass = 0; pass < 3; pass += 1) utc = wall - zoneOffsetMs(utc, timeZone)
  const date = new Date(utc)
  if (utcToZonedInput(date, timeZone) !== `${match[1]}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`) return { ok: false, date: null }
  return { ok: true, date }
}

const validDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Effective registration state. `now` must be the server clock.
 * With no schedule and no override, applications stay open — the previous behavior.
 */
export const resolveRegistration = (settings, now = new Date()) => {
  const timeZone = WINDOW_ZONES.includes(settings?.timeZone) ? settings.timeZone : WINDOW_ZONE
  const opensAt = validDate(settings?.opensAt)
  const closesAt = validDate(settings?.closesAt)
  const override = OVERRIDES.includes(settings?.override) ? settings.override : 'auto'
  const messagePreset = MESSAGE_PRESETS.includes(settings?.messagePreset) ? settings.messagePreset : 'auto'
  const countdownVisible = settings?.countdownVisible === true
  const configured = Boolean(opensAt || closesAt || override !== 'auto')
  const invalid = Boolean(opensAt && closesAt && opensAt.getTime() >= closesAt.getTime())

  let scheduled = 'open'
  let target = null
  let targetKind = null

  if (!configured) {
    scheduled = 'open'
  } else if (invalid) {
    scheduled = 'closed'
  } else if (opensAt && now < opensAt) {
    scheduled = 'scheduled'
    target = opensAt
    targetKind = 'open'
  } else if (closesAt && now >= closesAt) {
    scheduled = 'closed'
  } else {
    scheduled = 'open'
    if (closesAt) {
      target = closesAt
      targetKind = 'close'
    }
  }

  const phase = override === 'open' ? 'open' : override === 'closed' ? 'closed' : scheduled

  return {
    configured,
    invalid,
    phase,
    scheduled,
    accepting: phase === 'open',
    override,
    countdownVisible,
    showCountdown: countdownVisible && !invalid && Boolean(target),
    target: target ? target.toISOString() : null,
    targetKind,
    opensAt: opensAt ? opensAt.toISOString() : null,
    closesAt: closesAt ? closesAt.toISOString() : null,
    timeZone,
    messagePreset,
    serverNow: new Date(now).toISOString(),
  }
}

export const readSettingsInput = (body = {}) => {
  const errors = {}
  if (!WINDOW_ZONES.includes(body.timeZone)) errors.timeZone = 'invalid'
  const zone = errors.timeZone ? WINDOW_ZONE : body.timeZone
  const opens = parseZonedInput(body.opensAt, zone)
  const closes = parseZonedInput(body.closesAt, zone)
  if (!opens.ok) errors.opensAt = 'invalid'
  if (!closes.ok) errors.closesAt = 'invalid'
  if (opens.ok && closes.ok && opens.date && closes.date && opens.date.getTime() >= closes.date.getTime()) errors.closesAt = 'order'
  if (!OVERRIDES.includes(body.override)) errors.override = 'invalid'
  if (!MESSAGE_PRESETS.includes(body.messagePreset)) errors.messagePreset = 'invalid'
  if (typeof body.countdownVisible !== 'boolean') errors.countdownVisible = 'invalid'
  return {
    errors,
    data: {
      timeZone: zone,
      opensAt: opens.date,
      closesAt: closes.date,
      override: OVERRIDES.includes(body.override) ? body.override : 'auto',
      messagePreset: MESSAGE_PRESETS.includes(body.messagePreset) ? body.messagePreset : 'auto',
      countdownVisible: body.countdownVisible === true,
    },
  }
}

/** Public payload. Admin credentials and member records are never included. */
export const toPublicWindow = (settings, now) => {
  const state = resolveRegistration(settings, now)
  return {
    configured: state.configured,
    invalid: state.invalid,
    phase: state.phase,
    accepting: state.accepting,
    showCountdown: state.showCountdown,
    target: state.target,
    targetKind: state.targetKind,
    opensAt: state.opensAt,
    closesAt: state.closesAt,
    timeZone: state.timeZone,
    messagePreset: state.messagePreset,
    serverNow: state.serverNow,
  }
}
