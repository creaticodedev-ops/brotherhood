import './styles/fonts.css'
import './styles/global.css'
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { AppBoundary } from './AppBoundary'
import { I18nProvider } from './i18n/I18nProvider'
import { reloadOnce } from './recovery'
import { SiteApp } from './site/SiteApp'

const AdminApp = lazy(() => import('./admin/AdminApp'))

// A tab opened before a deployment asks for code files that no longer exist: reload once to get the new ones.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnce()) event.preventDefault()
})

const onVercelHost = window.location.hostname.endsWith('.vercel.app')
if (onVercelHost) {
  window.location.replace(`https://www.brotherhood07.com${window.location.pathname}${window.location.search}${window.location.hash}`)
}

const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname)

// Public routes are handled inside SiteApp. Unknown paths render the site 404.

if (!onVercelHost) createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppBoundary>
      {isAdmin ? (
        <I18nProvider titleKey={null}>
          <Suspense fallback={<div className="app-boot" aria-hidden="true" />}>
            <AdminApp />
          </Suspense>
        </I18nProvider>
      ) : (
        <I18nProvider titleKey={null}>
          <SiteApp />
        </I18nProvider>
      )}
    </AppBoundary>
  </StrictMode>,
)
