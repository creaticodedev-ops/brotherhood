import { useI18n } from '../../i18n/I18nProvider'
import { SectionIntro } from '../ui'

export const WhyUSBonds = () => {
  const { t, tm } = useI18n()
  const items = tm('why.items') || []

  return (
    <section className="section why is-light" id="why" aria-labelledby="why-title">
      <div className="container">
        <SectionIntro kicker={t('why.kicker')} title={t('why.title')} titleId="why-title" />
        <ul className="why-grid">
          {items.map((item, index) => (
            <li key={index} className="why-item" data-reveal style={{ '--d': index % 3 }}>
              <span className="why-mark" aria-hidden="true" />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default WhyUSBonds
