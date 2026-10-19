import { Component } from 'react'
import { isChunkError, reloadOnce } from './recovery'

const COPY = {
  fr: { title: 'Le chargement a été interrompu.', body: 'Votre connexion a peut-être coupé, ou le site vient d’être mis à jour.', action: 'Recharger la page' },
  en: { title: 'Loading was interrupted.', body: 'Your connection may have dropped, or the site was just updated.', action: 'Reload the page' },
  ar: { title: 'توقف التحميل.', body: 'ربما انقطع اتصالك أو تم تحديث الموقع للتو.', action: 'إعادة تحميل الصفحة' },
}

/** Last line of defence: any render error shows a way out instead of a blank page. */
export class AppBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (isChunkError(error)) reloadOnce()
  }

  render() {
    if (!this.state.error) return this.props.children
    const lang = (document.documentElement.lang || 'fr').slice(0, 2)
    const copy = COPY[lang] || COPY.fr
    return (
      <main className="app-recover" role="alert" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <p className="app-recover-brand">The Brotherhood</p>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <button type="button" className="app-recover-action" onClick={() => window.location.reload()}>
          {copy.action}
        </button>
      </main>
    )
  }
}
