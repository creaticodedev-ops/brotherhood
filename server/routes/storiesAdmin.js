import express, { Router } from 'express'
import mongoose from 'mongoose'
import { CATEGORIES } from '../../shared/catalog.js'
import { recordAudit } from '../models/AuditEvent.js'
import { Story, toStory } from '../models/Story.js'
import { STORY_IMAGE_LIMIT, STORY_IMAGE_TYPES } from '../models/StoryImage.js'
import { can, currentActor } from '../services/adminAuth.js'
import { isStoryImageSrc, markAttached, missingUploads, purgeAbandonedUploads, releaseUploads, storeStoryImage, uploadIdsOf } from '../services/storyMedia.js'

export const storiesAdminRouter = Router()

storiesAdminRouter.use(async (req, res, next) => {
  try {
    const actor = await currentActor(req)
    if (!actor) return res.status(401).json({ error: 'Unauthorized' })
    if (!can(actor, 'content.manage')) return res.status(403).json({ error: 'Forbidden' })
    req.actor = actor
    next()
  } catch (error) {
    next(error)
  }
})

const KINDS = ['mission', 'activity']
const MAX_IMAGES = 24
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const text = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '')

const readStory = (body = {}) => {
  const kind = KINDS.includes(body.kind) ? body.kind : ''
  const errors = {}
  const rawImages = Array.isArray(body.images) ? body.images : []
  if (rawImages.length > MAX_IMAGES) errors.images = 'too_many'
  const images = rawImages.slice(0, MAX_IMAGES).map((image) => ({
    src: text(image?.src, 240),
    alt: text(image?.alt, 240),
    caption: text(image?.caption, 400),
  }))
  if (images.some((image) => !isStoryImageSrc(image.src))) errors.images = 'invalid'
  if (new Set(images.map((image) => image.src)).size !== images.length) errors.images = 'duplicate'
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
    sort: Number.isFinite(Number(body.sort)) ? Math.max(0, Math.min(99999, Math.round(Number(body.sort)))) : null,
    cover: text(body.cover, 240),
    images,
  }
  if (!data.kind) errors.kind = 'invalid'
  if (!SLUG.test(data.slug)) errors.slug = 'invalid'
  if (data.title.length < 2) errors.title = 'required'
  if (data.category && !CATEGORIES[data.kind]?.some((item) => item.id === data.category)) errors.category = 'invalid'
  if (data.year && !/^\d{4}$/.test(data.year)) errors.year = 'invalid'
  if (data.cover && !isStoryImageSrc(data.cover)) errors.cover = 'invalid'
  // The first image is the cover everywhere on the public site.
  if (images[0]) data.cover = images[0].src
  return { data, errors }
}

const checkUploads = async (data) => {
  const missing = await missingUploads(uploadIdsOf(data))
  return missing.length ? { images: 'missing' } : null
}

storiesAdminRouter.get('/', async (_req, res, next) => {
  try {
    const docs = await Story.find().sort({ sort: 1, title: 1 }).lean()
    res.json({ items: docs.map(toStory), categories: CATEGORIES, limits: { images: MAX_IMAGES, bytes: STORY_IMAGE_LIMIT, types: STORY_IMAGE_TYPES } })
  } catch (error) {
    next(error)
  }
})

/** Receives one image as the raw request body (Content-Type image/jpeg, image/png or image/webp). */
storiesAdminRouter.post(
  '/media',
  express.raw({ type: STORY_IMAGE_TYPES, limit: STORY_IMAGE_LIMIT + 1024 }),
  async (req, res, next) => {
    try {
      const type = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
      if (!STORY_IMAGE_TYPES.includes(type)) return res.status(415).json({ error: 'type' })
      if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(422).json({ error: 'empty' })
      const saved = await storeStoryImage(type, req.body, req.actor)
      if (!saved) return res.status(422).json({ error: 'invalid' })
      purgeAbandonedUploads().catch((error) => console.error('[media] Cleanup skipped:', error.message))
      res.status(201).json(saved)
    } catch (error) {
      next(error)
    }
  },
  (error, _req, res, next) => (error?.type === 'entity.too.large' ? res.status(413).json({ error: 'size' }) : next(error)),
)

/** Saves the public order of one kind. The list must name every story of that kind exactly once. */
storiesAdminRouter.put('/order', async (req, res, next) => {
  try {
    const kind = KINDS.includes(req.body?.kind) ? req.body.kind : ''
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []
    if (!kind || !ids.length || new Set(ids).size !== ids.length || !ids.every((id) => mongoose.isValidObjectId(id))) {
      return res.status(422).json({ error: 'Invalid order' })
    }
    const current = await Story.find({ kind }).select('_id').lean()
    const known = new Set(current.map((doc) => String(doc._id)))
    if (current.length !== ids.length || !ids.every((id) => known.has(id))) return res.status(409).json({ error: 'Order is out of date' })
    await Story.bulkWrite(ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { sort: (index + 1) * 10 } } } })))
    await recordAudit(req.actor, 'story.order', 'story', kind, `${ids.length} ${kind}`)
    const docs = await Story.find().sort({ sort: 1, title: 1 }).lean()
    res.json({ items: docs.map(toStory) })
  } catch (error) {
    next(error)
  }
})

storiesAdminRouter.post('/', async (req, res, next) => {
  try {
    const { data, errors } = readStory(req.body)
    Object.assign(errors, (await checkUploads(data)) || {})
    if (Object.keys(errors).length) return res.status(422).json({ error: 'Invalid story', fields: errors })
    if (await Story.exists({ slug: data.slug })) return res.status(409).json({ error: 'Slug already used', fields: { slug: 'taken' } })
    if (data.sort === null) {
      const last = await Story.findOne({ kind: data.kind }).sort({ sort: -1 }).select('sort').lean()
      data.sort = (last?.sort || 0) + 10
    }
    const doc = await Story.create(data)
    await markAttached(uploadIdsOf(data))
    await recordAudit(req.actor, 'story.create', 'story', doc._id, data.title)
    res.status(201).json({ item: toStory(doc) })
  } catch (error) {
    next(error)
  }
})

storiesAdminRouter.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Story not found' })
    const before = await Story.findById(req.params.id).lean()
    if (!before) return res.status(404).json({ error: 'Story not found' })
    const { data, errors } = readStory(req.body)
    Object.assign(errors, (await checkUploads(data)) || {})
    if (Object.keys(errors).length) return res.status(422).json({ error: 'Invalid story', fields: errors })
    const clash = await Story.exists({ slug: data.slug, _id: { $ne: req.params.id } })
    if (clash) return res.status(409).json({ error: 'Slug already used', fields: { slug: 'taken' } })
    if (data.sort === null) data.sort = before.sort || 0
    const doc = await Story.findByIdAndUpdate(req.params.id, data, { new: true }).lean()
    if (!doc) return res.status(404).json({ error: 'Story not found' })
    const kept = uploadIdsOf(doc)
    await markAttached(kept)
    const dropped = uploadIdsOf(before).filter((id) => !kept.includes(id))
    if (dropped.length) await releaseUploads(dropped, doc._id)
    await recordAudit(req.actor, 'story.update', 'story', doc._id, doc.title)
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
    await releaseUploads(uploadIdsOf(doc), doc._id)
    await recordAudit(req.actor, 'story.delete', 'story', doc._id, doc.title)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})
