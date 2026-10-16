import { useI18n } from '../../i18n/I18nProvider'
import { SectionIntro } from '../ui'

export const HowItWorks = () => {
  const { t, tm } = useI18n()
  const steps = tm('how.steps') || []

  return (
    <section className="section how" id="how" aria-labelledby="how-title">
      <div className="container">
        <SectionIntro kicker={t('how.kicker')} title={t('how.title')} titleId="how-title" />
        <ol className="steps">
          {steps.map((step, index) => (
            <li key={index} className="step" data-reveal style={{ '--d': index }}>
              <span className="step-num">{String(index + 1).padStart(2, '0')}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default HowItWorks
