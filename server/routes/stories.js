import { Router } from 'express'
import { CATEGORIES } from '../../shared/catalog.js'
import { dbState } from '../configs/db.js'
import { Story, toStory } from '../models/Story.js'

export const storiesRouter = Router()

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const param = (value) => (typeof value === 'string' ? value : '')

storiesRouter.get('/', async (req, res, next) => {
  if (dbState() !== 'connected') return res.status(503).json({ error: 'Database unavailable' })
  try {
    const kind = param(req.query.kind)
    const filter = { published: true }
    if (kind === 'mission' || kind === 'activity') filter.kind = kind
    if (param(req.query.category)) filter.category = param(req.query.category).slice(0, 40)
    if (param(req.query.year)) filter.year = param(req.query.year).slice(0, 8)
    if (param(req.query.featured) === '1') filter.featured = true
    const q = param(req.query.q).trim().slice(0, 80)
    if (q) {
      const pattern = new RegExp(escapeRegex(q), 'i')
      filter.$or = [{ title: pattern }, { summary: pattern }, { location: pattern }, { body: pattern }]
    }
    const limit = Math.min(60, Math.max(1, Number.parseInt(param(req.query.limit), 10) || 60))
    const page = Math.max(1, Number.parseInt(param(req.query.page), 10) || 1)
    const total = await Story.countDocuments(filter)
    const pages = Math.max(1, Math.ceil(total / limit))
    const docs = await Story.find(filter)
      .sort({ sort: 1, title: 1 })
      .skip((Math.min(page, pages) - 1) * limit)
      .limit(limit)
      .lean()
    res.json({ items: docs.map(toStory), total, page: Math.min(page, pages), pages, categories: CATEGORIES })
  } catch (error) {
    next(error)
  }
})

storiesRouter.get('/:slug', async (req, res, next) => {
  if (dbState() !== 'connected') return res.status(503).json({ error: 'Database unavailable' })
  try {
    const slug = param(req.params.slug).slice(0, 80)
    const doc = await Story.findOne({ slug, published: true }).lean()
    if (!doc) return res.status(404).json({ error: 'Not found' })
    const relatedDocs = await Story.find({ published: true, kind: doc.kind, slug: { $ne: doc.slug } })
      .sort({ sort: 1 })
      .limit(12)
      .lean()
    const related = relatedDocs
      .sort((a, b) => Number(b.category === doc.category) - Number(a.category === doc.category))
      .slice(0, 3)
      .map(toStory)
    res.json({ item: toStory(doc), related })
  } catch (error) {
    next(error)
  }
})
