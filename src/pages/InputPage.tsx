import { useState } from 'react'
import { type CubeState } from '../cube/CubeState'
import { isValidCubeState } from '../cube/validate'
import { saveSession } from '../persistence/session'
import { sv } from '../i18n/sv'
import ColorInput from '../components/ColorInput'
import { type Navigate } from './routes'

type Props = {
  navigate: Navigate
}

export default function InputPage({ navigate }: Props) {
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(state: CubeState) {
    setError(null)
    const result = isValidCubeState(state)
    if (!result.valid) {
      setError(result.reason ?? sv.input.invalid)
      return
    }
    const rawLevel = localStorage.getItem('idiotkuben:pendingLevel')
    const level: 'guided' | 'quick' = rawLevel === 'guided' ? 'guided' : 'quick'
    localStorage.removeItem('idiotkuben:pendingLevel')
    saveSession({
      version: 1,
      level,
      cubeState: state,
      solution: [],
      currentStepIndex: 0,
      phase: 1,
      startedAt: new Date().toISOString(),
      frustrationCount: { phase1: 0, phase2: 0, phase3: 0, phase4: 0 },
    })
    navigate('/solve')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] p-6 font-sans">
      <h1 className="text-3xl font-bold tracking-tight mb-6" style={{ fontFamily: 'var(--font-display)' }}>{sv.input.title}</h1>
      <ColorInput onSubmit={handleSubmit} error={error} onClearError={() => setError(null)} />
    </div>
  )
}
