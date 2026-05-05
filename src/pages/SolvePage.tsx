import { useState, useEffect } from 'react'
import { loadSession, saveSession } from '../persistence/session'
import { solveFromState } from '../solver/solve'
import { sliceIntoPhases, type Phase } from '../solver/phases'
import { sv } from '../i18n/sv'
import SolutionPlayer from '../components/SolutionPlayer'
import { type Navigate } from './routes'

type Props = {
  navigate: Navigate
}

export default function SolvePage({ navigate }: Props) {
  const [phases, setPhases] = useState<Phase[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const session = loadSession()

  useEffect(() => {
    if (!session) {
      setLoading(false)
      setError(sv.solve.noSession)
      return
    }

    setLoading(true)
    // setTimeout lets React render the loading indicator before the blocking solve call
    const timer = setTimeout(() => {
      try {
        const moves = solveFromState(session.cubeState)
        const sliced = sliceIntoPhases(session.cubeState, moves)
        saveSession({ ...session, solution: moves })
        setPhases(sliced)
      } catch (e) {
        setError(sv.solve.error + ' ' + String(e))
      } finally {
        setLoading(false)
      }
    }, 50)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center text-[#1A1A1A] font-sans">
        <p className="text-sm text-gray-500">{sv.solve.loading}</p>
      </div>
    )
  }

  if (error || !session || !phases) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex flex-col items-center justify-center gap-4 text-[#1A1A1A] font-sans p-6">
        <p className="text-sm text-red-700">{error ?? sv.solve.noSession}</p>
        <button
          onClick={() => navigate('/input')}
          className="px-4 py-2 text-sm bg-[#1A1A1A] text-white rounded hover:bg-[#333] transition-colors"
        >
          {sv.solve.goToInput}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#1A1A1A] p-6 font-sans">
      <SolutionPlayer initialState={session.cubeState} phases={phases} />
    </div>
  )
}
