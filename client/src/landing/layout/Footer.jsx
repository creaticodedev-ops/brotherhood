import { NAV_ITEMS, SITE } from '../../config/site'
import { useI18n } from '../../i18n/I18nProvider'
import { LangSwitch, Logo } from '../ui'
import { SocialLinks } from './SocialLinks'

const NAV_LINKS = NAV_ITEMS.filter((item) => item.primary)
const COMPANY_LINKS = NAV_ITEMS.filter((item) => !item.primary && item.id !== 'contact')

const ContactList = () => {
  const { t } = useI18n()
  const { email, phone, whatsapp, address } = SITE.contact
  const items = [
    email && { key: 'email', href: `mailto:${email}`, value: email },
    phone && { key: 'phone', href: `tel:${phone.replace(/\s+/g, '')}`, value: phone },
    whatsapp && { key: 'whatsapp', href: `https://wa.me/${whatsapp.replace(/\D/g, '')}`, value: whatsapp, external: true },
    address && { key: 'address', value: address },
  ].filter(Boolean)

  if (!items.length) return <p className="foot-muted">{t('footer.contactSoon')}</p>

  return (
    <ul className="foot-list">
      {items.map((item) => (
        <li key={item.key}>
          <span className="foot-label">{t(`footer.${item.key}`)}</span>
          {item.href ? (
            <a
              href={item.href}
              dir="ltr"
              {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {item.value}
            </a>
          ) : (
            <span>{item.value}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export const Footer = () => {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="foot" aria-labelledby="foot-title">
      <h2 id="foot-title" className="sr-only">
        US Bonds
      </h2>
      <div className="container">
        <div className="foot-top">
          <div className="foot-brand">
            <Logo className="foot-logo" />
            <p>{t('footer.statement')}</p>
            <div className="foot-social">
              <span>{t('footer.social.title')}</span>
              <SocialLinks />
            </div>
          </div>
          <div className="foot-lang">
            <span>{t('footer.language')}</span>
            <LangSwitch />
          </div>
        </div>

        <div className="foot-grid">
          <nav className="foot-col" aria-label={t('footer.navTitle')}>
            <h3>{t('footer.navTitle')}</h3>
            <ul className="foot-list">
              {NAV_LINKS.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{t(`nav.${item.key}`)}</a>
                </li>
              ))}
            </ul>
          </nav>
          <nav className="foot-col" aria-label={t('footer.companyTitle')}>
            <h3>{t('footer.companyTitle')}</h3>
            <ul className="foot-list">
              {COMPANY_LINKS.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{t(`nav.${item.key}`)}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="foot-col" id="contact">
            <h3>{t('footer.contactTitle')}</h3>
            <ContactList />
          </div>
          <div className="foot-col">
            <h3>{t('footer.legalTitle')}</h3>
            <ul className="foot-list">
              <li className="foot-muted">{t('footer.legalSoon')}</li>
            </ul>
          </div>
        </div>

        <div className="foot-bottom">
          <p>{t('footer.rights', { year })}</p>
          <div className="foot-bottom-links">
            <a href="/admin" className="foot-admin" rel="nofollow" title={t('footer.adminLabel')}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <rect x="2.25" y="5.25" width="7.5" height="5.25" rx="1.25" stroke="currentColor" strokeWidth="1.1" />
                <path d="M4 5.25V3.75a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              <span>{t('footer.admin')}</span>
            </a>
            <a href="#top">{t('footer.backToTop')}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
