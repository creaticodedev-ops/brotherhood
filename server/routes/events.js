import { Router } from 'express'
import { dbState } from '../configs/db.js'
import { publicProgram } from '../../shared/eventProgram.js'
import { BrotherhoodEvent, toEvent } from '../models/BrotherhoodEvent.js'

export const eventsRouter = Router()

eventsRouter.get('/:slug', async (req, res, next) => {
  if (dbState() !== 'connected') return res.status(503).json({ error: 'Database unavailable' })
  try {
    const doc = await BrotherhoodEvent.findOne({ slug: String(req.params.slug || '').slice(0, 80) }).lean()
    const program = publicProgram(doc ? toEvent(doc) : null)
    if (!program) return res.status(404).json({ error: 'Not found' })
    res.set('Cache-Control', 'no-store').json({ program, serverNow: new Date().toISOString() })
  } catch (error) {
    next(error)
  }
})
