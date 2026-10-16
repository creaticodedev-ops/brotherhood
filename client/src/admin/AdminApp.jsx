import './admin.css'
import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { adminApi, UNAUTHORIZED_EVENT } from './api'
import { Dashboard } from './Dashboard'
import { Login } from './Login'
import { ResetPassword } from './ResetPassword'
import { useAdminText } from './strings'

const isResetPath = () => /^\/admin\/reset\/?$/.test(window.location.pathname)

const useNoIndex = () => {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.append(meta)
    return () => meta.remove()
  }, [])
}

/** Session gate: checks the httpOnly admin cookie, then shows the login screen or the dashboard. */
export const AdminApp = () => {
  const a = useAdminText()
  const { locale } = useI18n()
  const [session, setSession] = useState({ state: 'checking', configured: true })
  const [resetView, setResetView] = useState(isResetPath)
  const [loginMode, setLoginMode] = useState('login')

  useNoIndex()

  // Once signed in, the dashboard owns the title (it adds the unread count).
  useEffect(() => {
    if (session.state !== 'in' || resetView) document.title = a('meta.title')
  }, [a, locale, session.state, resetView])

  useEffect(() => {
    const onPop = () => setResetView(isResetPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const leaveReset = (mode, signedOut) => {
    window.history.replaceState(null, '', '/admin')
    if (signedOut) setSession((prev) => ({ ...prev, state: 'out' }))
    setLoginMode(mode)
    setResetView(false)
  }

  const check = useCallback(async () => {
    try {
      const data = await adminApi.session()
      setSession({ state: data.authenticated ? 'in' : 'out', configured: data.configured })
    } catch {
      setSession({ state: 'out', configured: true, offline: true })
    }
  }, [])

  useEffect(() => {
    check()
    const onUnauthorized = () => setSession((prev) => ({ ...prev, state: 'out' }))
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [check])

  const logout = useCallback(async () => {
    await adminApi.logout().catch(() => {})
    setSession((prev) => ({ ...prev, state: 'out' }))
  }, [])

  if (resetView) {
    return <ResetPassword onDone={(signedOut) => leaveReset('login', signedOut)} onRequestNew={() => leaveReset('forgot', session.state === 'in')} />
  }

  if (session.state === 'checking') {
    return (
      <div className="adm-boot" role="status" aria-label={a('login.checking')}>
        <span />
      </div>
    )
  }

  return session.state === 'in' ? (
    <Dashboard onLogout={logout} />
  ) : (
    <Login key={loginMode} configured={session.configured} initialMode={loginMode} onSuccess={() => setSession({ state: 'in', configured: true })} />
  )
}

export default AdminApp
