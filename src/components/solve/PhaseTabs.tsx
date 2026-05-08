import { useLanguage } from '../../context/LanguageContext'
import type { Phase } from '../../solver/phases'

export type PhaseTabItem = {
  id: string
  label: string
  isActive: boolean
}

// Pure function — testable without React context.
export function getPhaseTabItems(
  mode: 'guided' | 'quick',
  phases: Phase[],
  currentPhaseId: number,
  t: (key: string) => string,
): PhaseTabItem[] {
  if (mode === 'quick') {
    return [{ id: 'optimal', label: t('phases.optimal'), isActive: true }]
  }
  return phases.map(p => ({
    id: String(p.id),
    label: t(`phases.${p.id}`),
    isActive: p.id === currentPhaseId,
  }))
}

type Props = {
  mode: 'guided' | 'quick'
  phases: Phase[]
  currentPhaseId: number
  totalMoves?: number
}

export default function PhaseTabs({ mode, phases, currentPhaseId, totalMoves }: Props) {
  const { t } = useLanguage()

  if (mode === 'quick') {
    return (
      <div>
        <h2
          className="font-bold text-[var(--fg)]"
          style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1.1 }}
        >
          {t('phases.optimal')}
        </h2>
        {totalMoves !== undefined && (
          <p className="text-sm text-[var(--muted)] mt-1">
            {totalMoves} {t('solve.moves')}
          </p>
        )}
        <span
          className="inline-block mt-2 px-2 py-0.5 text-xs border border-[var(--border)] rounded text-[var(--muted)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {t('phases.kociemba')}
        </span>
      </div>
    )
  }

  const items = getPhaseTabItems(mode, phases, currentPhaseId, t)
  return (
    <div>
      {items.map(item => (
        <span
          key={item.id}
          data-active={item.isActive}
          className={item.isActive ? 'font-semibold text-[var(--fg)]' : 'text-[var(--muted)]'}
        >
          {item.label}
        </span>
      ))}
    </div>
  )
}
