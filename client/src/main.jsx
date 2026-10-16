import './styles/global.css'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from './i18n/I18nProvider'
import { LandingPage } from './landing/LandingPage'

const AdminApp = lazy(() => import('./admin/AdminApp'))

const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname)

// Public single-page site: every other unknown path resolves to the landing page.
if (!isAdmin && window.location.pathname !== '/') {
  window.history.replaceState(null, '', `/${window.location.hash}`)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? (
      <I18nProvider titleKey={null}>
        <Suspense fallback={null}>
          <AdminApp />
        </Suspense>
      </I18nProvider>
    ) : (
      <I18nProvider>
        <LandingPage />
      </I18nProvider>
    )}
  </StrictMode>,
)
