export const SQUADS = ['communication', 'design', 'photo', 'events', 'partners']

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const CHALLENGE_KEYS = ['hook', 'caption', 'order', 'opening', 'legend', 'plan', 'logistics', 'matches', 'pitch', 'practical']

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
    organization: text(body.organization, 120),
    domain: text(body.domain, 120),
    motivation: longText(body.motivation, 2000),
    contribution: longText(body.contribution, 2000),
    squads,
    challenges: cleanChallenges(body.challenges),
    practical: longText(body.practical, 2000),
    locale: ['fr', 'en', 'ar'].includes(body.locale) ? body.locale : 'fr',
  }
  const errors = {}
  if (data.firstName.length < 2) errors.firstName = 'required'
  if (data.lastName.length < 2) errors.lastName = 'required'
  if (data.city.length < 2) errors.city = 'required'
  if (!EMAIL.test(data.email)) errors.email = 'invalid'
  if (!phone) errors.phone = 'invalid'
  if (!Number.isInteger(data.age) || data.age < 13 || data.age > 99) errors.age = 'invalid'
  if (data.organization.length < 2) errors.organization = 'required'
  if (data.domain.length < 2) errors.domain = 'required'
  if (data.motivation.length < 20) errors.motivation = 'short'
  if (data.contribution.length < 10) errors.contribution = 'short'
  if (!squads.length || squads.some((id) => !SQUADS.includes(id))) errors.squads = 'invalid'
  const required = []
  if (squads.includes('communication') && !data.challenges.hook) required.push('hook')
  if (squads.includes('design') && !Array.isArray(data.challenges.order)) required.push('order')
  if (squads.includes('photo') && !data.challenges.legend) required.push('legend')
  if (squads.includes('events') && !data.challenges.plan) required.push('plan')
  if (squads.includes('partners') && !data.challenges.pitch) required.push('pitch')
  if (required.length) errors.challenges = required.join(',')
  return { data, errors }
}
