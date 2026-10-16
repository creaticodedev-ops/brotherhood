import { useRef, useState } from 'react'
import { usePinnedProgress, useReveal } from '../landing/hooks'
import { ArrowIcon } from '../landing/ui'
import { A, useCopy, usePageMeta } from './ui'

const ACTS = [
  { src: '/media/warmth-group.jpg', href: '/missions/qafalat-al-dafa' },
  { src: '/media/mountain-aid.jpg', href: '/missions/qafalat-al-dafa' },
  { src: '/media/neighborhood.jpg', href: '/missions/presences-en-ville' },
]

const FRAMES = [
  { src: '/media/enlightened-wide.jpg', href: '/activities/the-enlightened-mentality' },
  { src: '/media/screening.jpg', href: '/activities/projection-de-plein-air' },
  { src: '/media/safi-heart.jpg', href: '/activities/safi-vu-d-en-haut' },
]

const index = (value) => String(value).padStart(2, '0')

export const About = () => {
  const { pack, locale } = useCopy()
  const copy = pack.about
  const openRef = useRef(null)
  const [progress, setProgress] = useState(0)
  usePageMeta(`${copy.kicker} — The Brotherhood`, copy.lead, '/about')
  usePinnedProgress(openRef, setProgress)
  useReveal(`${locale}:${copy.title}`)

  return (
    <article className="group">
      <header className="group-open" ref={openRef}>
        <div className="group-stage" style={{ '--p': progress }}>
          <img className="group-photo" src="/media/circle-clap.jpg" alt="" />
          <img className="group-photo is-next" src="/media/night-gathering.jpg" alt="" />
          <div className="group-shade" />
          <div className="container group-open-copy">
            <p className="kicker">
              {copy.foundedLabel}
              <span>{copy.founded}</span>
            </p>
            <h1 className="page-title">{copy.title}</h1>
            <p className="group-slogan">
              {copy.slogan}
              {copy.sloganGloss ? <small>{copy.sloganGloss}</small> : null}
            </p>
          </div>
          <a className="hero-scroll group-scroll" href="#beginning">
            {copy.scroll}
            <i />
          </a>
        </div>
      </header>

      <section className="group-chapter is-light" id="beginning">
        <div className="container group-begin">
          <p className="group-year" aria-hidden="true">
            2019
          </p>
          <div data-reveal>
            <p className="kicker">{copy.beginningKicker}</p>
            <h2 className="h2">{copy.beginningTitle}</h2>
            {copy.beginning.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
          <figure className="group-still" data-reveal>
            <img src="/media/clinic-group.jpg" alt={copy.beginningAlt} />
          </figure>
        </div>
      </section>

      <section className="group-chapter" id="who">
        <div className="container">
          <div className="group-who-copy" data-reveal>
            <p className="kicker">{copy.whoKicker}</p>
            <h2 className="h2">{copy.whoTitle}</h2>
            <p className="group-statement">{copy.who}</p>
          </div>
          <p className="group-creed">
            {copy.values.slice(0, 4).map((item) => (
              <span key={item.word}>{item.word}</span>
            ))}
          </p>
          <figure className="group-wide" data-reveal>
            <img src="/media/boys-banners.jpg" alt={copy.whoAlt} />
          </figure>
        </div>
      </section>

      <section className="group-chapter is-light" id="philosophy">
        <div className="container group-split">
          <figure className="group-still is-square" data-reveal>
            <img src="/media/enlightened-words.jpg" alt={copy.philosophyAlt} />
          </figure>
          <div data-reveal>
            <p className="kicker">{copy.philosophyKicker}</p>
            <h2 className="h2">{copy.philosophyTitle}</h2>
            {copy.philosophy.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="group-chapter" id="actions">
        <div className="container">
          <div className="group-head" data-reveal>
            <div>
              <p className="kicker">{copy.actionsKicker}</p>
              <h2 className="h2">{copy.actionsTitle}</h2>
              <p className="lead">{copy.actionsLead}</p>
            </div>
            <A className="btn btn-ghost btn-sm" href="/missions">
              <span>{copy.actionsLink}</span>
              <ArrowIcon />
            </A>
          </div>
          <div className="group-acts">
            {ACTS.map((act, i) => (
              <A className={i === 0 ? 'group-act is-lead' : 'group-act'} key={act.src} href={act.href} data-reveal style={{ '--d': i }}>
                <img src={act.src} alt={copy.acts[i].alt} />
                <span>
                  <small>{index(i + 1)}</small>
                  {copy.acts[i].caption}
                </span>
              </A>
            ))}
          </div>
        </div>
      </section>

      <section className="group-chapter is-light group-eye" id="creative">
        <div className="container group-eye-intro" data-reveal>
          <p className="kicker">{copy.creativeKicker}</p>
          <h2 className="group-eye-title">{copy.creativeTitle}</h2>
        </div>
        <A className="group-eye-hero" href={FRAMES[0].href} data-reveal>
          <img src={FRAMES[0].src} alt={copy.frames[0].alt} />
          <span className="group-slate">
            <small>01</small>
            {copy.frames[0].caption}
          </span>
        </A>
        <div className="container">
          <div className="group-storyboard">
            <A className="group-print is-tall" href={FRAMES[1].href} data-reveal style={{ '--d': 1 }}>
              <span className="group-print-media">
                <img src={FRAMES[1].src} alt={copy.frames[1].alt} />
              </span>
              <span className="group-slate">
                <small>02</small>
                {copy.frames[1].caption}
              </span>
            </A>
            <div className="group-story-side">
              <div className="group-eye-foot" data-reveal style={{ '--d': 2 }}>
                <p>{copy.creative}</p>
                <div className="hero-actions">
                  <A className="btn btn-primary" href="/creative">
                    <span>{copy.creativeLink}</span>
                    <ArrowIcon />
                  </A>
                  <A className="btn btn-ghost" href="/social">
                    {copy.creativeSocial}
                  </A>
                </div>
              </div>
              <A className="group-print" href={FRAMES[2].href} data-reveal style={{ '--d': 3 }}>
                <span className="group-print-media">
                  <img src={FRAMES[2].src} alt={copy.frames[2].alt} />
                </span>
                <span className="group-slate">
                  <small>03</small>
                  {copy.frames[2].caption}
                </span>
              </A>
            </div>
          </div>
        </div>
      </section>

      <section className="group-chapter" id="values">
        <div className="container">
          <div data-reveal>
            <p className="kicker">{copy.valuesKicker}</p>
            <h2 className="h2">{copy.valuesTitle}</h2>
            <p className="lead">{copy.valuesLead}</p>
          </div>
          <ol className="group-values">
            {copy.values.map((item, i) => (
              <li className="group-value" key={item.word} data-reveal style={{ '--d': i % 3 }}>
                <span>{index(i + 1)}</span>
                <strong>{item.word}</strong>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="group-close">
        <img src="/media/safi-heart.jpg" alt="" />
        <div className="group-shade" />
        <div className="container group-close-copy" data-reveal>
          <p className="kicker">{copy.closeKicker}</p>
          <h2 className="group-slogan is-end">
            {copy.slogan}
            {copy.sloganGloss ? <small>{copy.sloganGloss}</small> : null}
          </h2>
          <p className="lead">{copy.closeLead}</p>
          <div className="hero-actions">
            <A className="btn btn-primary" href="/missions">
              <span>{copy.closeMissions}</span>
              <ArrowIcon />
            </A>
            <A className="btn btn-ghost" href="/join">
              {copy.closeJoin}
            </A>
          </div>
        </div>
      </section>
    </article>
  )
}
