import { Router } from 'express'
import mongoose from 'mongoose'
import { CATEGORIES } from '../../shared/catalog.js'
import { Story, toStory } from '../models/Story.js'

export const storiesAdminRouter = Router()

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MEDIA = /^\/media\/[a-z0-9-]+\.(jpg|png|webp)$/
const text = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '')

const readStory = (body = {}) => {
  const kind = body.kind === 'activity' ? 'activity' : body.kind === 'mission' ? 'mission' : ''
  const images = Array.isArray(body.images)
    ? body.images
        .slice(0, 24)
        .map((image) => ({
          src: text(image?.src, 240),
          alt: text(image?.alt, 240),
          caption: text(image?.caption, 400),
        }))
        .filter((image) => MEDIA.test(image.src))
    : []
  const data = {
    kind,
    slug: text(body.slug, 80).toLowerCase(),
    title: text(body.title, 140),
    summary: text(body.summary, 500),
    body: Array.isArray(body.body)
      ? body.body.map((part) => (typeof part === 'string' ? part.trim().slice(0, 2000) : '')).filter(Boolean).slice(0, 12)
      : text(body.body, 8000)
          .split(/\n{2,}/)
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 12),
    category: text(body.category, 40),
    location: text(body.location, 120),
    year: text(body.year, 8),
    featured: Boolean(body.featured),
    published: Boolean(body.published),
    sort: Number.isFinite(Number(body.sort)) ? Math.max(0, Math.min(9999, Math.round(Number(body.sort)))) : 0,
    cover: text(body.cover, 240),
    images,
  }
  const errors = {}
  if (!data.kind) errors.kind = 'invalid'
  if (!SLUG.test(data.slug)) errors.slug = 'invalid'
  if (data.title.length < 2) errors.title = 'required'
  if (data.category && !CATEGORIES[data.kind]?.some((item) => item.id === data.category)) errors.category = 'invalid'
  if (data.year && !/^\d{4}$/.test(data.year)) errors.year = 'invalid'
  if (data.cover && !MEDIA.test(data.cover)) errors.cover = 'invalid'
  if (!data.cover && images[0]) data.cover = images[0].src
  return { data, errors }
}

storiesAdminRouter.get('/', async (_req, res, next) => {
  try {
    const docs = await Story.find().sort({ sort: 1, title: 1 }).lean()
    res.json({ items: docs.map(toStory), categories: CATEGORIES })
  } catch (error) {
    next(error)
  }
})

storiesAdminRouter.post('/', async (req, res, next) => {
  try {
    const { data, errors } = readStory(req.body)
    if (Object.keys(errors).length) return res.status(422).json({ error: 'Invalid story', fields: errors })
    if (await Story.exists({ slug: data.slug })) return res.status(409).json({ error: 'Slug already used', fields: { slug: 'taken' } })
    const doc = await Story.create(data)
    res.status(201).json({ item: toStory(doc) })
  } catch (error) {
    next(error)
  }
})

storiesAdminRouter.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Story not found' })
    const { data, errors } = readStory(req.body)
    if (Object.keys(errors).length) return res.status(422).json({ error: 'Invalid story', fields: errors })
    const clash = await Story.exists({ slug: data.slug, _id: { $ne: req.params.id } })
    if (clash) return res.status(409).json({ error: 'Slug already used', fields: { slug: 'taken' } })
    const doc = await Story.findByIdAndUpdate(req.params.id, data, { new: true }).lean()
    if (!doc) return res.status(404).json({ error: 'Story not found' })
    res.json({ item: toStory(doc) })
  } catch (error) {
    next(error)
  }
})

storiesAdminRouter.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Story not found' })
    const doc = await Story.findByIdAndDelete(req.params.id).lean()
    if (!doc) return res.status(404).json({ error: 'Story not found' })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})
