import { useState, useEffect } from 'react'
import { loadSession, saveSession } from '../persistence/session'
import { solveFromState } from '../solver/solve'
import { solveLayerByLayerPhases } from '../solver/lbl'
import { sliceIntoPhases, type Phase } from '../solver/phases'
import { sv } from '../i18n/sv'
import SolutionPlayer from '../components/SolutionPlayer'
import { type Navigate } from './routes'
import { track } from '../utils/telemetry'

type Props = {
  navigate: Navigate
}

export default function SolvePage({ navigate }: Props) {
  const [phases, setPhases] = useState<Phase[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [solverMode, setSolverMode] = useState<'guided' | 'quick'>('quick')

  const session = loadSession()

  useEffect(() => {
    if (!session) {
      setLoading(false)
      setError(sv.solve.noSession)
      return
    }

    const level = session.level
    setSolverMode(level === 'guided' ? 'guided' : 'quick')
    setLoading(true)

    const timer = setTimeout(() => {
      try {
        let sliced: Phase[]
        let moves: ReturnType<typeof solveFromState>
        if (level === 'guided') {
          const lblPhases = solveLayerByLayerPhases(session.cubeState)
          sliced = lblPhases
          moves = lblPhases.flatMap(p => p.moves)
        } else {
          moves = solveFromState(session.cubeState)
          sliced = sliceIntoPhases(session.cubeState, moves)
        }
        saveSession({ ...session, solution: moves })
        track('solve_started')
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
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--fg)] font-sans">
        <p className="text-sm text-[var(--muted)]">{sv.solve.loading}</p>
      </div>
    )
  }

  if (error || !session || !phases) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-4 text-[var(--fg)] font-sans p-6">
        <p className="text-sm text-[var(--accent)]">{error ?? sv.solve.noSession}</p>
        <button
          onClick={() => navigate('/input')}
          className="px-4 py-2 text-sm bg-[var(--fg)] text-white rounded hover:opacity-80 transition-opacity"
        >
          {sv.solve.goToInput}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] p-4 sm:p-6 font-sans">
      <SolutionPlayer
        initialState={session.cubeState}
        phases={phases}
        mode={solverMode}
      />
    </div>
  )
}
