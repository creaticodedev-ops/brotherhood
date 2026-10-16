import { useI18n } from '../../i18n/I18nProvider'

export const Intro = () => {
  const { t, tm } = useI18n()
  const items = tm('intro.items') || []

  return (
    <section className="section intro is-light" id="about" aria-labelledby="intro-title">
      <div className="container intro-grid">
        <div data-reveal>
          <p className="kicker">{t('intro.kicker')}</p>
          <h2 className="intro-statement" id="intro-title">
            {t('intro.statement')}
          </h2>
        </div>
        <dl className="intro-list">
          {items.map((item, index) => (
            <div key={index} className="intro-item" data-reveal style={{ '--d': index }}>
              <dt>{item.title}</dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

export default Intro
