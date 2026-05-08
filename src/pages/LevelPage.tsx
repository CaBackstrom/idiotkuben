import { loadSession, saveSession } from '../persistence/session'
import { type Navigate } from './routes'
import { track } from '../utils/telemetry'
import { useLanguage } from '../context/LanguageContext'
import TopNav from '../components/TopNav'

type Props = {
  navigate: Navigate
}

type Level = 'guided' | 'quick'

// ── Animated mini-previews ────────────────────────────────────────────────────

function BeginnerPreview({ caption }: { caption: string }) {
  // Grid cells: x = 4 + col*24, y = 4 + row*24, each 20×20px
  // Right column (col=2): x=52..72. Middle-right cell center: (62, 38).
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
        {/* 3×3 grid */}
        {[0, 1, 2].map(row => [0, 1, 2].map(col => (
          <rect
            key={`${row}-${col}`}
            x={4 + col * 24}
            y={4 + row * 24}
            width={20}
            height={20}
            rx={2}
            fill={col === 2 ? '#C8102E' : row === 0 ? '#FFFFFF' : '#E5E5E0'}
            stroke="#D0D0C8"
            strokeWidth={1}
          />
        )))}
        {/* "R" label centered inside the middle-right cell (62, 38) */}
        <text
          x="62" y="38"
          fontSize="11"
          fill="white"
          fontFamily="var(--font-mono)"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          R
        </text>
        {/* Down-arrow inside the right column indicating clockwise rotation */}
        <line x1="62" y1="8" x2="62" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <polyline
          points="59,15 62,20 65,15"
          fill="none" stroke="white" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      <p className="text-xs text-[var(--muted)]">{caption}</p>
    </div>
  )
}

function AdvancedPreview({ caption }: { caption: string }) {
  const algo = "R U R' U'"
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
        {/* Cube face grid — more mixed colors */}
        {[0, 1, 2].map(row => [0, 1, 2].map(col => {
          const colors = ['#FFCC00','#FFFFFF','#C8102E','#FF6B00','#00A86B','#0046AD','#C8102E','#FFCC00','#FFFFFF']
          return (
            <rect
              key={`${row}-${col}`}
              x={4 + col * 24}
              y={4 + row * 24}
              width={20}
              height={20}
              rx={2}
              fill={colors[row * 3 + col]}
              stroke="#D0D0C8"
              strokeWidth={1}
            />
          )
        }))}
      </svg>
      <p
        className="text-xs text-[var(--fg)] font-mono tracking-tight"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}
      >
        {algo}
      </p>
      <p className="text-xs text-[var(--muted)]">{caption}</p>
    </div>
  )
}

function LevelCard({
  name,
  desc,
  moves,
  preview,
  onChoose,
}: {
  name: string
  desc: string
  moves: string
  preview: React.ReactNode
  onChoose: () => void
}) {
  return (
    <button
      onClick={onChoose}
      className="flex flex-col gap-3 p-6 border border-[var(--border)] rounded-lg bg-white text-left hover:border-[var(--fg)] hover:shadow-sm active:scale-[0.98] transition-all duration-150 w-full"
    >
      <div className="self-center">{preview}</div>
      <div>
        <h2 className="text-xl font-semibold text-[var(--fg)]" style={{ fontFamily: 'var(--font-display)' }}>
          {name}
        </h2>
        <p className="mt-2 text-sm text-[var(--fg)] leading-relaxed">{desc}</p>
      </div>
      <p className="text-sm text-[var(--muted)]" style={{ fontFamily: 'var(--font-mono)' }}>{moves}</p>
    </button>
  )
}

export default function LevelPage({ navigate }: Props) {
  const { t } = useLanguage()

  function choose(level: Level) {
    track('level_selected', { level })
    const existing = loadSession()
    if (existing) {
      saveSession({ ...existing, level })
    }
    localStorage.setItem('idiotkuben:pendingLevel', level)
    navigate('/input')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-sans">
      <TopNav navigate={navigate} onBack={() => navigate('/')} right={t('nav.pages.level')} />
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <h1
            className="font-bold mb-2"
            style={{ fontFamily: 'var(--font-display)', fontSize: '3rem' }}
          >
            {t('level.title')}
          </h1>
          <p className="text-sm text-[var(--muted)] mb-8">
            {t('level.chooseDesc')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LevelCard
              name={t('level.beginnerName')}
              desc={t('level.beginnerDesc')}
              moves={t('level.beginnerMoves')}
              preview={<BeginnerPreview caption={t('level.beginnerPreview')} />}
              onChoose={() => choose('guided')}
            />
            <LevelCard
              name={t('level.advancedName')}
              desc={t('level.advancedDesc')}
              moves={t('level.advancedMoves')}
              preview={<AdvancedPreview caption={t('level.advancedPreview')} />}
              onChoose={() => choose('quick')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
