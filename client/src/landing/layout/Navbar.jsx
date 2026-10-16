import { useCallback, useEffect, useRef, useState } from 'react'
import { NAV_ITEMS, START_TARGET } from '../../config/site'
import { useI18n } from '../../i18n/I18nProvider'
import { scrollToSection, useActiveSection } from '../hooks'
import { ArrowIcon, LangSwitch, Logo } from '../ui'
import { SocialLinks } from './SocialLinks'

const SECTION_IDS = NAV_ITEMS.map((item) => item.id)
const PRIMARY_ITEMS = NAV_ITEMS.filter((item) => item.primary)
const MORE_ITEMS = NAV_ITEMS.filter((item) => !item.primary)
/** Desktop "More" disclosure holding the sections that do not fit in the bar. */
const MoreMenu = ({ active, onNavigate }) => {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const current = MORE_ITEMS.some((item) => item.id === active)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className={`nav-more${open ? ' is-open' : ''}`}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`nav-more-btn${current ? ' is-current' : ''}`}
        aria-expanded={open}
        aria-controls="nav-more-panel"
        aria-label={`${t('nav.more')} — ${t('nav.moreLabel')}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{t('nav.more')}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="nav-more-panel" id="nav-more-panel">
        <ul>
          {MORE_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? 'true' : undefined}
                onClick={(event) => {
                  setOpen(false)
                  onNavigate(event, item.id)
                }}
              >
                <span className="nav-more-dot" aria-hidden="true" />
                <span>{t(`nav.${item.key}`)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const MobileMenu = ({ open, onClose, active, onNavigate }) => {
  const { t } = useI18n()
  const panelRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll('a[href], button:not([disabled])')
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [open, onClose])

  return (
    <div
      ref={panelRef}
      id="mobile-menu"
      className={`menu${open ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.menu')}
      hidden={!open}
    >
      <div className="menu-top container">
        <Logo className="menu-logo" />
        <button ref={closeRef} type="button" className="icon-btn" onClick={onClose} aria-label={t('nav.close')}>
          <span className="burger is-close" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </div>
      <nav className="menu-body container" aria-label={t('nav.primary')}>
        <ol className="menu-links">
          {NAV_ITEMS.map((item, index) => (
            <li key={item.id} style={{ '--i': index }}>
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? 'true' : undefined}
                onClick={(event) => onNavigate(event, item.id)}
              >
                <span className="menu-index">{String(index + 1).padStart(2, '0')}</span>
                {t(`nav.${item.key}`)}
              </a>
            </li>
          ))}
        </ol>
        <div className="menu-foot">
          <a href={`#${START_TARGET}`} className="btn btn-primary btn-block" onClick={(event) => onNavigate(event, START_TARGET)}>
            <span>{t('nav.cta')}</span>
            <ArrowIcon />
          </a>
          <div className="menu-lang">
            <span>{t('nav.language')}</span>
            <LangSwitch className="is-large" />
          </div>
          <div className="menu-lang">
            <span>{t('footer.social.title')}</span>
            <SocialLinks />
          </div>
        </div>
      </nav>
    </div>
  )
}

export const Navbar = () => {
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const active = useActiveSection(SECTION_IDS)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1100px)')
    const onChange = (event) => event.matches && setOpen(false)
    desktop.addEventListener('change', onChange)
    return () => desktop.removeEventListener('change', onChange)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  const navigate = useCallback((event, id) => {
    event.preventDefault()
    setOpen(false)
    requestAnimationFrame(() => scrollToSection(id))
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">
        {t('nav.skip')}
      </a>
      <header className={`nav${scrolled ? ' is-scrolled' : ''}`}>
        <div className="nav-inner container">
          <a href="#top" className="nav-logo" aria-label={t('nav.homeLink')} onClick={(event) => navigate(event, 'top')}>
            <Logo eager />
          </a>

          <nav className="nav-links" aria-label={t('nav.primary')}>
            {PRIMARY_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={active === item.id ? 'true' : undefined}
                onClick={(event) => navigate(event, item.id)}
              >
                {t(`nav.${item.key}`)}
              </a>
            ))}
            <MoreMenu active={active} onNavigate={navigate} />
          </nav>

          <div className="nav-actions">
            <LangSwitch className="nav-lang" />
            <a href={`#${START_TARGET}`} className="btn btn-primary btn-sm nav-cta" onClick={(event) => navigate(event, START_TARGET)}>
              <span>{t('nav.cta')}</span>
            </a>
            <button
              type="button"
              className="icon-btn nav-burger"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={t('nav.open')}
              onClick={() => setOpen(true)}
            >
              <span className="burger" aria-hidden="true">
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={open} onClose={close} active={active} onNavigate={navigate} />
    </>
  )
}

export default Navbar
