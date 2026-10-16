import { OFFERS, formatCapital } from '../../config/offers'
import { useI18n } from '../../i18n/I18nProvider'
import { getLocaleMeta } from '../../i18n/locales'
import { useOverlay } from '../overlays/context'
import { ArrowIcon, CheckIcon, SectionIntro } from '../ui'

export const OffersPreview = () => {
  const { t, tm, locale } = useI18n()
  const { openRegistration } = useOverlay()
  const intlLocale = getLocaleMeta(locale).htmlLang

  return (
    <section className="section offers" id="offers" aria-labelledby="offers-title">
      <div className="container">
        <div className="offers-head">
          <SectionIntro kicker={t('offers.kicker')} title={t('offers.title')} lead={t('offers.lead')} titleId="offers-title" />
          <span className="tag is-outline" data-reveal>
            {t('offers.badge')}
          </span>
        </div>

        <ul className="offers-grid">
          {OFFERS.map((offer, index) => {
            const copy = tm(`offers.items.${offer.id}`) || {}
            const capital = formatCapital(offer.capital, intlLocale)
            return (
              <li
                key={offer.id}
                className={`offer${offer.featured ? ' is-featured' : ''}`}
                data-reveal
                style={{ '--d': index }}
              >
                <div className="offer-top">
                  <span className="offer-level">{t('offers.level', { n: offer.level })}</span>
                  <span className="offer-bars" aria-hidden="true">
                    {[1, 2, 3].map((n) => (
                      <i key={n} className={n <= offer.level ? 'is-on' : undefined} />
                    ))}
                  </span>
                </div>
                <h3>{copy.name}</h3>
                <p className="offer-focus">{copy.focus}</p>
                <dl className="offer-capital">
                  <dt>{t('offers.capitalLabel')}</dt>
                  <dd>{capital || t('offers.capitalTbd')}</dd>
                </dl>
                <p className="offer-features-label">{t('offers.featuresLabel')}</p>
                <ul className="offer-features">
                  {(copy.features || []).map((feature) => (
                    <li key={feature}>
                      <CheckIcon />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`btn ${offer.featured ? 'btn-primary' : 'btn-ghost'} btn-block`}
                  onClick={() => openRegistration(offer.id)}
                >
                  <span>{t('offers.cta')}</span>
                  <ArrowIcon />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default OffersPreview
