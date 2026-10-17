import { useCallback, useEffect, useRef, useState } from 'react'
import { LOCALES } from '../i18n/locales'
import { useReveal } from '../landing/hooks'
import { ArrowIcon, Logo } from '../landing/ui'
import { RegistrationClock, useRegistrationWindow } from './Countdown'
import { A, useCopy, usePageMeta } from './ui'
import './recruit.css'

const HERO_PHOTO = '/media/night-gathering.jpg'
const JOIN_AUDIO = '/media/brotherhood.mp4'

const Plate = ({ alt = '', priority = false, src = HERO_PHOTO, width = 1024, height = 768 }) => (
  <>
    <img
      className="recruit-plate"
      src={src}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      loading={priority ? 'eager' : 'lazy'}
    />
    <div className="recruit-shade" />
  </>
)

const SoundIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2.5 6.2h2.2L8 3.4v9.2L4.7 9.8H2.5V6.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M10.2 6.1a2.6 2.6 0 0 1 0 3.8M11.8 4.6a4.6 4.6 0 0 1 0 6.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const MuteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2.5 6.2h2.2L8 3.4v9.2L4.7 9.8H2.5V6.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M11 6.2 14 9.2M14 6.2 11 9.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const RecruitSound = ({ muteLabel, unmuteLabel }) => {
  const mediaRef = useRef(null)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const media = mediaRef.current
    if (!media) return undefined
    const onChange = () => setMuted(media.muted)
    media.addEventListener('volumechange', onChange)
    const attempt = media.play()
    if (attempt?.catch) {
      attempt.catch(() => {
        media.muted = true
        setMuted(true)
      })
    }
    return () => {
      media.removeEventListener('volumechange', onChange)
      media.pause()
    }
  }, [])

  const toggle = () => {
    const media = mediaRef.current
    if (!media) return
    const next = !media.muted
    media.muted = next
    setMuted(next)
    if (media.paused) {
      const attempt = media.play()
      if (attempt?.catch) attempt.catch(() => {})
    }
  }

  return (
    <>
      <audio ref={mediaRef} className="recruit-audio" src={JOIN_AUDIO} preload="auto" autoPlay />
      <button type="button" className="icon-btn recruit-sound" aria-pressed={!muted} aria-label={muted ? unmuteLabel : muteLabel} onClick={toggle}>
        {muted ? <MuteIcon /> : <SoundIcon />}
      </button>
    </>
  )
}

const LINKS = [
  ['#group', 'group'],
  ['#values', 'values'],
  ['#why', 'why'],
  ['#apply', 'apply'],
]

export const Recruit = () => {
  const { pack, locale, setLocale } = useCopy()
  const copy = pack.recruit
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)
  const [clockReload, setClockReload] = useState(0)
  const registration = useRegistrationWindow(clockReload)
  const onClockElapsed = useCallback(() => setClockReload((value) => value + 1), [])
  usePageMeta(copy.metaTitle, copy.metaDescription, '/recruit')
  useReveal(locale)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="recruit">
      <header className={`nav${solid || open ? ' is-scrolled' : ''}`}>
        <div className="container nav-inner">
          <A className="nav-logo" href="/recruit" aria-label="The Brotherhood">
            <Logo eager />
          </A>
          <nav className="nav-links" aria-label={pack.nav.primary}>
            {LINKS.map(([href, key]) => (
              <a key={href} href={href}>
                {copy.menu[key]}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <div className="lang nav-lang" role="group" aria-label={pack.a11y.lang}>
              {LOCALES.map((item) => (
                <button key={item.code} type="button" className="lang-btn" lang={item.htmlLang} aria-pressed={locale === item.code} onClick={() => setLocale(item.code)}>
                  {item.short}
                </button>
              ))}
            </div>
            <A className="btn btn-primary btn-sm nav-cta" href="/join">
              <span>{copy.join}</span>
              <ArrowIcon />
            </A>
            <button type="button" className="icon-btn nav-burger" aria-expanded={open} aria-label={open ? pack.nav.close : pack.nav.open} onClick={() => setOpen((value) => !value)}>
              <span className={`burger${open ? ' is-close' : ''}`}>
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="menu is-open" role="dialog" aria-modal="true" aria-label={pack.nav.primary}>
          <div className="container menu-top">
            <A className="menu-logo" href="/recruit" aria-label="The Brotherhood">
              <Logo />
            </A>
            <button type="button" className="icon-btn" aria-label={pack.nav.close} onClick={close}>
              <span className="burger is-close">
                <i />
                <i />
              </span>
            </button>
          </div>
          <div className="container menu-body">
            <ol className="menu-links">
              {LINKS.map(([href, key], index) => (
                <li key={href} style={{ '--i': index }}>
                  <a href={href} onClick={close}>
                    <span className="menu-index">{String(index + 1).padStart(2, '0')}</span>
                    {copy.menu[key]}
                  </a>
                </li>
              ))}
              <li style={{ '--i': LINKS.length }}>
                <A href="/join">
                  <span className="menu-index">{String(LINKS.length + 1).padStart(2, '0')}</span>
                  {copy.join}
                </A>
              </li>
            </ol>
          </div>
        </div>
      ) : null}

      <section className="recruit-hero">
        <Plate alt={copy.photoGathering} priority />
        <RecruitSound muteLabel={copy.mute} unmuteLabel={copy.unmute} />
        <div className="container recruit-hero-copy">
          <p className="kicker">THE BROTHERHOOD</p>
          <h1><bdi dir="ltr">Every Warrior Has a Story.</bdi></h1>
          <p className="lead">{copy.heroLead}</p>
          <A className="btn btn-primary" href="/join">
            <span>{copy.become}</span>
            <ArrowIcon />
          </A>
        </div>
      </section>

      <section className="section is-light recruit-group" id="group">
        <div className="container recruit-about">
          <div className="recruit-about-copy" data-reveal>
            <p className="kicker">{copy.aboutKicker}</p>
            <h2 className="h2">{copy.aboutTitle}</h2>
            <p className="recruit-founded">{copy.aboutFounded}</p>
          </div>
          <figure className="recruit-about-photo" data-reveal>
            <img src="/media/stage-gathering.jpg" alt={copy.photoTeam} width="1024" height="683" decoding="async" />
          </figure>
          <div className="recruit-about-body" data-reveal>
            {copy.about.map((paragraph) => (
              <p key={paragraph} className="lead">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="values">
        <div className="container">
          <div data-reveal>
            <p className="kicker">{copy.valuesKicker}</p>
            <h2 className="h2">{copy.valuesTitle}</h2>
          </div>
          <ol className="recruit-values">
            {copy.values.map((item, index) => (
              <li key={item.title} data-reveal style={{ '--d': index }}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section is-light" id="why">
        <div className="container recruit-why">
          <div data-reveal>
            <p className="kicker">{copy.whyKicker}</p>
            <h2 className="h2">{copy.whyTitle}</h2>
          </div>
          <ol>
            {copy.why.map((item) => (
              <li key={item} data-reveal>
                {item}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="recruit-apply" id="apply">
        <Plate src="/media/safi-heart.jpg" width={1024} height={691} />
        <div className="container recruit-apply-copy" data-reveal>
          {registration.window?.showCountdown ? (
            <RegistrationClock state={registration.window} copy={copy.clock} onElapsed={onClockElapsed} />
          ) : null}
          <p className="kicker">THE BROTHERHOOD</p>
          <h2 dir={locale === 'ar' ? 'rtl' : 'ltr'}>{copy.closeTitle}</h2>
          <p>{copy.closeLead}</p>
          <A className="btn btn-primary" href="/join">
            <span>{copy.join}</span>
            <ArrowIcon />
          </A>
        </div>
      </section>

    </div>
  )
}
