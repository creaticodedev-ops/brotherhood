import { useEffect, useMemo, useState } from 'react'
import { resolveChapters } from '../../../shared/catalog.js'
import { prefersReducedMotion, useReveal } from '../landing/hooks'
import { ArrowIcon } from '../landing/ui'
import { loadStories } from './api'
import { A, Lightbox, useCopy } from './ui'

const Frame = ({ frame, index, onOpen, label, mixed = false, parallax = false }) => (
  <button
    type="button"
    className="still"
    data-reveal
    style={{ '--d': index }}
    onClick={onOpen}
    aria-label={frame.alt || label}
  >
    <span className="still-media" data-parallax={parallax ? '' : undefined}>
      <img src={frame.src} alt={frame.alt || ''} />
    </span>
    <span className="still-cap">
      {mixed ? <small>{frame.title}</small> : null}
      {frame.caption || frame.alt}
    </span>
  </button>
)

export const Gallery = () => {
  const { pack } = useCopy()
  const [stories, setStories] = useState([])
  const [ready, setReady] = useState(false)
  const [focus, setFocus] = useState('all')
  const [light, setLight] = useState(null)
  const [reel, setReel] = useState([])
  const chapters = useMemo(() => resolveChapters(stories), [stories])
  const flat = useMemo(() => chapters.flatMap((chapter) => chapter.frames), [chapters])
  useReveal(`${chapters.length}:${focus}`)

  useEffect(() => {
    let live = true
    loadStories({ limit: 60 }).then((data) => {
      if (!live) return
      setStories(data.items)
      setReady(true)
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    const nodes = [...document.querySelectorAll('[data-parallax]')]
    if (!nodes.length) return undefined
    let frame = 0
    const update = () => {
      frame = 0
      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect()
        const shift = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight
        node.style.setProperty('--shift', String(Math.max(-1, Math.min(1, shift))))
      })
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [chapters.length, focus])

  useEffect(() => {
    const id = window.location.hash.replace('#', '')
    if (!id || !chapters.some((chapter) => chapter.id === id)) return
    setFocus(id)
    const node = document.getElementById(`chapter-${id}`)
    if (node) node.scrollIntoView({ block: 'start' })
  }, [chapters])

  const open = (frame) => {
    const source = focus === 'all' ? flat : chapters.find((chapter) => chapter.id === focus)?.frames || flat
    const index = source.findIndex((item) => item.src === frame.src)
    setReel(source)
    setLight(index < 0 ? 0 : index)
  }

  const choose = (id) => {
    setFocus(id)
    const node = document.getElementById(id === 'all' ? 'reel' : `chapter-${id}`)
    node?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
    const next = id === 'all' ? '/creative' : `/creative#${id}`
    window.history.replaceState(null, '', next)
  }

  return (
    <div className="reel" id="reel">
      <div className="reel-bar">
        <div className="container reel-bar-inner">
          <span>{pack.creative.index}</span>
          <div role="tablist" aria-label={pack.creative.index}>
            <button type="button" role="tab" aria-selected={focus === 'all'} onClick={() => choose('all')}>
              {pack.creative.all}
            </button>
            {chapters.map((chapter, index) => (
              <button key={chapter.id} type="button" role="tab" aria-selected={focus === chapter.id} onClick={() => choose(chapter.id)}>
                <i>{String(index + 1).padStart(2, '0')}</i>
                {pack.creative.labels?.[chapter.id] || chapter.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!ready ? <p className="container fine-print">{pack.creative.loading}</p> : null}
      {ready && !chapters.length ? <p className="container fine-print">{pack.creative.empty}</p> : null}

      {chapters.map((chapter, index) => {
        const title = pack.creative.labels?.[chapter.id] || chapter.title
        const note = pack.creative.notes?.[chapter.id]
        const mixed = new Set(chapter.frames.map((frame) => frame.slug)).size > 1
        const frameProps = (frame, frameIndex) => (
          <Frame
            key={frame.src}
            frame={frame}
            index={frameIndex}
            label={pack.story.open}
            mixed={mixed}
            parallax={frameIndex === 0}
            onOpen={() => open(frame)}
          />
        )
        return (
          <section
            key={chapter.id}
            id={`chapter-${chapter.id}`}
            className={`chapter is-${chapter.layout}${focus === 'all' || focus === chapter.id ? ' is-on' : ''}`}
            aria-hidden={focus !== 'all' && focus !== chapter.id}
            inert={focus !== 'all' && focus !== chapter.id}
          >
            <div className="chapter-body">
              <div className="container chapter-head" data-reveal>
                <p className="chapter-index">{String(index + 1).padStart(2, '0')}</p>
                <div>
                  <h2 className="h2">{title}</h2>
                  <p className="lead">{note || chapter.summary}</p>
                  {mixed ? null : (
                    <A className="btn btn-ghost btn-sm" href={chapter.href}>
                      <span>{pack.creative.read}</span>
                      <ArrowIcon />
                    </A>
                  )}
                </div>
              </div>
              {chapter.layout === 'split' ? (
                <div className="chapter-stage is-split">
                  <div className="split-hero">
                    {chapter.frames.slice(0, 2).map((frame, frameIndex) => frameProps(frame, frameIndex))}
                  </div>
                  <div className="split-row">
                    {chapter.frames.slice(2).map((frame, frameIndex) => frameProps(frame, frameIndex + 2))}
                  </div>
                </div>
              ) : (
                <div className={`chapter-stage is-${chapter.layout}`}>
                  {chapter.frames.map((frame, frameIndex) => frameProps(frame, frameIndex))}
                </div>
              )}
            </div>
          </section>
        )
      })}

      {light !== null && reel[light] ? (
        <Lightbox images={reel} index={light} onClose={() => setLight(null)} onIndex={setLight} labels={pack.story} />
      ) : null}
    </div>
  )
}
