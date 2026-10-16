import { useEffect, useMemo, useState } from 'react'
import { categoryLabel, storyPath } from '../../../shared/catalog.js'
import { useReveal } from '../landing/hooks'
import { ArrowIcon } from '../landing/ui'
import { loadCreative, loadStories, loadStory } from './api'
import { A, Lightbox, SocialRow, useCopy, usePageMeta } from './ui'

const useQuery = () => {
  const read = () => Object.fromEntries(new URLSearchParams(window.location.search))
  const [query, setQuery] = useState(read)
  useEffect(() => {
    const onPop = () => setQuery(read())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  return query
}

export const About = () => {
  const { pack } = useCopy()
  usePageMeta(`${pack.about.title} — The Brotherhood`, pack.about.lead, '/about')
  useReveal(pack.about.title)
  return (
    <article>
      <header className="page-hero">
        <img src="/media/circle-clap.jpg" alt="" />
        <div className="container page-hero-copy">
          <p className="kicker">{pack.about.kicker}</p>
          <h1 className="page-title">{pack.about.title}</h1>
          <p className="lead">{pack.about.lead}</p>
        </div>
      </header>
      <section className="section is-light">
        <div className="container about-grid">
          <figure className="about-still" data-reveal>
            <img src="/media/clinic-group.jpg" alt={pack.about.title} />
          </figure>
          <div>
            {pack.about.blocks.map((block, index) => (
              <article className="approach-item" key={block.title} data-reveal style={{ '--d': index % 3 }}>
                <h2>{block.title}</h2>
                <p>{block.text}</p>
              </article>
            ))}
            <div className="hero-actions" data-reveal>
              <A className="btn btn-primary" href="/missions">
                <span>{pack.home.primary}</span>
                <ArrowIcon />
              </A>
              <A className="btn btn-ghost" href="/join">
                {pack.home.join}
              </A>
            </div>
          </div>
        </div>
      </section>
    </article>
  )
}

export const Archive = ({ kind }) => {
  const { pack, locale } = useCopy()
  const query = useQuery()
  const copy = kind === 'mission' ? { kicker: pack.archive.missionsKicker, title: pack.archive.missionsTitle, lead: pack.archive.missionsLead } : { kicker: pack.archive.activitiesKicker, title: pack.archive.activitiesTitle, lead: pack.archive.activitiesLead }
  const [state, setState] = useState({ items: [], categories: null, error: false, ready: false })
  const [q, setQ] = useState(query.q || '')
  usePageMeta(`${copy.title} — The Brotherhood`, copy.lead, kind === 'mission' ? '/missions' : '/activities')
  useReveal(`${kind}:${state.items.length}:${query.category || ''}:${query.q || ''}`)

  useEffect(() => {
    setQ(query.q || '')
  }, [query.q])

  useEffect(() => {
    let live = true
    setState((prev) => ({ ...prev, ready: false, error: false }))
    loadStories({ kind, q: query.q || '', category: query.category || '', year: query.year || '', limit: 60 })
      .then((data) => live && setState({ items: data.items, categories: data.categories, error: false, ready: true }))
      .catch(() => live && setState((prev) => ({ ...prev, error: true, ready: true })))
    return () => {
      live = false
    }
  }, [kind, query.q, query.category, query.year])

  const years = useMemo(() => [...new Set(state.items.map((item) => item.year).filter(Boolean))], [state.items])
  const categories = state.categories?.[kind] || []
  const write = (patch) => {
    const next = new URLSearchParams()
    const merged = { q: query.q || '', category: query.category || '', year: query.year || '', ...patch }
    Object.entries(merged).forEach(([key, value]) => value && next.set(key, value))
    const href = `${kind === 'mission' ? '/missions' : '/activities'}${next.toString() ? `?${next}` : ''}`
    window.history.pushState(null, '', href)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const label = state.items.length > 1 ? pack.archive.countPlural : pack.archive.count

  return (
    <article className="section page-pad">
      <div className="container">
      <p className="kicker">{copy.kicker}</p>
      <h1 className="page-title">{copy.title}</h1>
      <p className="lead">{copy.lead}</p>
      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault()
          write({ q })
        }}
      >
        <input aria-label={pack.archive.searchLabel} placeholder={pack.archive.search} value={q} onChange={(event) => setQ(event.target.value)} />
        <button className="chip" type="submit" aria-pressed="false">
          {pack.archive.search}
        </button>
        <button className="chip" type="button" aria-pressed={!query.category} onClick={() => write({ category: '', q })}>
          {pack.archive.all}
        </button>
        {categories.map((item) => (
          <button key={item.id} className="chip" type="button" aria-pressed={query.category === item.id} onClick={() => write({ category: query.category === item.id ? '' : item.id, q })}>
            {item[locale] || item.fr}
          </button>
        ))}
        {years.length ? (
          <select aria-label={pack.archive.year} value={query.year || ''} onChange={(event) => write({ year: event.target.value, q })}>
            <option value="">{pack.archive.allYears}</option>
            {years.map((year) => (
              <option key={year}>{year}</option>
            ))}
          </select>
        ) : null}
        <span className="filter-count">{label.replace('{{n}}', String(state.items.length))}</span>
      </form>
      {!state.ready ? <p className="fine-print">{pack.archive.loading}</p> : null}
      {state.ready && state.error ? <p className="fine-print">{pack.archive.error}</p> : null}
      {state.ready && !state.error && !state.items.length ? <p className="fine-print">{pack.archive.empty}</p> : null}
      <div className="mosaic">
        {state.items.map((story, index) => (
          <A className="shot is-archive" key={story.slug} href={storyPath(story)} data-reveal style={{ '--d': index % 4 }}>
            <figure>
              <img src={story.cover} alt={story.images?.[0]?.alt || story.title} />
              <figcaption>
                <small>{categoryLabel(story.kind, story.category, locale)}</small>
                <strong>{story.title}</strong>
              </figcaption>
            </figure>
          </A>
        ))}
      </div>
      </div>
    </article>
  )
}

export const StoryPage = ({ slug }) => {
  const { pack, locale } = useCopy()
  const [data, setData] = useState(null)
  const [light, setLight] = useState(-1)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let live = true
    setData(null)
    loadStory(slug).then((next) => live && setData(next))
    return () => {
      live = false
    }
  }, [slug])

  const story = data?.item
  usePageMeta(
    story ? `${story.title} — The Brotherhood` : data ? pack.story.missing : pack.meta.title,
    story?.summary || pack.meta.description,
    story ? storyPath(story) : '/',
  )

  useReveal(story?.slug || slug)

  if (!data) return <article className="section page-pad" aria-busy="true" />
  if (!story) {
    return (
      <article className="section page-pad">
        <div className="container">
          <h1 className="page-title">{pack.story.missing}</h1>
          <A className="btn btn-primary" href="/missions">
            {pack.story.backMissions}
          </A>
        </div>
      </article>
    )
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.href : storyPath(story)
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <article>
      <header className="page-hero is-story">
        <img src={story.cover} alt={story.images?.[0]?.alt || story.title} />
        <div className="container page-hero-copy">
          <p className="kicker">{story.kind === 'mission' ? pack.story.mission : pack.story.activity}</p>
          <h1 className="page-title">{story.title}</h1>
          <p className="story-meta">
            {categoryLabel(story.kind, story.category, locale) ? <span>{categoryLabel(story.kind, story.category, locale)}</span> : null}
            {story.location ? <span>{story.location}</span> : null}
            {story.year ? <span>{story.year}</span> : null}
          </p>
          <p className="lead">{story.summary}</p>
          <A className="btn btn-ghost btn-sm" href={story.kind === 'mission' ? '/missions' : '/activities'}>
            {story.kind === 'mission' ? pack.story.backMissions : pack.story.backActivities}
          </A>
        </div>
      </header>
      <section className="section is-light">
        <div className="container prose" data-reveal>
          {story.body.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="container">
          <h2 className="h2" data-reveal>
            {pack.story.gallery}
          </h2>
          <div className="gallery">
            {story.images.map((image, index) => (
              <button key={image.src} type="button" className={index === 0 ? 'is-lead' : ''} onClick={() => setLight(index)} aria-label={image.alt || pack.story.open} data-reveal style={{ '--d': index % 4 }}>
                <img src={image.src} alt={image.alt || ''} />
              </button>
            ))}
          </div>
          <div className="prose">
            {story.images.filter((image) => image.caption).map((image) => (
              <p key={`${image.src}-cap`}>
                <strong>{image.alt}. </strong>
                {image.caption}
              </p>
            ))}
          </div>
          <div className="share">
            <span>{pack.story.share}</span>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`${story.title} ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
            <button type="button" onClick={copyLink}>
              {copied ? pack.story.copied : pack.story.copy}
            </button>
          </div>
          {data.related?.length ? (
            <>
              <h2 className="h2" style={{ marginTop: 72 }} data-reveal>
                {pack.story.related}
              </h2>
              <div className="trio">
                {data.related.map((item) => (
                  <A className="shot is-portrait" key={item.slug} href={storyPath(item)} data-reveal>
                    <figure>
                      <img src={item.cover} alt="" />
                      <figcaption>
                        <strong>{item.title}</strong>
                      </figcaption>
                    </figure>
                  </A>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </section>
      {light >= 0 ? <Lightbox images={story.images} index={light} onClose={() => setLight(-1)} onIndex={setLight} labels={pack.story} /> : null}
    </article>
  )
}

export const Creative = () => {
  const { pack } = useCopy()
  const [frames, setFrames] = useState([])
  const [light, setLight] = useState(-1)
  usePageMeta(`${pack.creative.title} — The Brotherhood`, pack.creative.lead, '/creative')
  useReveal(frames.length)
  useEffect(() => {
    let live = true
    loadCreative().then((data) => live && setFrames(data.frames))
    return () => {
      live = false
    }
  }, [])
  return (
    <article className="section page-pad">
      <div className="container">
        <p className="kicker">{pack.creative.kicker}</p>
        <h1 className="page-title">{pack.creative.title}</h1>
        <p className="lead">{pack.creative.lead}</p>
        {!frames.length ? <p className="fine-print">{pack.creative.empty}</p> : null}
        <div className="film is-gallery">
          {frames.map((frame, index) => (
            <button key={`${frame.src}-${index}`} type="button" className={`film-frame${frame.wide ? ' is-wide' : ''}`} onClick={() => setLight(index)} aria-label={frame.alt || pack.story.open} data-reveal style={{ '--d': index % 5 }}>
              <img src={frame.src} alt={frame.alt || ''} />
              <span>{frame.title}</span>
            </button>
          ))}
        </div>
      </div>
      {light >= 0 ? <Lightbox images={frames} index={light} onClose={() => setLight(-1)} onIndex={setLight} labels={pack.story} /> : null}
    </article>
  )
}

export const SocialPage = () => {
  const { pack } = useCopy()
  usePageMeta(`${pack.social.title} — The Brotherhood`, pack.social.lead, '/social')
  return (
    <article className="section page-pad">
      <div className="container">
        <p className="kicker">{pack.social.kicker}</p>
        <h1 className="page-title">{pack.social.title}</h1>
        <p className="lead">{pack.social.lead}</p>
        <div style={{ marginTop: 40 }}>
          <SocialRow pack={pack.social} />
        </div>
      </div>
    </article>
  )
}

export const Privacy = () => {
  const { pack } = useCopy()
  usePageMeta(`${pack.privacy.title} — The Brotherhood`, pack.privacy.paragraphs[0], '/privacy')
  return (
    <article className="section page-pad is-light">
      <div className="container prose">
        <p className="kicker">{pack.privacy.kicker}</p>
        <h1 className="page-title">{pack.privacy.title}</h1>
        {pack.privacy.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 20)}>{paragraph}</p>
        ))}
      </div>
    </article>
  )
}

export const NotFound = () => {
  const { pack } = useCopy()
  usePageMeta(pack.notFound.title, pack.meta.description, '/')
  return (
    <article className="section page-pad">
      <div className="container">
        <h1 className="page-title">{pack.notFound.title}</h1>
        <A className="btn btn-primary" href="/">
          {pack.notFound.back}
        </A>
      </div>
    </article>
  )
}

