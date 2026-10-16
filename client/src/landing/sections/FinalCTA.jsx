import { contactHref } from '../../config/site'
import { useI18n } from '../../i18n/I18nProvider'
import { ButtonLink } from '../ui'
import { HeroVisual } from '../visuals/HeroVisual'

export const FinalCTA = () => {
  const { t } = useI18n()

  return (
    <section className="final" aria-labelledby="final-title">
      <div className="final-art" aria-hidden="true">
        <HeroVisual />
      </div>
      <div className="container final-inner" data-reveal>
        <p className="kicker">{t('final.kicker')}</p>
        <h2 className="final-title" id="final-title">
          {t('final.title')}
        </h2>
        <p className="lead">{t('final.lead')}</p>
        <div className="hero-actions">
          <ButtonLink href="#offers" arrow>
            {t('final.ctaPrimary')}
          </ButtonLink>
          <ButtonLink href={contactHref('US Bonds')} variant="ghost">
            {t('final.ctaSecondary')}
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

export default FinalCTA
