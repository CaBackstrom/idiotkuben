import { sv } from '../i18n/sv'
import { loadSession, saveSession } from '../persistence/session'
import { type Navigate } from './routes'

type Props = {
  navigate: Navigate
}

type Level = 'guided' | 'quick'

function LevelCard({
  name,
  desc,
  moves,
  onChoose,
}: {
  name: string
  desc: string
  moves: string
  onChoose: () => void
}) {
  return (
    <button
      onClick={onChoose}
      className="flex flex-col gap-4 p-6 border border-[var(--border)] rounded-lg bg-white text-left hover:border-[var(--fg)] hover:shadow-sm transition-all w-full"
    >
      <div>
        <h2 className="text-xl font-semibold text-[var(--fg)]" style={{ fontFamily: 'var(--font-display)' }}>
          {name}
        </h2>
        <p className="mt-2 text-sm text-[var(--fg)] leading-relaxed">{desc}</p>
      </div>
      <p className="text-sm text-[var(--muted)]" style={{ fontFamily: 'var(--font-mono)' }}>{moves}</p>
      <span className="mt-auto inline-block px-4 py-2 text-sm font-medium bg-[var(--accent)] text-white rounded">
        {sv.level.choose}
      </span>
    </button>
  )
}

export default function LevelPage({ navigate }: Props) {
  function choose(level: Level) {
    const existing = loadSession()
    if (existing) {
      saveSession({ ...existing, level })
    }
    localStorage.setItem('idiotkuben:pendingLevel', level)
    navigate('/input')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] p-6 font-sans">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {sv.level.title}
        </h1>
        <p className="text-sm text-[var(--muted)] mb-8">
          Välj hur du vill lösa din kub.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LevelCard
            name={sv.level.beginnerName}
            desc={sv.level.beginnerDesc}
            moves={sv.level.beginnerMoves}
            onChoose={() => choose('guided')}
          />
          <LevelCard
            name={sv.level.advancedName}
            desc={sv.level.advancedDesc}
            moves={sv.level.advancedMoves}
            onChoose={() => choose('quick')}
          />
        </div>
      </div>
    </div>
  )
}
