/**
 * Multi-market data (metals, forex, indices, stocks, commodities, crypto, bonds).
 * - Live quote: Dukascopy public tick feed, or Swissquote public bid/ask feed for metals.
 * - Candles: Dukascopy public chart feed (bid side). Dukascopy only returns completed bars,
 *   so the in-progress bar is rebuilt from minute data.
 * Both feeds are public, unauthenticated and rate-limited by courtesy: everything is cached
 * and upstream requests are throttled.
 */

import { getInstrument } from './instruments.js'

const SWISSQUOTE_URL = 'https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/'
const DUKASCOPY_URL = 'https://freeserv.dukascopy.com/2.0/index.php'
const DUKASCOPY_REFERER = 'https://freeserv.dukascopy.com/2.0/?path=chart/index&instrument='
const USER_AGENT = 'Mozilla/5.0 (US Bonds market data)'

const MINUTE = 60
const HOUR = 3600
const DAY = 86400

/** Public timeframes → Dukascopy source interval, bucket size (s) and history length. */
export const TIMEFRAMES = {
  '1m': { source: '1MIN', size: MINUTE, limit: 600 },
  '5m': { source: '5MIN', size: 5 * MINUTE, limit: 600 },
  '15m': { source: '15MIN', size: 15 * MINUTE, limit: 600 },
  '1h': { source: '1HOUR', size: HOUR, limit: 600 },
  '4h': { source: '4HOUR', size: 4 * HOUR, limit: 600 },
  '1d': { source: '1DAY', size: DAY, limit: 1000 },
  '1w': { source: '1DAY', size: 7 * DAY, limit: 1000, weekly: true },
}

const STALE_AFTER_MS = 3 * 60 * 1000
const MAX_UPSTREAM = 4
const RATE_LIMIT_PAUSE_MS = 30_000

const cache = new Map()

/** Memoises an async loader for `ttl` ms and shares in-flight requests. */
const cached = async (key, ttl, loader) => {
  const hit = cache.get(key)
  const now = Date.now()
  if (hit?.value && now - hit.at < ttl) return hit.value
  if (hit?.pending) return hit.pending
  const pending = loader()
    .then((value) => {
      cache.set(key, { value, at: Date.now() })
      return value
    })
    .catch((error) => {
      if (hit?.value) {
        cache.set(key, hit)
        return hit.value
      }
      cache.delete(key)
      throw error
    })
  cache.set(key, { ...hit, pending })
  return pending
}

let active = 0
const queue = []
const drain = () => {
  while (active < MAX_UPSTREAM && queue.length) {
    const { task, resolve, reject } = queue.shift()
    active += 1
    task()
      .then(resolve, reject)
      .finally(() => {
        active -= 1
        drain()
      })
  }
}
const throttled = (task) =>
  new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject })
    drain()
  })

const fetchWithTimeout = (url, options = {}, timeout = 8000) =>
  throttled(async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    try {
      const response = await fetch(url, { ...options, signal: controller.signal })
      if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status} for ${url}`), { upstreamStatus: response.status })
      return await response.text()
    } finally {
      clearTimeout(timer)
    }
  })

/** While Dukascopy rate-limits us (HTTP 429), requests fail fast and callers fall back to cached data. */
let pausedUntil = 0

const dukascopyRows = async (instrument, interval, limit) => {
  if (Date.now() < pausedUntil) throw new Error('Dukascopy rate limit: paused')
  const params = new URLSearchParams({
    path: 'chart/json3',
    instrument: instrument.duka,
    offer_side: 'B',
    interval,
    splits: 'true',
    stocks: 'true',
    limit: String(limit),
    time_direction: 'P',
    timestamp: String(Date.now()),
    jsonp: '_cb',
  })
  const request = (timeout) =>
    fetchWithTimeout(
      `${DUKASCOPY_URL}?${params}`,
      { headers: { referer: `${DUKASCOPY_REFERER}${instrument.duka}`, 'user-agent': USER_AGENT } },
      timeout,
    )
  // Some upstream requests stall; a fresh attempt usually answers immediately.
  const timeout = limit >= 600 ? 9000 : 4500
  const text = await request(timeout).catch((error) => {
    if (error.upstreamStatus === 429) {
      pausedUntil = Date.now() + RATE_LIMIT_PAUSE_MS
      console.warn('[market] Dukascopy rate limit reached, pausing upstream requests for 30 s')
    }
    if (error.upstreamStatus) throw error
    return request(timeout + 3000)
  })
  const rows = JSON.parse(text.slice(text.indexOf('(') + 1, text.lastIndexOf(')')))
  if (!Array.isArray(rows)) throw new Error('Unexpected Dukascopy payload')
  return rows.filter(Array.isArray)
}

/** Raw Dukascopy candles, ascending, as { time (s), open, high, low, close, volume }. */
const fetchDukascopy = async (instrument, interval, limit) =>
  (await dukascopyRows(instrument, interval, limit))
    .map(([t, open, high, low, close, volume]) => ({ time: Math.floor(t / 1000), open, high, low, close, volume }))
    .filter((c) => Number.isFinite(c.close))
    .sort((a, b) => a.time - b.time)
    .filter((c, i, list) => i === 0 || c.time > list[i - 1].time)

/*
 * Dukascopy occasionally answers from a lagging replica. Per instrument, the newest data seen is
 * kept and an older answer is never allowed to replace it.
 */
const latestMinutes = new Map()
const latestTicks = new Map()

const minutes = (instrument) =>
  cached(`min:${instrument.id}`, 20_000, async () => {
    const fresh = await fetchDukascopy(instrument, '1MIN', 1440)
    const known = latestMinutes.get(instrument.id)
    if (known && (fresh.at(-1)?.time ?? 0) < known.at(-1).time) return known
    if (fresh.length) latestMinutes.set(instrument.id, fresh)
    return fresh
  })

/** Completed source bars, shared by the quote (previous close) and the chart. */
const bars = (instrument, interval, limit, ttl) =>
  cached(`bars:${instrument.id}:${interval}:${limit}`, ttl, () => fetchDukascopy(instrument, interval, limit))

const daily = (instrument) => bars(instrument, '1DAY', TIMEFRAMES['1d'].limit, 5 * 60_000)

const bucketStart = (time, size, weekly) => {
  if (!weekly) return Math.floor(time / size) * size
  const day = Math.floor(time / DAY) * DAY
  const weekday = new Date(day * 1000).getUTCDay()
  return day - weekday * DAY
}

const aggregate = (candles, size, weekly = false) => {
  const out = []
  for (const c of candles) {
    const time = bucketStart(c.time, size, weekly)
    const last = out[out.length - 1]
    if (last && last.time === time) {
      last.high = Math.max(last.high, c.high)
      last.low = Math.min(last.low, c.low)
      last.close = c.close
      last.volume += c.volume
    } else {
      out.push({ ...c, time })
    }
  }
  return out
}

/** Merges minute data newer than the last completed bar into the series. */
const completeWithMinutes = (candles, mins, size) => {
  const last = candles[candles.length - 1]
  const fresh = mins.filter((m) => !last || m.time >= last.time)
  if (!fresh.length) return candles
  const extra = aggregate(fresh, size)
  const result = candles.slice()
  for (const bar of extra) {
    const tail = result[result.length - 1]
    if (tail && tail.time === bar.time) {
      result[result.length - 1] = {
        ...tail,
        high: Math.max(tail.high, bar.high),
        low: Math.min(tail.low, bar.low),
        close: bar.close,
      }
    } else if (!tail || bar.time > tail.time) {
      result.push(bar)
    }
  }
  return result
}

const round = (value, digits) => Math.round(value * 10 ** digits) / 10 ** digits
const fixed = (value, digits) => (value == null || !Number.isFinite(value) ? null : round(value, digits))
const precise = (value) => (Number.isFinite(value) ? Number(value.toPrecision(6)) : 0)

export const unknownInstrument = () => Object.assign(new Error('Unknown instrument'), { status: 404, expose: 'Unknown instrument' })

const resolve = (id) => {
  const instrument = getInstrument(id)
  if (!instrument) throw unknownInstrument()
  return instrument
}

export const getCandles = (id, tf) => {
  const instrument = resolve(id)
  const frame = TIMEFRAMES[tf]
  if (!frame) throw Object.assign(new Error('Unknown timeframe'), { status: 400 })
  const ttl = frame.size >= DAY ? 60_000 : 20_000
  const digits = instrument.digits + 1
  const source = () => {
    if (tf === '1m') return minutes(instrument)
    if (frame.source === '1DAY') return daily(instrument)
    return bars(instrument, frame.source, frame.limit, 30_000)
  }
  return cached(`candles:${instrument.id}:${tf}`, ttl, async () => {
    const [base, mins] = await Promise.all([source(), minutes(instrument)])
    let series = tf === '1m' ? base.slice(-frame.limit) : completeWithMinutes(base, mins, frame.weekly ? DAY : frame.size)
    if (frame.weekly) series = aggregate(series, frame.size, true)
    return {
      symbol: instrument.id,
      tf,
      candles: series.map((c) => ({
        time: c.time,
        open: round(c.open, digits),
        high: round(c.high, digits),
        low: round(c.low, digits),
        close: round(c.close, digits),
        volume: precise(c.volume),
      })),
    }
  })
}

const fetchSwissquote = async (instrument) => {
  const text = await fetchWithTimeout(`${SWISSQUOTE_URL}${instrument.duka}`, { headers: { 'user-agent': USER_AGENT } }, 5000)
  const feeds = JSON.parse(text)
  const feed = feeds.find((f) => f.topo?.platform === 'SwissquoteLtd') || feeds[0]
  const prices = feed?.spreadProfilePrices || []
  const best = prices.reduce((a, b) => (!a || b.ask - b.bid < a.ask - a.bid ? b : a), null)
  if (!best || !Number.isFinite(best.bid) || !Number.isFinite(best.ask)) throw new Error('Unexpected Swissquote payload')
  return { bid: best.bid, ask: best.ask, ts: feed.ts || Date.now(), source: 'Swissquote' }
}

const requestTick = async (instrument) => {
  const [row] = await dukascopyRows(instrument, 'TICK', 1)
  if (!row || !Number.isFinite(row[1]) || !Number.isFinite(row[2])) throw new Error('No tick data')
  return { bid: Math.min(row[1], row[2]), ask: Math.max(row[1], row[2]), ts: row[0], source: 'Dukascopy' }
}

const fetchTick = async (instrument) => {
  const known = latestTicks.get(instrument.id)
  let tick
  try {
    tick = await requestTick(instrument)
  } catch (error) {
    if (known) return known
    throw error
  }
  if (!known && Date.now() - tick.ts > STALE_AFTER_MS) {
    const retry = await requestTick(instrument).catch(() => tick)
    if (retry.ts > tick.ts) tick = retry
  }
  if (known && known.ts >= tick.ts) return known
  latestTicks.set(instrument.id, tick)
  return tick
}

const fetchLastMinute = async (instrument) => {
  const mins = await minutes(instrument)
  const last = mins[mins.length - 1]
  if (!last) throw new Error('No minute data')
  return { bid: last.close, ask: null, ts: (last.time + MINUTE) * 1000, source: 'Dukascopy' }
}

const liveQuote = (instrument) =>
  instrument.feed === 'swissquote'
    ? fetchSwissquote(instrument).catch(() => fetchTick(instrument)).catch(() => fetchLastMinute(instrument))
    : fetchTick(instrument).catch(() => fetchLastMinute(instrument))

/** Previous close = last daily close before the trading day of the latest quote. */
const previousClose = (daily, mins, day) =>
  daily.filter((d) => d.time < day).pop()?.close ?? mins.filter((m) => m.time < day).pop()?.close ?? null

export const getQuote = (id) => {
  const instrument = resolve(id)
  const digits = instrument.digits + 1
  return cached(`quote:${instrument.id}`, 1500, async () => {
    const [live, mins, days] = await Promise.all([
      liveQuote(instrument),
      minutes(instrument).catch(() => []),
      daily(instrument).catch(() => []),
    ])
    const price = live.bid
    const day = Math.floor(live.ts / 1000 / DAY) * DAY
    const prevClose = previousClose(days, mins, day)
    const todays = mins.filter((m) => m.time >= day)
    const high = Math.max(price, ...todays.map((m) => m.high))
    const low = Math.min(price, ...todays.map((m) => m.low))
    const change = prevClose ? price - prevClose : null
    return {
      symbol: instrument.id,
      price: round(price, digits),
      bid: round(live.bid, digits),
      ask: fixed(live.ask, digits),
      spread: live.ask == null ? null : round(live.ask - live.bid, digits),
      prevClose: fixed(prevClose, digits),
      open: fixed(todays[0]?.open, digits),
      high: round(high, digits),
      low: round(low, digits),
      change: fixed(change, digits),
      changePct: change == null ? null : round((change / prevClose) * 100, 3),
      ts: live.ts,
      marketOpen: Date.now() - live.ts < STALE_AFTER_MS,
      source: live.source,
    }
  })
}

/**
 * Watchlist row: live price, change versus previous close and a 24-hour sparkline.
 * One 72-hour hourly series provides both the sparkline and the previous close (last hourly close
 * before the quote's trading day), which keeps upstream requests to two per instrument.
 */
const overviewRow = async (instrument) => {
  const digits = instrument.digits + 1
  try {
    const [live, hourly] = await Promise.all([
      cached(`live:${instrument.id}`, 12_000, () => liveQuote(instrument)),
      bars(instrument, '1HOUR', 72, 10 * 60_000).catch(() => []),
    ])
    const day = Math.floor(live.ts / 1000 / DAY) * DAY
    const prevClose = hourly.filter((c) => c.time < day).pop()?.close ?? null
    const change = prevClose ? live.bid - prevClose : null
    return {
      id: instrument.id,
      price: round(live.bid, digits),
      change: fixed(change, digits),
      changePct: change == null ? null : round((change / prevClose) * 100, 3),
      ts: live.ts,
      marketOpen: Date.now() - live.ts < STALE_AFTER_MS,
      spark: [...hourly.slice(-24).map((c) => round(c.close, digits)), round(live.bid, digits)],
    }
  } catch (error) {
    console.warn('[market]', instrument.id, error.message)
    return { id: instrument.id, error: true }
  }
}

export const getOverview = (instruments) => Promise.all(instruments.map(overviewRow))
