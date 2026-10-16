import { useI18n } from '../../i18n/I18nProvider'
import { SectionIntro } from '../ui'
import { PathsVisual } from '../visuals/PathsVisual'

const OPERATORS = ['+', '+', '=']

export const CapitalSection = () => {
  const { t, tm } = useI18n()
  const terms = tm('capital.terms') || []

  return (
    <section className="section capital" id="capital" aria-labelledby="capital-title">
      <div className="container">
        <SectionIntro
          kicker={t('capital.kicker')}
          title={t('capital.title')}
          lead={t('capital.lead')}
          titleId="capital-title"
        />

        <ol className="equation">
          {terms.map((term, index) => (
            <li
              key={index}
              className={`equation-term${index === terms.length - 1 ? ' is-result' : ''}`}
              data-reveal
              style={{ '--d': index }}
              data-op={OPERATORS[index]}
            >
              <h3>{term.title}</h3>
              <p>{term.text}</p>
            </li>
          ))}
        </ol>

        <figure className="paths" data-reveal>
          <figcaption className="paths-head">
            <span className="tag">{t('common.illustration')}</span>
            <strong>{t('capital.chartTitle')}</strong>
          </figcaption>
          <PathsVisual label={t('capital.chartAria')} start={t('capital.axisStart')} end={t('capital.axisEnd')} />
          <p className="fine-print">{t('capital.chartNote')}</p>
        </figure>
      </div>
    </section>
  )
}

export default CapitalSection
