import { useI18n } from '../../i18n/I18nProvider'
import { SectionIntro } from '../ui'

export const Approach = () => {
  const { t, tm } = useI18n()
  const items = tm('approach.items') || []

  return (
    <section className="section approach is-light" id="approach" aria-labelledby="approach-title">
      <div className="container approach-grid">
        <SectionIntro kicker={t('approach.kicker')} title={t('approach.title')} lead={t('approach.lead')} titleId="approach-title" />
        <dl className="approach-list">
          {items.map((item, index) => (
            <div key={index} className="approach-item" data-reveal style={{ '--d': index }}>
              <dt>{item.title}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export default Approach
