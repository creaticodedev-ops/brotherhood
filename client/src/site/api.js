import { CATEGORIES, creativeFrames, queryStories, relatedStories, STORIES } from '../../../shared/catalog.js'

const qs = (params) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const loadStories = async (params = {}) => {
  try {
    const response = await fetch(`/api/stories${qs(params)}`)
    if (!response.ok) throw new Error(String(response.status))
    const data = await response.json()
    return { ...data, source: 'api' }
  } catch {
    const local = queryStories(STORIES, params)
    return { ...local, categories: CATEGORIES, source: 'local' }
  }
}

export const loadStory = async (slug) => {
  try {
    const response = await fetch(`/api/stories/${encodeURIComponent(slug)}`)
    if (response.status === 404) return { item: null, related: [], source: 'api' }
    if (!response.ok) throw new Error(String(response.status))
    const data = await response.json()
    return { ...data, source: 'api' }
  } catch {
    const item = STORIES.find((story) => story.slug === slug && story.published !== false) || null
    return { item, related: item ? relatedStories(STORIES, item) : [], source: 'local' }
  }
}

export const loadCreative = async () => {
  const data = await loadStories({ limit: 60 })
  return { frames: creativeFrames(data.items), source: data.source }
}

export const submitApplication = async (body) => {
  const response = await fetch('/api/registrations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed')
    error.status = response.status
    error.fields = data.fields || {}
    throw error
  }
  return data
}

export { CATEGORIES }
