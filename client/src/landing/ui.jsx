import logoWebp from '../assets/brand/usbonds-logo-96.webp'
import logoPng from '../assets/brand/usbonds-logo.png'
import { useI18n } from '../i18n/I18nProvider'
import { LOCALES } from '../i18n/locales'

/** Official logo — rendered as-is, never recoloured or redrawn. */
export const Logo = ({ className = '', eager = false }) => (
  <picture className={`logo ${className}`.trim()}>
    <source type="image/webp" srcSet={logoWebp} />
    <img
      src={logoPng}
      alt="US Bonds"
      width="500"
      height="129"
      decoding="async"
      fetchPriority={eager ? 'high' : 'auto'}
      loading={eager ? 'eager' : 'lazy'}
      draggable="false"
    />
  </picture>
)

export const ArrowIcon = () => (
  <svg className="icon-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3.2 8.4l3 3.1 6.6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ButtonLink = ({ href, variant = 'primary', children, arrow = false, className = '', ...rest }) => (
  <a href={href} className={`btn btn-${variant} ${className}`.trim()} {...rest}>
    <span>{children}</span>
    {arrow ? <ArrowIcon /> : null}
  </a>
)

export const SectionIntro = ({ kicker, title, lead, align = 'start', titleId }) => (
  <header className={`section-intro is-${align}`} data-reveal>
    {kicker ? <p className="kicker">{kicker}</p> : null}
    <h2 className="h2" id={titleId}>
      {title}
    </h2>
    {lead ? <p className="lead">{lead}</p> : null}
  </header>
)

export const LangSwitch = ({ className = '' }) => {
  const { locale, setLocale, t } = useI18n()
  return (
    <div className={`lang ${className}`.trim()} role="group" aria-label={t('nav.language')}>
      {LOCALES.map((item) => (
        <button
          key={item.code}
          type="button"
          lang={item.htmlLang}
          className="lang-btn"
          aria-pressed={locale === item.code}
          aria-label={item.native}
          onClick={() => setLocale(item.code)}
        >
          {item.short}
        </button>
      ))}
    </div>
  )
}
