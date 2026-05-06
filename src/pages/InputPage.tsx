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
    saveSession({
      version: 1,
      level: 'quick',
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
    <div className="min-h-screen bg-[#FAFAF7] text-[#1A1A1A] p-6 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">{sv.input.title}</h1>
      <ColorInput onSubmit={handleSubmit} error={error} onClearError={() => setError(null)} />
    </div>
  )
}
