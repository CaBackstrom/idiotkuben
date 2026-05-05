import { useState, useEffect } from 'react'
import { loadSession, clearSession } from './persistence/session'
import { type Route } from './pages/routes'
import DemoPage from './components/DemoPage'
import ContinuePrompt from './components/ContinuePrompt'
import StorageBanner from './components/StorageBanner'
import InputPage from './pages/InputPage'
import SolvePage from './pages/SolvePage'
import { sv } from './i18n/sv'

function pathToRoute(path: string): Route {
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
            <div className="bg-[#FAFAF7] px-6 pt-6 pb-0 font-sans">
              <button
                onClick={() => navigate('/input')}
                className="px-5 py-2.5 text-sm font-semibold bg-[#1A1A1A] text-white rounded hover:bg-[#333] transition-colors"
              >
                {sv.demo.trySolver}
              </button>
            </div>
            <DemoPage />
          </div>
        )
      )}
      {route === '/input' && <InputPage navigate={navigate} />}
      {route === '/solve' && <SolvePage navigate={navigate} />}
    </>
  )
}
