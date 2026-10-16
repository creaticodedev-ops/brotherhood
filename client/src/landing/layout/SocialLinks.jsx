import { SOCIAL_LINKS } from '../../config/site'
import { useI18n } from '../../i18n/I18nProvider'

const ICONS = {
  instagram: (
    <>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  tiktok: (
    <>
      <path d="M13.75 3.5v11.25a3.75 3.75 0 1 1-3.75-3.75" />
      <path d="M13.75 3.5c.35 2.75 2.3 4.7 5 4.95" />
    </>
  ),
  telegram: (
    <>
      <path d="M20.6 4.1 3.4 10.8c-.8.3-.75 1.45.07 1.7l4.33 1.33 1.68 5.2c.22.7 1.1.9 1.62.38l2.45-2.4 4.33 3.2c.6.45 1.48.12 1.64-.62L21.9 5.4c.2-.9-.6-1.62-1.3-1.3z" />
      <path d="M7.8 13.83 17.5 7.6l-7.35 7.4" />
    </>
  ),
}

const Icon = ({ name }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICONS[name]}
  </svg>
)

/** Official social accounts; unconfigured networks are displayed as "coming soon" instead of a dead link. */
export const SocialLinks = ({ className = '' }) => {
  const { t } = useI18n()
  return (
    <ul className={`social ${className}`.trim()} aria-label={t('footer.social.label')}>
      {SOCIAL_LINKS.map(({ key, url }) => {
        const network = t(`footer.social.${key}`)
        return (
          <li key={key}>
            {url ? (
              <a
                className="social-link"
                href={url}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={t('footer.social.follow', { network })}
                title={network}
              >
                <Icon name={key} />
              </a>
            ) : (
              <span className="social-link is-soon" role="img" aria-label={t('footer.social.soon', { network })} title={t('footer.social.soon', { network })}>
                <Icon name={key} />
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default SocialLinks
