import { useState } from 'react'
import { type CubeState } from '../cube/CubeState'
import { isValidCubeState } from '../cube/validate'
import { saveSession } from '../persistence/session'
import { useLanguage } from '../context/LanguageContext'
import ColorInput from '../components/ColorInput'
import TopNav from '../components/TopNav'
import { type Navigate } from './routes'

type Props = {
  navigate: Navigate
}

export default function InputPage({ navigate }: Props) {
  const { t } = useLanguage()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(state: CubeState) {
    setError(null)
    const result = isValidCubeState(state)
    if (!result.valid) {
      setError(result.reason ?? t('input.invalid'))
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
    setSubmitting(true)
    setTimeout(() => navigate('/solve'), 80)
  }

  const heading = (
    <h1
      className="font-bold tracking-tight"
      style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 7.5vw, 3rem)' }}
    >
      {t('input.title')}
    </h1>
  )

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-sans">
      <TopNav navigate={navigate} onBack={() => navigate('/level')} right={t('nav.pages.input')} />
      <div className="p-4 sm:p-6">
        <ColorInput
          onSubmit={handleSubmit}
          error={error}
          onClearError={() => setError(null)}
          isSubmitting={submitting}
          heading={heading}
        />
      </div>
    </div>
  )
}
