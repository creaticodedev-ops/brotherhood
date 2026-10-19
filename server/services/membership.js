export const SQUADS = ['communication', 'design', 'photo', 'events', 'partners']

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const CHALLENGE_KEYS = ['asfi', 'fund', 'responsibility', 'hook', 'caption', 'order', 'opening', 'legend', 'plan', 'logistics', 'matches', 'pitch', 'practical']

const PHOTO_LIMIT = 1_500_000

const signatureOk = (type, buffer) => {
  if (buffer.length < 12) return false
  if (type === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (type === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
}

/** Reads a profile image. Empty returns `{ missing: true }`. A present value must be a real JPEG, PNG, or WebP. */
export const readPhoto = (value) => {
  if (value == null || value === '') return { photo: null, missing: true }
  if (typeof value !== 'string') return { error: 'invalid' }
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/)
  if (!match) return { error: 'invalid' }
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
  if (!buffer.length || buffer.length > PHOTO_LIMIT || !signatureOk(match[1], buffer)) return { error: 'invalid' }
  return { photo: { type: match[1], buffer } }
}

const text = (value, max) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '')
const longText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

const cleanChallenges = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const clean = {}
  for (const key of CHALLENGE_KEYS) {
    const raw = value[key]
    if (typeof raw === 'string') {
      const next = raw.trim().slice(0, 2000)
      if (next) clean[key] = next
    } else if (Array.isArray(raw)) {
      const list = raw
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, 8)
      if (list.length) clean[key] = list
    }
  }
  return clean
}

/**
 * Validates a Brotherhood membership application.
 * Phone parsing stays in the route so this module can be tested without the phone library.
 */
export const validateMembership = (body = {}, phone) => {
  const age = Number(body.age)
  const squads = Array.isArray(body.squads) ? [...new Set(body.squads.map((item) => text(item, 20)).filter(Boolean))] : []
  const data = {
    kind: 'membership',
    status: 'new',
    offer: 'membership',
    duration: 'join',
    amount: 0,
    currency: '',
    firstName: text(body.firstName, 60),
    lastName: text(body.lastName, 60),
    city: text(body.city, 80),
    email: text(body.email, 254).toLowerCase(),
    phone: phone?.phone || '',
    phoneCountry: phone?.phoneCountry || '',
    age: Number.isFinite(age) ? Math.round(age) : NaN,
    gender: body.gender === 'homme' || body.gender === 'femme' ? body.gender : '',
    organization: text(body.organization, 120),
    domain: text(body.domain, 120),
    motivation: longText(body.motivation, 2000),
    contribution: longText(body.contribution, 2000),
    squads,
    challenges: cleanChallenges(body.challenges),
    practical: longText(body.practical, 2000),
    locale: ['fr', 'en', 'ar'].includes(body.locale) ? body.locale : 'fr',
  }
  const photo = readPhoto(body.photo)
  const errors = {}
  if (photo.missing) errors.photo = 'required'
  else if (photo.error) errors.photo = 'invalid'
  if (data.firstName.length < 2) errors.firstName = 'required'
  if (data.lastName.length < 2) errors.lastName = 'required'
  if (data.city.length < 2) errors.city = 'required'
  if (!EMAIL.test(data.email)) errors.email = 'invalid'
  if (!phone) errors.phone = 'invalid'
  if (!Number.isInteger(data.age) || data.age < 13 || data.age > 99) errors.age = 'invalid'
  if (!data.gender) errors.gender = 'required'
  if (data.organization.length < 2) errors.organization = 'required'
  if (data.domain.length < 2) errors.domain = 'required'
  if (data.motivation.length < 20) errors.motivation = 'short'
  if (data.contribution.length < 10) errors.contribution = 'short'
  if (!squads.length || squads.some((id) => !SQUADS.includes(id))) errors.squads = 'invalid'
  const required = ['asfi', 'fund', 'responsibility'].filter((key) => !data.challenges[key] || data.challenges[key].length < 20)
  if (required.length) errors.challenges = required.join(',')
  return { data, errors, photo: photo.photo }
}
