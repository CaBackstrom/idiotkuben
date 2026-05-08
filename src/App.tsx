import { useState, useEffect } from 'react'
import { loadSession, clearSession } from './persistence/session'
import { type Route } from './pages/routes'
import DemoPage from './components/DemoPage'
import LandingPage from './pages/LandingPage'
import ContinuePrompt from './components/ContinuePrompt'
import StorageBanner from './components/StorageBanner'
import InputPage from './pages/InputPage'
import SolvePage from './pages/SolvePage'
import LevelPage from './pages/LevelPage'

function pathToRoute(path: string): Route {
  if (path === '/level') return '/level'
  if (path === '/input') return '/input'
  if (path === '/solve') return '/solve'
  if (path === '/demo') return '/demo'
  return '/'
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => pathToRoute(window.location.pathname))
  const [session, setSession] = useState(() => loadSession())

  useEffect(() => {
    function onPopState() {
      const r = pathToRoute(window.location.pathname)
      setRoute(r)
      if (r === '/') setSession(loadSession())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function navigate(r: Route) {
    window.history.pushState(null, '', r)
    setRoute(r)
    if (r === '/') setSession(loadSession())
    if (r === '/level') setSession(loadSession())
  }

  function handleFresh() {
    clearSession()
    setSession(null)
    window.history.replaceState(null, '', '/')
    setRoute('/')
  }

  return (
    <>
      <StorageBanner />
      {route === '/' && (
        session ? (
          <ContinuePrompt
            session={session}
            navigate={navigate}
            onFresh={handleFresh}
          />
        ) : (
          <LandingPage navigate={navigate} />
        )
      )}
      {route === '/demo' && <DemoPage />}
      {route === '/level' && <LevelPage navigate={navigate} />}
      {route === '/input' && <InputPage navigate={navigate} />}
      {route === '/solve' && <SolvePage navigate={navigate} />}
    </>
  )
}
