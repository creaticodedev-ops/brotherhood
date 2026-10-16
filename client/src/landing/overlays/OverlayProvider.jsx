import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { OverlayContext } from './context'
import { Dialog } from './Dialog'
import './overlays.css'

const MarketTerminal = lazy(() => import('../../market/MarketTerminal'))
const RegistrationForm = lazy(() => import('./RegistrationForm'))

const Loading = ({ label }) => (
  <div className="overlay-loading" role="status">
    <span aria-hidden="true" />
    {label}
  </div>
)

export const OverlayProvider = ({ children }) => {
  const { t } = useI18n()
  const [overlay, setOverlay] = useState(null)

  const openTerminal = useCallback(() => setOverlay({ type: 'terminal' }), [])
  const openRegistration = useCallback((offer) => setOverlay({ type: 'register', offer }), [])
  const onClosed = useCallback(() => setOverlay(null), [])
  const value = useMemo(() => ({ openTerminal, openRegistration }), [openTerminal, openRegistration])

  return (
    <OverlayContext.Provider value={value}>
      {children}
      {overlay?.type === 'terminal' ? (
        <Dialog variant="terminal" labelledBy="terminal-title" onClosed={onClosed}>
          {(close) => (
            <Suspense fallback={<Loading label={t('terminal.loading')} />}>
              <MarketTerminal onClose={close} />
            </Suspense>
          )}
        </Dialog>
      ) : null}
      {overlay?.type === 'register' ? (
        <Dialog variant="sheet" labelledBy="register-title" onClosed={onClosed}>
          {(close) => (
            <Suspense fallback={<Loading label={t('register.loading')} />}>
              <RegistrationForm initialOffer={overlay.offer} onClose={close} />
            </Suspense>
          )}
        </Dialog>
      ) : null}
    </OverlayContext.Provider>
  )
}

export default OverlayProvider
