import { useState, useEffect } from 'react'
import { loadSession, clearSession } from './persistence/session'
import { type Route } from './pages/routes'
import DemoPage from './components/DemoPage'
import ContinuePrompt from './components/ContinuePrompt'
import StorageBanner from './components/StorageBanner'
import InputPage from './pages/InputPage'
import SolvePage from './pages/SolvePage'
import LevelPage from './pages/LevelPage'
import { sv } from './i18n/sv'

function pathToRoute(path: string): Route {
  if (path === '/level') return '/level'
  if (path === '/input') return '/input'
  if (path === '/solve') return '/solve'
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
          <div>
            <div className="bg-[var(--bg)] px-6 pt-8 pb-4 font-sans max-w-2xl">
              <h1
                className="text-4xl font-bold text-[var(--fg)] leading-tight mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Idiotkuben
              </h1>
              <p className="text-base text-[var(--muted)] mb-5">
                Lär dig lösa en Rubiks kub — ett drag i taget.
              </p>
              <button
                onClick={() => navigate('/level')}
                className="px-5 py-2.5 text-sm font-semibold bg-[var(--accent)] text-white rounded hover:opacity-90 transition-opacity"
              >
                {sv.demo.trySolver}
              </button>
            </div>
            <DemoPage />
          </div>
        )
      )}
      {route === '/level' && <LevelPage navigate={navigate} />}
      {route === '/input' && <InputPage navigate={navigate} />}
      {route === '/solve' && <SolvePage navigate={navigate} />}
    </>
  )
}
