import { type SavedSession } from '../persistence/session'
import { type Route } from '../pages/routes'
import { sv } from '../i18n/sv'

type Props = {
  session: SavedSession
  navigate: (route: Route) => void
  onFresh: () => void
}

export default function ContinuePrompt({ session, navigate, onFresh }: Props) {
  const started = new Date(session.startedAt).toLocaleString('sv-SE')
  const totalMoves = session.solution.length
  const phaseLabel = `${sv.solve.phase} ${session.phase} ${sv.solve.of} 4`
  const stepLabel = totalMoves > 0 ? `, steg ${session.currentStepIndex} ${sv.solve.of} ${totalMoves}` : ''

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm border border-[var(--border)] rounded bg-white p-6 space-y-4 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--fg)]" style={{ fontFamily: 'var(--font-display)' }}>{sv.continue.title}</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="font-medium">{sv.continue.started}:</span>{' '}
            {started}
          </p>
          <p>
            <span className="font-medium">{sv.continue.progress}:</span>{' '}
            {phaseLabel}{stepLabel}
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => navigate('/solve')}
            className="flex-1 py-2 text-sm font-medium bg-[var(--fg)] text-white rounded hover:opacity-80 transition-opacity"
          >
            {sv.continue.continueBtn}
          </button>
          <button
            onClick={onFresh}
            className="flex-1 py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {sv.continue.freshBtn}
          </button>
        </div>
      </div>
    </div>
  )
}
