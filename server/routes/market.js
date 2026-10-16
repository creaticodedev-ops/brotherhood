import { Router } from 'express'
import { CATEGORIES, DEFAULT_INSTRUMENT, getInstrument, INSTRUMENTS, publicInstrument } from '../services/instruments.js'
import { getCandles, getOverview, getQuote, TIMEFRAMES, unknownInstrument } from '../services/market.js'

export const marketRouter = Router()

const MAX_OVERVIEW = 16

const upstreamError = (error) =>
  error.status && error.status < 500 ? error : Object.assign(error, { status: 502, expose: 'Market data unavailable' })

marketRouter.get('/instruments', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300').json({
    default: DEFAULT_INSTRUMENT,
    categories: CATEGORIES,
    instruments: INSTRUMENTS.map(publicInstrument),
  })
})

marketRouter.get('/quote', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store').json(await getQuote(req.query.symbol || DEFAULT_INSTRUMENT))
  } catch (error) {
    next(upstreamError(error))
  }
})

marketRouter.get('/candles', async (req, res, next) => {
  const tf = String(req.query.tf || '1h')
  if (!TIMEFRAMES[tf]) return res.status(400).json({ error: 'Unknown timeframe', timeframes: Object.keys(TIMEFRAMES) })
  try {
    res.set('Cache-Control', 'no-store').json(await getCandles(req.query.symbol || DEFAULT_INSTRUMENT, tf))
  } catch (error) {
    next(upstreamError(error))
  }
})

marketRouter.get('/overview', async (req, res, next) => {
  const category = String(req.query.category || '')
  const ids = String(req.query.ids || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
  let list
  if (ids.length) {
    list = ids.slice(0, MAX_OVERVIEW).map(getInstrument)
    if (list.some((item) => !item)) return next(unknownInstrument())
  } else if (CATEGORIES.includes(category)) {
    list = INSTRUMENTS.filter((item) => item.category === category)
  } else {
    return res.status(400).json({ error: 'Provide a category or ids', categories: CATEGORIES })
  }
  try {
    res.set('Cache-Control', 'no-store').json({ items: await getOverview(list) })
  } catch (error) {
    next(upstreamError(error))
  }
})
