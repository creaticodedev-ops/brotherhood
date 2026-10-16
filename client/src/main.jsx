import './styles/global.css'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nProvider } from './i18n/I18nProvider'
import { SiteApp } from './site/SiteApp'

const AdminApp = lazy(() => import('./admin/AdminApp'))

const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname)

// Public routes are handled inside SiteApp. Unknown paths render the site 404.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? (
      <I18nProvider titleKey={null}>
        <Suspense fallback={null}>
          <AdminApp />
        </Suspense>
      </I18nProvider>
    ) : (
      <I18nProvider titleKey={null}>
        <SiteApp />
      </I18nProvider>
    )}
  </StrictMode>,
)
