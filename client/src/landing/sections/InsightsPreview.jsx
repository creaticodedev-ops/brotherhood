import { useI18n } from '../../i18n/I18nProvider'
import { SectionIntro } from '../ui'

export const InsightsPreview = () => {
  const { t, tm } = useI18n()
  const items = tm('insights.items') || []

  return (
    <section className="section insights" id="insights" aria-labelledby="insights-title">
      <div className="container">
        <SectionIntro kicker={t('insights.kicker')} title={t('insights.title')} lead={t('insights.lead')} titleId="insights-title" />
        <ul className="insights-grid">
          {items.map((item, index) => (
            <li key={index} className="insight" data-reveal style={{ '--d': index }}>
              <article>
                <div className="insight-meta">
                  <span className="insight-tag">{item.tag}</span>
                  <span className="tag">{t('common.soon')}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="insight-rule" aria-hidden="true" />
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default InsightsPreview
