import { Router } from 'express'
import { getNews, LANGUAGES } from '../services/news.js'

export const newsRouter = Router()

newsRouter.get('/', async (req, res, next) => {
  const lang = String(req.query.lang || 'fr')
  if (!LANGUAGES.includes(lang)) return res.status(400).json({ error: 'Unknown language', languages: LANGUAGES })
  try {
    res.set('Cache-Control', 'no-store').json(await getNews(lang))
  } catch (error) {
    next(error)
  }
})
