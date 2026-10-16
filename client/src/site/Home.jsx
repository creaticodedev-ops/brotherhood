import { useEffect, useRef, useState } from 'react'
import { usePinnedProgress, useReveal } from '../landing/hooks'
import { ArrowIcon, SectionIntro } from '../landing/ui'
import { resolveChapters } from '../../../shared/catalog.js'
import { loadStories } from './api'
import { A, Shot, SocialRow, useCopy, usePageMeta } from './ui'

export const Home = () => {
  const { pack, locale } = useCopy()
  const heroRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [missions, setMissions] = useState([])
  const [activities, setActivities] = useState([])
  const [chapters, setChapters] = useState([])
  usePageMeta(pack.meta.title, pack.meta.description, '/')
  usePinnedProgress(heroRef, setProgress)
  useReveal(`${locale}:${missions.length}:${activities.length}:${chapters.length}`)

  useEffect(() => {
    let live = true
    Promise.all([loadStories({ kind: 'mission', featured: '1', limit: 3 }), loadStories({ kind: 'activity', limit: 3 }), loadStories({ limit: 60 })]).then(
      ([missionData, activityData, archive]) => {
        if (!live) return
        setMissions(missionData.items)
        setActivities(activityData.items)
        setChapters(resolveChapters(archive.items).slice(0, 3))
      },
    )
    return () => {
      live = false
    }
  }, [])

  const [lead, ...rest] = missions

  return (
    <>
      <section className="hero" ref={heroRef}>
        <div className="hero-stage" style={{ '--p': progress }}>
          <div className="hero-photo" style={{ backgroundImage: 'url(/media/night-gathering.jpg)' }} />
          <div className="hero-shade" />
          <div className="hero-frame" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="container hero-content">
            <p className="hero-eyebrow">
              <i />
              {pack.home.kicker}
            </p>
            <h1 className="hero-title">
              <span className="hero-line">{pack.home.title}</span>
              <span className="hero-line is-soft">{pack.home.soft}</span>
            </h1>
            <p className="hero-lead">{pack.home.lead}</p>
            <div className="hero-actions">
              <A className="btn btn-primary" href="/missions">
                <span>{pack.home.primary}</span>
                <ArrowIcon />
              </A>
              <A className="btn btn-ghost" href="/creative">
                {pack.home.secondary}
              </A>
              <A className="btn btn-ghost" href="/join">
                {pack.home.join}
              </A>
            </div>
          </div>
          <div className="container hero-rail">
            <ul className="hero-pillars">
              {pack.home.words.map((item) => (
                <li key={item.word}>{item.word}</li>
              ))}
            </ul>
            <a className="hero-scroll" href="#identity">
              {pack.home.scroll}
              <i />
            </a>
          </div>
          <p className="hero-statement">{pack.home.statement}</p>
        </div>
      </section>

      <section className="section is-light" id="identity">
        <div className="container">
          <SectionIntro kicker={pack.home.identityKicker} title={pack.home.identityTitle} />
          <div className="approach-grid" style={{ marginTop: 'clamp(40px, 6vw, 72px)' }}>
            <div />
            <div>
              {pack.home.words.map((item, index) => (
                <article className="approach-item" key={item.word} data-reveal style={{ '--d': index }}>
                  <h3>{item.word}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <SectionIntro kicker={pack.home.missionsKicker} title={pack.home.missionsTitle} />
            <A className="btn btn-ghost btn-sm" href="/missions" data-reveal>
              <span>{pack.home.missionsLink}</span>
              <ArrowIcon />
            </A>
          </div>
          {lead ? (
            <div className="feature-grid">
              <Shot story={lead} locale={locale} ratio="wide" />
              <div className="feature-side">
                {rest.map((story) => (
                  <Shot key={story.slug} story={story} locale={locale} ratio="land" />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="section band">
        <div className="container">
          <div className="section-head">
            <SectionIntro kicker={pack.home.creativeKicker} title={pack.home.creativeTitle} />
            <A className="btn btn-ghost btn-sm" href="/creative" data-reveal>
              <span>{pack.home.creativeLink}</span>
              <ArrowIcon />
            </A>
          </div>
          <div className="home-reel">
            {chapters.map((chapter, index) => (
              <A key={chapter.id} className="still is-home" href={`/creative#${chapter.id}`} data-reveal style={{ '--d': index }}>
                <span className="still-media">
                  <img src={chapter.frames[0].src} alt={chapter.frames[0].alt || chapter.title} />
                </span>
                <span className="still-cap">
                  <small>{String(index + 1).padStart(2, '0')}</small>
                  {pack.creative.labels?.[chapter.id] || chapter.title}
                </span>
              </A>
            ))}
          </div>
        </div>
      </section>

      <section className="section is-light">
        <div className="container">
          <div className="section-head">
            <SectionIntro kicker={pack.home.activityKicker} title={pack.home.activityTitle} />
            <A className="btn btn-ghost btn-sm" href="/activities" data-reveal>
              <span>{pack.home.activityLink}</span>
              <ArrowIcon />
            </A>
          </div>
          <div className="trio">
            {activities.map((story, index) => (
              <Shot key={story.slug} story={story} locale={locale} ratio={index === 1 ? 'tall' : 'portrait'} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <SectionIntro kicker={pack.home.socialKicker} title={pack.home.socialTitle} />
            <A className="btn btn-ghost btn-sm" href="/social" data-reveal>
              <span>{pack.home.socialLink}</span>
              <ArrowIcon />
            </A>
          </div>
          <SocialRow pack={{ ...pack.social, follow: pack.home.follow }} />
        </div>
      </section>

      <section className="final">
        <img className="final-art" src="/media/safi-heart.jpg" alt="" />
        <div className="container final-inner" data-reveal>
          <p className="kicker">{pack.home.endKicker}</p>
          <h2 className="final-title">{pack.home.endTitle}</h2>
          <p className="lead">{pack.home.endLead}</p>
          <div className="hero-actions">
            <A className="btn btn-primary" href="/missions">
              <span>{pack.home.primary}</span>
              <ArrowIcon />
            </A>
            <A className="btn btn-ghost" href="/social">
              {pack.home.socialLink}
            </A>
            <A className="btn btn-ghost" href="/join">
              {pack.home.join}
            </A>
          </div>
        </div>
      </section>
    </>
  )
}
