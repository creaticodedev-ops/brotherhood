import { useI18n } from '../../i18n/I18nProvider'
import { useOverlay } from '../overlays/context'
import { ArrowIcon, SectionIntro } from '../ui'
import { ServiceGlyph } from '../visuals/ServiceGlyph'

const GLYPHS = ['gold', 'invest', 'education', 'analysis']
const TERMINAL_INDEX = 3

export const Services = () => {
  const { t, tm } = useI18n()
  const { openTerminal } = useOverlay()
  const items = tm('services.items') || []

  return (
    <section className="section services" id="services" aria-labelledby="services-title">
      <div className="container">
        <SectionIntro
          kicker={t('services.kicker')}
          title={t('services.title')}
          lead={t('services.lead')}
          titleId="services-title"
        />
        <ol className="services-list">
          {items.map((item, index) => (
            <li
              key={index}
              className={`service${index === TERMINAL_INDEX ? ' is-action' : ''}`}
              data-reveal
              style={{ '--d': index }}
            >
              <span className="service-index">{String(index + 1).padStart(2, '0')}</span>
              <ServiceGlyph name={GLYPHS[index]} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              {index === TERMINAL_INDEX ? (
                <button type="button" className="service-action" onClick={openTerminal}>
                  <span className="service-live" aria-hidden="true" />
                  <span>{t('services.terminalCta')}</span>
                  <ArrowIcon />
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default Services
