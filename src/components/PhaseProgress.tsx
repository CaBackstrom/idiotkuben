import { type Phase } from '../solver/phases'
import { sv } from '../i18n/sv'

type Props = {
  currentPhase: 1 | 2 | 3 | 4
  phases: Phase[]
}

export default function PhaseProgress({ currentPhase, phases }: Props) {
  return (
    <div className="flex gap-2">
      {phases.map(phase => {
        const isActive = phase.id === currentPhase
        const isDone = phase.id < currentPhase
        return (
          <div
            key={phase.id}
            className={`flex-1 rounded px-2 py-2 text-xs text-center transition-colors ${
              isActive
                ? 'bg-[#1A1A1A] text-white font-medium'
                : isDone
                ? 'bg-gray-200 text-gray-500'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            <div className="font-mono text-[10px] mb-0.5">{phase.id}</div>
            <div className="leading-tight">{sv.phases[phase.id]}</div>
          </div>
        )
      })}
    </div>
  )
}
