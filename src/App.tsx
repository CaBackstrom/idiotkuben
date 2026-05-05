import { useState } from 'react'
import { loadSession, clearSession } from './persistence/session'
import { type Route } from './pages/routes'
import DemoPage from './components/DemoPage'
import ContinuePrompt from './components/ContinuePrompt'
import StorageBanner from './components/StorageBanner'
import InputPage from './pages/InputPage'
import SolvePage from './pages/SolvePage'
import { sv } from './i18n/sv'

export default function App() {
  const [route, setRoute] = useState<Route>('/')
  const [session, setSession] = useState(() => loadSession())

  function navigate(r: Route) {
    setRoute(r)
  }

  function handleFresh() {
    clearSession()
    setSession(null)
    setRoute('/')
  }

  return (
    <>
      <StorageBanner />
      {route === '/' && (
        session ? (
          <ContinuePrompt
            session={session}
            navigate={(r) => { setRoute(r) }}
            onFresh={handleFresh}
          />
        ) : (
          <div>
            <div className="bg-[#FAFAF7] px-6 pt-4 pb-0 font-sans">
              <button
                onClick={() => navigate('/input')}
                className="text-sm text-gray-600 hover:text-[#1A1A1A] underline underline-offset-2 transition-colors"
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
