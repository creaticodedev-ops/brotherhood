import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { usePinnedProgress } from '../hooks'
import { ButtonLink } from '../ui'
import { HeroCanvas } from '../visuals/HeroCanvas'
import '../hero.css'

const CLOCKS = [
  { key: 'hero.hud.london', timeZone: 'Europe/London' },
  { key: 'hero.hud.newYork', timeZone: 'America/New_York' },
]

const MarketClocks = () => {
  const { t } = useI18n()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <ul className="hero-clocks">
      {CLOCKS.map(({ key, timeZone }) => (
        <li key={timeZone}>
          <span>{t(key)}</span>
          <time dir="ltr">
            {new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(now)}
          </time>
        </li>
      ))}
    </ul>
  )
}

export const Hero = () => {
  const { t, tm } = useI18n()
  const sectionRef = useRef(null)
  const stageRef = useRef(null)
  const sceneRef = useRef(null)
  const pillars = tm('hero.pillars') || []

  usePinnedProgress(sectionRef, (progress) => {
    stageRef.current?.style.setProperty('--p', progress.toFixed(4))
    sceneRef.current?.setProgress(progress)
  })

  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    sceneRef.current?.setPointer((x / rect.width) * 2 - 1, (y / rect.height) * 2 - 1, x)
  }

  const onPointerLeave = () => sceneRef.current?.setPointer(0, 0, null)

  return (
    <section ref={sectionRef} className="hero" id="top" aria-labelledby="hero-title">
      <div ref={stageRef} className="hero-stage" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
        <HeroCanvas sceneRef={sceneRef} />
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-frame" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>

        <div className="hero-hud container">
          <p className="hero-chip">
            <i aria-hidden="true" />
            {t('hero.hud.illustrative')}
          </p>
          <MarketClocks />
        </div>

        <div className="hero-content container">
          <p className="hero-eyebrow">
            <i aria-hidden="true" />
            {t('hero.eyebrow')}
          </p>
          <h1 className="hero-title" id="hero-title">
            <span className="hero-line">{t('hero.titleA')}</span>
            <span className="hero-line is-soft">{t('hero.titleB')}</span>
          </h1>
          <p className="hero-lead">{t('hero.lead')}</p>
          <div className="hero-actions">
            <ButtonLink href="#offers" arrow>
              {t('hero.ctaPrimary')}
            </ButtonLink>
            <ButtonLink href="#about" variant="ghost">
              {t('hero.ctaSecondary')}
            </ButtonLink>
          </div>
        </div>

        <p className="hero-statement" aria-hidden="true">
          {t('hero.statement')}
        </p>

        <div className="hero-rail container">
          <ul className="hero-pillars">
            {pillars.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <a className="hero-scroll" href="#about" aria-label={t('hero.ctaSecondary')}>
            <span>{t('hero.scroll')}</span>
            <i aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  )
}

export default Hero
