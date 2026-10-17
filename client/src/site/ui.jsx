import { useEffect, useRef, useState } from 'react'
import { LOCALES } from '../i18n/locales'
import { useI18n } from '../i18n/I18nProvider'
import { MEMBERSHIP_LAUNCH, SOCIAL_LINKS } from '../config/site'
import { categoryLabel, storyPath } from '../../../shared/catalog.js'
import { ArrowIcon, Logo } from '../landing/ui'
import { COPY } from './copy'

export const useCopy = () => {
  const { locale, setLocale } = useI18n()
  return { pack: COPY[locale] || COPY.fr, locale, setLocale }
}

export const go = (href) => {
  const next = href.startsWith('/') ? href : `/${href}`
  if (next === `${window.location.pathname}${window.location.search}`) return
  window.history.pushState(null, '', next)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export const A = ({ href, children, className, ...rest }) => (
  <a
    href={href}
    className={className}
    onClick={(event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (!href?.startsWith('/') || href.startsWith('//')) return
      event.preventDefault()
      go(href)
    }}
    {...rest}
  >
    {children}
  </a>
)

const NAV = [
  ['/', 'home'],
  ['/about', 'about'],
  ['/missions', 'missions'],
  ['/activities', 'activities'],
  ['/creative', 'creative'],
  ['/social', 'social'],
]

export const usePageMeta = (title, description, path = '/') => {
  useEffect(() => {
    document.title = title
    const set = (selector, attr, value) => {
      const el = document.head.querySelector(selector)
      if (el && value) el.setAttribute(attr, value)
    }
    set('meta[name="description"]', 'content', description)
    set('meta[property="og:title"]', 'content', title)
    set('meta[property="og:description"]', 'content', description)
    set('meta[property="og:url"]', 'content', `${window.location.origin}${path}`)
    const link = document.head.querySelector('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'canonical' }))
    link.href = `${window.location.origin}${path}`
  }, [description, path, title])
}

const currentOf = (path, href) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`))

export const Nav = ({ path }) => {
  const { pack, locale, setLocale } = useCopy()
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(path !== '/')
  const closeRef = useRef(null)

  useEffect(() => {
    setOpen(false)
  }, [path])

  useEffect(() => {
    const onScroll = () => setSolid(path !== '/' || window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [path])

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [open])

  const home = MEMBERSHIP_LAUNCH ? '/recruit' : '/'

  return (
    <>
      <header className={`nav${solid || open ? ' is-scrolled' : ''}${MEMBERSHIP_LAUNCH ? ' is-launch' : ''}`}>
        <div className="container nav-inner">
          <A className="nav-logo" href={home} aria-label="The Brotherhood">
            <Logo eager />
          </A>
          {MEMBERSHIP_LAUNCH ? null : (
            <nav className="nav-links" aria-label={pack.nav.primary}>
              {NAV.map(([href, key]) => (
                <A key={href} href={href} aria-current={currentOf(path, href) ? 'page' : undefined}>
                  {pack.nav[key]}
                </A>
              ))}
            </nav>
          )}
          <div className="nav-actions">
            <div className="lang nav-lang" role="group" aria-label={pack.a11y.lang}>
              {LOCALES.map((item) => (
                <button key={item.code} type="button" className="lang-btn" lang={item.htmlLang} aria-pressed={locale === item.code} onClick={() => setLocale(item.code)}>
                  {item.short}
                </button>
              ))}
            </div>
            <A className="btn btn-primary btn-sm nav-cta" href="/join" aria-current={path === '/join' ? 'page' : undefined}>
              <span>{pack.nav.join}</span>
              <ArrowIcon />
            </A>
            <button ref={closeRef} type="button" className="icon-btn nav-burger" aria-expanded={open} aria-label={open ? pack.nav.close : pack.nav.open} onClick={() => setOpen((value) => !value)}>
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
            <A className="menu-logo" href={home} aria-label="The Brotherhood">
              <Logo />
            </A>
            <button type="button" className="icon-btn" aria-label={pack.nav.close} onClick={() => setOpen(false)}>
              <span className="burger is-close">
                <i />
                <i />
              </span>
            </button>
          </div>
          <div className="container menu-body">
            <ol className="menu-links">
              {MEMBERSHIP_LAUNCH
                ? null
                : NAV.map(([href, key], index) => (
                    <li key={href} style={{ '--i': index }}>
                      <A href={href} aria-current={currentOf(path, href) ? 'page' : undefined}>
                        <span className="menu-index">{String(index + 1).padStart(2, '0')}</span>
                        {pack.nav[key]}
                      </A>
                    </li>
                  ))}
              <li style={{ '--i': MEMBERSHIP_LAUNCH ? 0 : NAV.length }}>
                <A href="/join" aria-current={path === '/join' ? 'page' : undefined}>
                  <span className="menu-index">{String((MEMBERSHIP_LAUNCH ? 0 : NAV.length) + 1).padStart(2, '0')}</span>
                  {pack.nav.join}
                </A>
              </li>
            </ol>
            <div className="lang is-large" role="group" aria-label={pack.a11y.lang}>
              {LOCALES.map((item) => (
                <button key={item.code} type="button" className="lang-btn" aria-pressed={locale === item.code} onClick={() => setLocale(item.code)}>
                  {item.short}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export const Footer = () => {
  const { pack } = useCopy()
  const home = MEMBERSHIP_LAUNCH ? '/recruit' : '/'
  return (
    <footer className="foot">
      <div className="container">
        <div className="foot-top">
          <div className="foot-brand">
            <A className="foot-logo" href={home} aria-label="The Brotherhood">
              <Logo />
            </A>
            <p>{pack.footer.lead}</p>
          </div>
          <SocialRow pack={pack.social} compact />
        </div>
        <div className="foot-grid">
          <div className="foot-col">
            <h3>{pack.footer.explore}</h3>
            <ul className="foot-list">
              {MEMBERSHIP_LAUNCH
                ? null
                : NAV.map(([href, key]) => (
                    <li key={href}>
                      <A href={href}>{pack.nav[key]}</A>
                    </li>
                  ))}
              <li>
                <A href="/join">{pack.nav.join}</A>
              </li>
            </ul>
          </div>
          <div className="foot-col">
            <h3>{pack.footer.follow}</h3>
            <ul className="foot-list">
              {SOCIAL_LINKS.map((item) => (
                <li key={item.key}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.key === 'tiktok' ? 'TikTok' : item.key === 'facebook' ? 'Facebook' : 'Instagram'}
                    </a>
                  ) : (
                    <span className="foot-muted">{item.key}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="foot-col">
            <h3>{pack.footer.privacy}</h3>
            <ul className="foot-list">
              <li>
                <A href="/privacy">{pack.footer.privacy}</A>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>{pack.footer.rights}</span>
          <a className="foot-admin" href="/admin">
            {pack.footer.admin}
          </a>
        </div>
      </div>
    </footer>
  )
}

export const Shot = ({ story, locale, ratio = 'portrait' }) => (
  <A className={`shot is-${ratio}`} href={storyPath(story)} data-reveal>
    <figure>
      <img src={story.cover || story.images?.[0]?.src} alt={story.images?.[0]?.alt || story.title} />
      <figcaption>
        <small>{categoryLabel(story.kind, story.category, locale)}</small>
        <strong>{story.title}</strong>
      </figcaption>
    </figure>
  </A>
)

export const Lightbox = ({ images, index, onClose, onIndex, labels }) => {
  const closeRef = useRef(null)
  const pointer = useRef(null)
  const step = (direction) => onIndex((index + direction + images.length) % images.length)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [images.length, index, onClose, onIndex])

  const image = images[index]
  if (!image) return null
  return (
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || labels.open}
      onPointerDown={(event) => {
        if (event.target.closest('button')) return
        pointer.current = event.clientX
      }}
      onPointerUp={(event) => {
        if (pointer.current == null) return
        const delta = event.clientX - pointer.current
        pointer.current = null
        if (delta > 56) step(-1)
        else if (delta < -56) step(1)
      }}
    >
      <header>
        <p>{image.caption || image.alt}</p>
        <button ref={closeRef} type="button" onClick={onClose}>
          {labels.close}
        </button>
      </header>
      <div className="viewer-stage">
        <button type="button" className="viewer-edge is-prev" aria-label={labels.prev} onClick={() => step(-1)} />
        <img key={image.src} src={image.src} alt={image.alt || ''} />
        <button type="button" className="viewer-edge is-next" aria-label={labels.next} onClick={() => step(1)} />
      </div>
      <footer>
        <span>
          {index + 1} / {images.length}
        </span>
        {image.href ? (
          <button
            type="button"
            onClick={() => {
              onClose()
              go(image.href)
            }}
          >
            {labels.read}
          </button>
        ) : null}
      </footer>
    </div>
  )
}

const SOCIAL_MARKS = {
  instagram: (
    <>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: <path d="M14.2 8.2h-1.7c-.5 0-.8.2-.8.8v1.6h2.4l-.3 2.3h-2.1V20H9.4v-7.1H7.8v-2.3h1.6V8.8c0-2 1.2-3.3 3.3-3.3.8 0 1.5.1 1.5.1v2.6z" fill="currentColor" stroke="none" />,
  tiktok: (
    <>
      <path d="M13.75 3.5v11.25a3.75 3.75 0 1 1-3.75-3.75" />
      <path d="M13.75 3.5c.35 2.75 2.3 4.7 5 4.95" />
    </>
  ),
}

const SocialMark = ({ name }) => (
  <svg className="social-mark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {SOCIAL_MARKS[name]}
  </svg>
)

export const SocialRow = ({ pack, compact = false, withIcons = false }) => {
  const text = pack.social || pack
  return (
    <div className={`social-row${compact ? ' is-compact' : ''}`}>
      {SOCIAL_LINKS.map((item) => {
        const name = item.key === 'tiktok' ? 'TikTok' : item.key === 'facebook' ? 'Facebook' : 'Instagram'
        const action = pack.follow || text.visit
        return (
          <article key={item.key} className={`social-card is-${item.key}`}>
            <span>
              {withIcons ? <SocialMark name={item.key} /> : null}
              {name}
            </span>
            {compact ? null : <p>{text[item.key]}</p>}
            {item.url ? (
              <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={withIcons ? `${name}. ${action}` : undefined}>
                {action}
                <ArrowIcon />
              </a>
            ) : (
              <em>{text.missing}</em>
            )}
          </article>
        )
      })}
    </div>
  )
}
