const request = async (path, options) => {
  const response = await fetch(`/api${path}`, options)
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(body.error || `HTTP ${response.status}`), { status: response.status, body })
  return body
}

export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w']

/** Bucket size in seconds; weekly buckets start on Sunday 00:00 UTC (same rule as the API). */
export const TIMEFRAME_SECONDS = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800 }

export const bucketStart = (seconds, tf) => {
  if (tf !== '1w') return Math.floor(seconds / TIMEFRAME_SECONDS[tf]) * TIMEFRAME_SECONDS[tf]
  const day = Math.floor(seconds / 86400) * 86400
  return day - new Date(day * 1000).getUTCDay() * 86400
}

export const GOLD = 'XAUUSD'

export const fetchInstruments = () => request('/market/instruments')

export const fetchQuote = (symbol = GOLD) => request(`/market/quote?symbol=${encodeURIComponent(symbol)}`)

export const fetchCandles = (symbol, tf, signal) =>
  request(`/market/candles?symbol=${encodeURIComponent(symbol)}&tf=${tf}`, { signal })

export const fetchOverview = ({ category, ids }, signal) =>
  request(`/market/overview?${ids ? `ids=${ids.map(encodeURIComponent).join(',')}` : `category=${category}`}`, { signal })

export const fetchNews = (lang, signal) => request(`/news?lang=${encodeURIComponent(lang)}`, { signal })

export const submitRegistration = (payload) =>
  request('/registrations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
