import { useState, useEffect } from 'react'
import { loadSession, saveSession } from '../persistence/session'
import { solveFromState } from '../solver/solve'
import { solveLayerByLayerPhases } from '../solver/lbl'
import { sliceIntoPhases, type Phase } from '../solver/phases'
import { useLanguage } from '../context/LanguageContext'
import SolutionPlayer from '../components/SolutionPlayer'
import TopNav from '../components/TopNav'
import ProgressStrip from '../components/layout/ProgressStrip'
import { type Navigate } from './routes'
import { track } from '../utils/telemetry'

type Props = {
  navigate: Navigate
}

export default function SolvePage({ navigate }: Props) {
  const { t } = useLanguage()
  const [phases, setPhases] = useState<Phase[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [solverMode, setSolverMode] = useState<'guided' | 'quick'>('quick')
  const [currentPhase, setCurrentPhase] = useState(1)
  const [totalPhases, setTotalPhases] = useState(4)

  const session = loadSession()

  useEffect(() => {
    if (!session) {
      setLoading(false)
      setError(t('solve.noSession'))
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
        setTotalPhases(sliced.length)
        setPhases(sliced)
      } catch (e) {
        setError(t('solve.error') + ' ' + String(e))
      } finally {
        setLoading(false)
      }
    }, 50)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] font-sans flex flex-col">
        <TopNav navigate={navigate} onBack={() => navigate('/input')} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[var(--muted)] animate-pulse">{t('solve.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !session || !phases) {
    return (
      <div className="min-h-screen bg-[var(--bg)] font-sans flex flex-col">
        <TopNav navigate={navigate} onBack={() => navigate('/input')} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--fg)] p-6">
          <p className="text-sm text-[var(--accent)]">{error ?? t('solve.noSession')}</p>
          <button
            onClick={() => navigate('/input')}
            className="px-4 py-2 text-sm bg-[var(--fg)] text-white rounded hover:opacity-80 active:scale-[0.97] transition-all duration-150"
          >
            {t('solve.goToInput')}
          </button>
        </div>
      </div>
    )
  }

  const rightLabel = solverMode === 'quick'
    ? t('phases.optimal')
    : `${t('solve.phase')} ${currentPhase} ${t('solve.of')} ${totalPhases}`

  const progressPct = ((currentPhase - 1) / totalPhases) * 100

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-sans">
      <TopNav navigate={navigate} onBack={() => navigate('/input')} right={rightLabel} />
      <ProgressStrip pct={progressPct} />
      <div className="p-4 sm:p-6">
        <SolutionPlayer
          initialState={session.cubeState}
          phases={phases}
          mode={solverMode}
          navigate={navigate}
          onPhaseChange={setCurrentPhase}
        />
      </div>
    </div>
  )
}
