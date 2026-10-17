import { useEffect, useState } from 'react'
import '../landing/landing.css'
import '../landing/hero.css'
import './site.css'
import { Home } from './Home'
import { Join } from './Join'
import { Recruit } from './Recruit'
import { About, Archive, Creative, NotFound, Privacy, SocialPage, StoryPage } from './Pages'
import { Footer, Nav, useCopy } from './ui'

const match = (pathname) => {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { name: 'home', path }
  if (path === '/about') return { name: 'about', path }
  if (path === '/missions') return { name: 'missions', path }
  if (path === '/activities') return { name: 'activities', path }
  if (path === '/creative') return { name: 'creative', path }
  if (path === '/social') return { name: 'social', path }
  if (path === '/join') return { name: 'join', path }
  if (path === '/recruit') return { name: 'recruit', path }
  if (path === '/privacy') return { name: 'privacy', path }
  const mission = path.match(/^\/missions\/([a-z0-9-]+)$/)
  if (mission) return { name: 'story', path, slug: mission[1] }
  const activity = path.match(/^\/activities\/([a-z0-9-]+)$/)
  if (activity) return { name: 'story', path, slug: activity[1] }
  return { name: 'missing', path }
}

export const SiteApp = () => {
  const { pack } = useCopy()
  const [route, setRoute] = useState(() => match(window.location.pathname))

  useEffect(() => {
    const onPop = () => setRoute(match(window.location.pathname))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.path])

  let page = <NotFound />
  if (route.name === 'home') page = <Home />
  if (route.name === 'about') page = <About />
  if (route.name === 'missions') page = <Archive kind="mission" />
  if (route.name === 'activities') page = <Archive kind="activity" />
  if (route.name === 'story') page = <StoryPage key={route.slug} slug={route.slug} />
  if (route.name === 'creative') page = <Creative />
  if (route.name === 'social') page = <SocialPage />
  if (route.name === 'join') page = <Join />
  if (route.name === 'privacy') page = <Privacy />
  if (route.name === 'recruit') {
    return (
      <div className="bh">
        <a className="skip-link" href="#main">
          {pack.a11y.skip}
        </a>
        <main id="main" tabIndex={-1}>
          <Recruit />
        </main>
      </div>
    )
  }

  return (
    <div className="bh">
      <a className="skip-link" href="#main">
        {pack.a11y.skip}
      </a>
      <Nav path={route.path} />
      <main id="main" tabIndex={-1}>
        <div key={route.path} className="page-swap">
          {page}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default SiteApp
