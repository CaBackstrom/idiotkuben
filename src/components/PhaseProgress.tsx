import { Fragment } from 'react'
import { type Phase } from '../solver/phases'
import { useLanguage } from '../context/LanguageContext'

type Props = {
  currentPhase: 1 | 2 | 3 | 4
  phases: Phase[]
}

export default function PhaseProgress({ currentPhase, phases }: Props) {
  const { t } = useLanguage()

  return (
    <div>
      {/* Desktop: connected label boxes */}
      <div className="hidden sm:flex items-center">
        {phases.map((phase, i) => {
          const isActive = phase.id === currentPhase
          const isDone = phase.id < currentPhase
          return (
            <Fragment key={phase.id}>
              {i > 0 && (
                <div
                  className="flex-1 h-px mx-1"
                  style={{ background: isDone ? 'var(--fg)' : 'var(--border)' }}
                />
              )}
              <div
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs shrink-0 transition-all
                  ${isActive
                    ? 'border-2 border-[var(--accent)] text-[var(--fg)] font-bold'
                    : isDone
                    ? 'bg-[var(--fg)] text-white font-medium'
                    : 'text-[var(--muted)] border border-[var(--border)]'}
                `}
              >
                {isDone && <span className="text-[10px]">{'✓'}</span>}
                {!isDone && (
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: isActive ? 'var(--accent)' : undefined }}
                  >
                    {phase.id}
                  </span>
                )}
                <span>{t(`phases.${phase.id}`)}</span>
              </div>
            </Fragment>
          )
        })}
      </div>

      {/* Mobile: dots */}
      <div className="flex sm:hidden items-center justify-center gap-2">
        {phases.map((phase, i) => {
          const isActive = phase.id === currentPhase
          const isDone = phase.id < currentPhase
          return (
            <Fragment key={phase.id}>
              {i > 0 && (
                <div
                  className="h-px w-5"
                  style={{ background: isDone ? 'var(--fg)' : 'var(--border)' }}
                />
              )}
              <div
                className="w-2.5 h-2.5 rounded-full transition-all"
                style={{
                  background: isActive
                    ? 'var(--accent)'
                    : isDone
                    ? 'var(--fg)'
                    : 'var(--border)',
                  boxShadow: isActive ? '0 0 0 3px rgba(200,16,46,0.18)' : undefined,
                }}
              />
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
