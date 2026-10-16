import { useI18n } from '../../i18n/I18nProvider'
import { useGoldQuote } from '../../market/goldQuote'
import { useOverlay } from '../overlays/context'
import { ArrowIcon } from '../ui'
import { GoldQuoteDial } from '../visuals/GoldQuoteDial'

export const MarketSection = () => {
  const { t, tm, locale } = useI18n()
  const { openTerminal } = useOverlay()
  const { status } = useGoldQuote()
  const drivers = tm('markets.drivers') || []

  return (
    <section className="section markets" id="markets" aria-labelledby="markets-title">
      <div className="container markets-grid">
        <div className="markets-art" data-reveal>
          <GoldQuoteDial
            locale={locale}
            onOpen={openTerminal}
            labels={{
              open: t('markets.live.open'),
              unit: t('markets.live.unit'),
              low: t('markets.live.low'),
              high: t('markets.live.high'),
              status: t(`terminal.status.${status}`),
            }}
          />
          <p className="markets-live-caption">
            <i aria-hidden="true" />
            {t('markets.live.caption')}
          </p>
        </div>
        <div className="markets-copy">
          <header className="section-intro" data-reveal>
            <p className="kicker">{t('markets.kicker')}</p>
            <h2 className="h2" id="markets-title">
              {t('markets.title')}
            </h2>
            <p className="lead">{t('markets.lead')}</p>
          </header>
          <ul className="drivers">
            {drivers.map((item, index) => (
              <li key={index} data-reveal style={{ '--d': index }}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost markets-cta" onClick={openTerminal} data-reveal>
            <span>{t('markets.live.cta')}</span>
            <ArrowIcon />
          </button>
        </div>
      </div>
    </section>
  )
}

export default MarketSection
