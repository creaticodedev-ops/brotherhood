import { Router } from 'express'
import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import { dbState } from '../configs/db.js'
import { Notification, toNotification } from '../models/Notification.js'
import { DURATIONS, OFFER_IDS, Registration, toApplication } from '../models/Registration.js'
import { publish } from '../services/adminEvents.js'

export const registrationsRouter = Router()

const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const COUNTRY = /^[A-Z]{2}$/
const hits = new Map()

/**
 * Validates the number against the numbering plan of its country and returns the complete
 * international number in E.164 ("+212612345678"), or null.
 */
const parsePhone = (value, country) => {
  const compact = typeof value === 'string' ? value.trim().replace(/[\s().\-\u00a0\u202f]/g, '').slice(0, 32) : ''
  const input = compact.startsWith('00') ? `+${compact.slice(2)}` : compact
  if (!input) return null
  const defaultCountry = typeof country === 'string' && COUNTRY.test(country) ? country : undefined
  const parsed = parsePhoneNumberFromString(input, defaultCountry)
  return parsed?.isValid() ? { phone: parsed.number, phoneCountry: parsed.country || defaultCountry || '' } : null
}

const rateLimited = (ip) => {
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > MAX_PER_WINDOW
}

const text = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '')

const validate = (body = {}) => {
  const phone = parsePhone(body.phone, body.phoneCountry)
  const data = {
    offer: text(body.offer, 20),
    firstName: text(body.firstName, 60),
    lastName: text(body.lastName, 60),
    city: text(body.city, 80),
    email: text(body.email, 254).toLowerCase(),
    phone: phone?.phone || '',
    phoneCountry: phone?.phoneCountry || '',
    amount: Number(body.amount),
    duration: text(body.duration, 4),
    locale: ['fr', 'en', 'ar'].includes(body.locale) ? body.locale : 'fr',
  }
  const errors = {}
  if (!OFFER_IDS.includes(data.offer)) errors.offer = 'invalid'
  if (data.firstName.length < 2) errors.firstName = 'required'
  if (data.lastName.length < 2) errors.lastName = 'required'
  if (data.city.length < 2) errors.city = 'required'
  if (!EMAIL.test(data.email)) errors.email = 'invalid'
  if (!phone) errors.phone = 'invalid'
  if (!Number.isFinite(data.amount) || data.amount < 1 || data.amount > 100_000_000) errors.amount = 'invalid'
  if (!DURATIONS.includes(data.duration)) errors.duration = 'invalid'
  return { data, errors }
}

/** Stores the admin notification; a failure here must never fail the visitor's submission. */
const notifyAdmin = async (doc) => {
  try {
    const notification = await Notification.create({
      registration: doc._id,
      name: `${doc.firstName} ${doc.lastName}`,
      amount: doc.amount,
      currency: doc.currency,
      duration: doc.duration,
      offer: doc.offer,
    })
    publish('registration', { notification: toNotification(notification), application: toApplication(doc) })
  } catch (error) {
    console.error('[admin] Notification failed:', error.message)
  }
}

registrationsRouter.post('/', async (req, res, next) => {
  if (rateLimited(req.ip)) return res.status(429).json({ error: 'Too many requests' })
  const { data, errors } = validate(req.body)
  if (Object.keys(errors).length) return res.status(422).json({ error: 'Invalid registration', fields: errors })
  if (dbState() !== 'connected') return res.status(503).json({ error: 'Database unavailable' })
  try {
    const doc = await Registration.create({ ...data, amount: Math.round(data.amount * 100) / 100 })
    res.status(201).json({ id: doc.id, createdAt: doc.createdAt })
    notifyAdmin(doc)
  } catch (error) {
    next(error)
  }
})
