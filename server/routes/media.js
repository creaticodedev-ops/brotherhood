import { Router } from 'express'
import mongoose from 'mongoose'
import { dbState } from '../configs/db.js'
import { StoryImage } from '../models/StoryImage.js'

export const mediaRouter = Router()

/** Public mission and activity photographs. Each address is a fixed upload, so browsers may cache it for good. */
mediaRouter.get('/:id', async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Not found' })
  if (dbState() !== 'connected') return res.status(503).json({ error: 'Database unavailable' })
  try {
    const doc = await StoryImage.findById(req.params.id).select('contentType data').lean()
    if (!doc) return res.status(404).json({ error: 'Not found' })
    const data = Buffer.isBuffer(doc.data) ? doc.data : Buffer.from(doc.data.buffer)
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Cross-Origin-Resource-Policy': 'same-site',
      'X-Content-Type-Options': 'nosniff',
    })
    res.type(doc.contentType).send(data)
  } catch (error) {
    next(error)
  }
})
