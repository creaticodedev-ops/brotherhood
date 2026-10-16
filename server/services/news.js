import { createHash } from 'node:crypto'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
const REFRESH_MS = 60_000
const TIMEOUT_MS = 8_000
const MAX_ITEMS = 30
const MAX_AGE_MS = 3 * 86_400_000
const SUMMARY_MAX = 220

export const LANGUAGES = ['fr', 'en', 'ar']

const INVESTING_HOST = { fr: 'fr', en: 'www', ar: 'sa' }
const INVESTING_FEEDS = [
  ['news_1', 'forex'],
  ['news_11', 'commodities'],
  ['news_25', 'stocks'],
  ['news_301', 'crypto'],
  ['news_95', 'economy'],
]

const investing = (lang) =>
  INVESTING_FEEDS.map(([path, category]) => ({
    url: `https://${INVESTING_HOST[lang]}.investing.com/rss/${path}.rss`,
    source: 'Investing.com',
    category,
  }))

const FEEDS = {
  fr: investing('fr'),
  en: [
    { url: 'https://www.fxstreet.com/rss/news', source: 'FXStreet', category: 'forex' },
    { url: 'https://investinglive.com/feed/news', source: 'investingLive', category: 'markets' },
    ...investing('en'),
  ],
  ar: investing('ar'),
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

const decode = (text) =>
  text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? match
    const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
    return Number.isFinite(point) && point > 0 && point < 0x110000 ? String.fromCodePoint(point) : match
  })

const clean = (raw = '') =>
  decode(
    decode(raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
    .replace(/\s+/g, ' ')
    .trim()

const field = (block, tag) => block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1] ?? ''

/** Investing.com publishes "YYYY-MM-DD HH:mm:ss" in UTC; other feeds use RFC 822. */
const parseDate = (raw) => {
  const text = clean(raw)
  const ms = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(text) ? Date.parse(`${text.replace(' ', 'T')}Z`) : Date.parse(text)
  return Number.isFinite(ms) ? Math.min(ms, Date.now()) : null
}

const truncate = (text, max) => {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[\s,;:.–-]+$/, '')}…`
}

const parseFeed = (xml, feed) =>
  (xml.match(/<item\b[\s\S]*?<\/item>/gi) || []).flatMap((block) => {
    const title = clean(field(block, 'title'))
    const url = clean(field(block, 'link'))
    const publishedAt = parseDate(field(block, 'pubDate'))
    if (!title || !/^https?:\/\//i.test(url) || !publishedAt) return []
    const summary = clean(field(block, 'description'))
    return [
      {
        id: createHash('sha1').update(url).digest('hex').slice(0, 16),
        title,
        summary: summary && summary !== title ? truncate(summary, SUMMARY_MAX) : '',
        url,
        source: feed.source,
        category: feed.category,
        publishedAt,
      },
    ]
  })

const feedCache = new Map()

const loadFeed = async (feed) => {
  const response = await fetch(feed.url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return parseFeed(await response.text(), feed)
}

/** Refreshes a feed at most once per REFRESH_MS; on failure the last good items are kept. */
const readFeed = (feed) => {
  const entry = feedCache.get(feed.url) || { items: [], fetchedAt: 0, ok: false, pending: null }
  feedCache.set(feed.url, entry)
  if (entry.pending) return entry.pending
  if (Date.now() - entry.fetchedAt < REFRESH_MS) return Promise.resolve(entry)
  entry.pending = loadFeed(feed)
    .then((items) => Object.assign(entry, { items, ok: true }))
    .catch((error) => {
      console.warn('[news]', feed.url, error.message)
      return entry
    })
    .finally(() => {
      entry.fetchedAt = Date.now()
      entry.pending = null
    })
  return entry.pending
}

const titleKey = (title) => title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

export const getNews = async (lang) => {
  const entries = await Promise.all(FEEDS[lang].map(readFeed))
  const cutoff = Date.now() - MAX_AGE_MS
  const seen = new Set()
  const items = entries
    .flatMap((entry) => entry.items)
    .filter((item) => item.publishedAt >= cutoff)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .filter((item) => {
      const key = titleKey(item.title)
      if (seen.has(item.id) || seen.has(key)) return false
      seen.add(item.id).add(key)
      return true
    })
    .slice(0, MAX_ITEMS)
  if (!items.length && !entries.some((entry) => entry.ok)) {
    throw Object.assign(new Error('All news feeds failed'), { status: 502, expose: 'News unavailable' })
  }
  return { items, updatedAt: Date.now() }
}
