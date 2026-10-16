const DAY = 86400

const closeAtOrBefore = (daily, seconds) => {
  for (let i = daily.length - 1; i >= 0; i -= 1) if (daily[i].time <= seconds) return daily[i].close
  return null
}

const pct = (price, reference) => (Number.isFinite(price) && reference ? ((price - reference) / reference) * 100 : null)

/**
 * Market statistics derived only from real daily candles and the live price.
 * `days` = trading days per year used to annualise volatility (365 for crypto).
 */
export const computeStats = (daily, price, days = 252) => {
  if (!daily?.length || !Number.isFinite(price)) return null
  const now = daily[daily.length - 1].time
  const yearStart = Date.UTC(new Date(now * 1000).getUTCFullYear(), 0, 1) / 1000

  const performance = {
    w1: pct(price, closeAtOrBefore(daily, now - 7 * DAY)),
    m1: pct(price, closeAtOrBefore(daily, now - 30 * DAY)),
    m3: pct(price, closeAtOrBefore(daily, now - 91 * DAY)),
    ytd: pct(price, closeAtOrBefore(daily, yearStart - 1)),
    y1: pct(price, closeAtOrBefore(daily, now - 365 * DAY)),
  }

  const closes = daily.slice(-31).map((d) => d.close)
  const returns = closes.slice(1).map((c, i) => Math.log(c / closes[i]))
  const mean = returns.reduce((a, b) => a + b, 0) / (returns.length || 1)
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(returns.length - 1, 1)
  const volatility = returns.length > 5 ? Math.sqrt(variance) * Math.sqrt(days) * 100 : null

  const recent = daily.slice(-15)
  const trueRanges = recent.slice(1).map((d, i) => {
    const prevClose = recent[i].close
    return Math.max(d.high - d.low, Math.abs(d.high - prevClose), Math.abs(d.low - prevClose))
  })
  const atr = trueRanges.length ? trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length : null

  const year = daily.filter((d) => d.time > now - 365 * DAY)
  const high52 = Math.max(price, ...year.map((d) => d.high))
  const low52 = Math.min(price, ...year.map((d) => d.low))

  return { performance, volatility, atr, high52, low52 }
}

/** Position (0 → 1) of `value` inside [low, high]. */
export const rangePosition = (value, low, high) =>
  Number.isFinite(value) && high > low ? Math.min(1, Math.max(0, (value - low) / (high - low))) : null
