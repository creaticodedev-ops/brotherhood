import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider'
import { LangSwitch, Logo } from '../landing/ui'
import { adminApi } from './api'
import { ApplicationDrawer } from './ApplicationDrawer'
import { Applications } from './Applications'
import { AuditDesk } from './AuditDesk'
import { CaisseDesk } from './CaisseDesk'
import { CommandHome } from './CommandHome'
import { MissionsDesk } from './MissionsDesk'
import { TeamDesk } from './TeamDesk'
import { formatCount } from './format'
import { ContentDesk } from './ContentDesk'
import { ApplicationsIcon, BellIcon, CloseIcon, ContentIcon, ExternalIcon, LogoutIcon, MenuIcon, OverviewIcon, SettingsIcon } from './icons'
import { NotificationPanel, Toasts } from './NotificationCenter'
import { RegistrationDesk } from './RegistrationDesk'
import { Settings } from './Settings'
import { useAdminText } from './strings'
import { useAdminStream } from './useAdminStream'
import { useNotifications } from './useNotifications'

const ID = /^[a-f0-9]{24}$/i
const REFRESH_BATCH_MS = 150

const VIEW_PATHS = {
  overview: '/admin',
  applications: '/admin/applications',
  missions: '/admin/missions',
  caisse: '/admin/caisse',
  team: '/admin/team',
  audit: '/admin/audit',
  content: '/admin/content',
  registration: '/admin/registration',
  settings: '/admin/settings',
}

const readRoute = () => {
  const { pathname, search } = window.location
  const id = new URLSearchParams(search).get('open')
  const view = Object.keys(VIEW_PATHS).find((key) => key !== 'overview' && new RegExp(`^${VIEW_PATHS[key]}/?$`).test(pathname)) || 'overview'
  return { view, id: id && ID.test(id) ? id : null }
}

const pathFor = ({ view, id }) => `${VIEW_PATHS[view] || VIEW_PATHS.overview}${id ? `?open=${id}` : ''}`

const useStats = (version) => {
  const [state, setState] = useState({ data: null, error: null })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .stats(controller.signal)
      .then((data) => setState({ data, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState((prev) => ({ ...prev, error }))
      })
    return () => controller.abort()
  }, [version, attempt])
  return { ...state, retry: useCallback(() => setAttempt((n) => n + 1), []) }
}

export const Dashboard = ({ onLogout }) => {
  const a = useAdminText()
  const { locale } = useI18n()
  const [route, setRoute] = useState(readRoute)
  const [version, setVersion] = useState(0)
  const [fresh, setFresh] = useState(() => new Set())
  const [toasts, setToasts] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [actor, setActor] = useState(null)
  const center = useNotifications()
  const stats = useStats(version)
  const { add: addNotification, sync: syncNotifications, reload: reloadNotifications, setRead, unread } = center

  const navigate = useCallback((next, replace = false) => {
    const path = pathFor(next)
    if (path !== `${window.location.pathname}${window.location.search}`) window.history[replace ? 'replaceState' : 'pushState'](null, '', path)
    setRoute(next)
    setMenuOpen(false)
  }, [])

  useEffect(() => {
    adminApi.session().then(setActor).catch(() => {})
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.view])

  useEffect(() => {
    const current = readRoute()
    if (pathFor(current) !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', pathFor(current))
    const onPop = () => setRoute(readRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const title = a('meta.title')
    document.title = unread ? `(${unread > 99 ? '99+' : unread}) ${title}` : title
  }, [a, unread, locale])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (event) => event.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const refreshTimer = useRef(0)
  const refresh = useCallback(() => {
    clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => setVersion((n) => n + 1), REFRESH_BATCH_MS)
  }, [])

  useEffect(() => () => clearTimeout(refreshTimer.current), [])

  const live = useAdminStream((type, data) => {
    if (type === 'registration') {
      addNotification(data.notification)
      setToasts((list) => [{ id: data.notification.id, notification: data.notification }, ...list.filter((item) => item.id !== data.notification.id)])
      setFresh((set) => new Set(set).add(data.application.id))
      refresh()
    } else if (type === 'application') {
      refresh()
    } else if (type === 'notifications') {
      syncNotifications(data)
    } else if (type === 'resync') {
      refresh()
      reloadNotifications()
    }
  })

  const openApplication = useCallback(
    (id) => {
      setPanelOpen(false)
      navigate({ view: route.view, id })
    },
    [navigate, route.view],
  )

  const dismissToast = useCallback((id) => setToasts((list) => list.filter((item) => item.id !== id)), [])

  const openToast = useCallback(
    (toast) => {
      dismissToast(toast.id)
      if (!toast.notification.read) setRead(toast.notification.id, true)
      openApplication(toast.notification.registration)
    },
    [setRead, dismissToast, openApplication],
  )

  const pendingCount = (stats.data?.statuses?.pending.count || 0) + (stats.data?.statuses?.new.count || 0)
  const permit = (permission) => !actor || actor.role === 'admin' || actor.permissions?.includes('*') || actor.permissions?.includes(permission)
  const show = {
    applications: permit('recruitment.review') || permit('recruitment.decide'),
    missions: true,
    caisse: permit('finance.record') || permit('finance.approve'),
    team: !actor || actor.role === 'admin',
    audit: !actor || actor.role === 'admin',
    content: !actor || actor.role === 'admin',
    settings: !actor || actor.role === 'admin',
    registration: !actor || actor.role === 'admin',
  }

  const navLink = (view, Icon, extra = null) => (
    <a
      href={pathFor({ view })}
      className="adm-nav-link"
      aria-current={route.view === view ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault()
        navigate({ view })
      }}
    >
      <Icon />
      <span>{a(`nav.${view}`)}</span>
      {extra}
    </a>
  )

  return (
    <div className={`adm${menuOpen ? ' is-menu' : ''}`}>
      <aside className="adm-side" id="adm-side" aria-label={a('nav.primary')}>
        <div className="adm-side-top">
          <a
            href="/admin"
            className="adm-side-logo"
            onClick={(event) => {
              event.preventDefault()
              navigate({ view: 'overview' })
            }}
          >
            <Logo eager />
          </a>
          <button type="button" className="adm-icon-btn adm-side-close" onClick={() => setMenuOpen(false)} aria-label={a('nav.close')}>
            <CloseIcon />
          </button>
        </div>
        <p className="adm-side-label">{a('brand')}</p>

        <nav className="adm-nav">
          {navLink('overview', OverviewIcon)}
          {show.applications ? navLink('applications', ApplicationsIcon, pendingCount ? <span className="adm-count">{formatCount(pendingCount, locale)}</span> : null) : null}
          {show.missions ? navLink('missions', ContentIcon) : null}
          {show.caisse ? navLink('caisse', SettingsIcon) : null}
          {show.team ? navLink('team', ApplicationsIcon) : null}
          {show.audit ? navLink('audit', BellIcon) : null}
          {show.content ? navLink('content', ContentIcon) : null}
          <button
            type="button"
            className="adm-nav-link"
            onClick={() => {
              setMenuOpen(false)
              setPanelOpen(true)
            }}
          >
            <BellIcon />
            <span>{a('nav.notifications')}</span>
            {unread ? <span className="adm-count is-alert">{formatCount(unread, locale)}</span> : null}
          </button>
          {show.registration ? navLink('registration', SettingsIcon) : null}
          {navLink('settings', SettingsIcon)}
        </nav>

        <div className="adm-side-foot">
          <div className="adm-side-lang">
            <span>{a('nav.language')}</span>
            <LangSwitch />
          </div>
          <a className="adm-nav-link is-quiet" href="/" target="_blank" rel="noopener noreferrer">
            <ExternalIcon />
            <span>{a('nav.site')}</span>
          </a>
          <button type="button" className="adm-nav-link is-quiet" onClick={onLogout}>
            <LogoutIcon />
            <span>{a('nav.logout')}</span>
          </button>
        </div>
      </aside>
      <div className="adm-side-scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <div className="adm-main">
        <header className="adm-top">
          <button
            type="button"
            className="adm-icon-btn adm-burger"
            onClick={() => setMenuOpen(true)}
            aria-label={a('nav.open')}
            aria-expanded={menuOpen}
            aria-controls="adm-side"
          >
            <MenuIcon />
          </button>
          <a
            href="/admin"
            className="adm-top-logo"
            onClick={(event) => {
              event.preventDefault()
              navigate({ view: 'overview' })
            }}
          >
            <Logo />
          </a>
          <p className="adm-crumb">
            <span>{a('brand')}</span>
            <span aria-hidden="true">/</span>
            <strong>{a(`nav.${route.view}`)}</strong>
          </p>
          <p className={`adm-live${live ? ' is-on' : ''}`} role="status">
            <i aria-hidden="true" />
            <span>{a(live ? 'live.on' : 'live.off')}</span>
          </p>
          <button
            type="button"
            className={`adm-icon-btn adm-bell${unread ? ' has-unread' : ''}`}
            onClick={() => setPanelOpen(true)}
            aria-label={a('notifications.bell', { n: unread })}
            aria-haspopup="dialog"
            aria-expanded={panelOpen}
          >
            <BellIcon />
            {unread ? (
              <span className="adm-badge" key={unread}>
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </button>
        </header>

        <main className="adm-content" id="main">
          {route.view === 'settings' && show.settings ? (
            <Settings />
          ) : route.view === 'registration' && show.registration ? (
            <RegistrationDesk />
          ) : route.view === 'content' && show.content ? (
            <ContentDesk />
          ) : route.view === 'applications' && show.applications ? (
            <Applications version={version} fresh={fresh} onOpen={openApplication} onChanged={refresh} canDelete={actor?.role === 'admin'} />
          ) : route.view === 'missions' ? (
            <MissionsDesk />
          ) : route.view === 'caisse' && show.caisse ? (
            <CaisseDesk />
          ) : route.view === 'team' && show.team ? (
            <TeamDesk />
          ) : route.view === 'audit' && show.audit ? (
            <AuditDesk />
          ) : (
            <CommandHome stats={stats.data} error={stats.error} onRetry={stats.retry} onOpen={openApplication} onNavigate={(view) => navigate({ view })} />
          )}
        </main>
      </div>

      {route.id ? <ApplicationDrawer id={route.id} version={version} onClose={() => navigate({ view: route.view })} onChanged={refresh} /> : null}

      <NotificationPanel open={panelOpen} center={center} onClose={() => setPanelOpen(false)} onOpenApplication={openApplication} />
      <Toasts toasts={toasts} onOpen={openToast} onDismiss={dismissToast} />
    </div>
  )
}
