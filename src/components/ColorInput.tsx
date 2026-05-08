import { useState } from 'react'
import { type CubeState, type StickerColor, type Face, solvedState, FACE_COLORS } from '../cube/CubeState'
import { Moves, ALL_MOVES } from '../cube/moves'
import { mulberry32 } from '../cube/prng'
import { useLanguage } from '../context/LanguageContext'

const ALL_COLORS: StickerColor[] = ['U', 'R', 'F', 'D', 'L', 'B']
const FACE_ORDER: (keyof CubeState)[] = ['U', 'L', 'F', 'R', 'B', 'D']

type Props = {
  onSubmit: (state: CubeState) => void
  error: string | null
  onClearError: () => void
  isSubmitting?: boolean
}

function stickerKey(face: keyof CubeState, index: number): string {
  return `${face}-${index}`
}

export default function ColorInput({ onSubmit, error, onClearError, isSubmitting = false }: Props) {
  const { t } = useLanguage()
  const [stickers, setStickers] = useState<CubeState>(solvedState)
  const [activeColor, setActiveColor] = useState<StickerColor>('U')
  const [painted, setPainted] = useState<Set<string>>(() => new Set())
  const [lastSeed, setLastSeed] = useState<number | null>(null)

  function paint(face: keyof CubeState, index: number) {
    if (index === 4) return
    setStickers(prev => {
      const newFace = [...prev[face]] as Face
      newFace[index] = activeColor
      return { ...prev, [face]: newFace }
    })
    setPainted(prev => new Set(prev).add(stickerKey(face, index)))
  }

  function handleScramble() {
    const seed = Math.floor(Math.random() * 99999) + 1
    const rand = mulberry32(seed)
    let state = solvedState()
    for (let i = 0; i < 20; i++) {
      const idx = Math.floor(rand() * ALL_MOVES.length)
      state = Moves[ALL_MOVES[idx]](state)
    }
    setStickers(state)
    setLastSeed(seed)
    onClearError()
    const all = new Set<string>()
    for (const face of ALL_COLORS as (keyof CubeState)[]) {
      for (let i = 0; i < 9; i++) {
        if (i !== 4) all.add(stickerKey(face, i))
      }
    }
    setPainted(all)
  }

  function handleSubmit() {
    onSubmit(stickers)
  }

  const counts: Record<StickerColor, number> = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 }
  for (const face of ALL_COLORS as (keyof CubeState)[]) {
    for (const c of stickers[face]) counts[c]++
  }

  const submitBtn = (
    <button
      onClick={handleSubmit}
      disabled={isSubmitting}
      className="px-5 py-2.5 text-sm font-semibold bg-[var(--accent)] text-white rounded hover:opacity-90 hover:shadow-sm disabled:opacity-60 active:scale-[0.98] transition-all duration-150 w-full sm:w-auto"
    >
      {isSubmitting ? t('input.solving') : t('input.submit')}
    </button>
  )

  const palette = (
    <div className="sticky top-14 z-10 bg-[var(--bg)] pb-2 pt-1">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">{t('input.palette')}</p>
      <div className="flex gap-3 flex-wrap">
        {ALL_COLORS.map(color => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            title={t(`input.faceLabels.${color}`)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: color === 'U' ? '#FFFFFF' : FACE_COLORS[color],
              boxShadow: activeColor === color
                ? '0 0 0 2px white, 0 0 0 4px var(--fg)'
                : '0 0 0 1px rgba(0,0,0,0.1)',
              transition: 'transform 150ms, box-shadow 150ms',
              transform: activeColor === color ? 'scale(1.05)' : 'scale(1)',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { if (activeColor !== color) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)' }}
            onMouseLeave={e => { if (activeColor !== color) (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
          />
        ))}
      </div>
      <div className="flex gap-3 mt-2 flex-wrap">
        {ALL_COLORS.map(color => {
          const n = counts[color]
          return (
            <span
              key={color}
              className={`text-xs font-mono font-semibold ${n === 9 ? 'text-green-600' : 'text-red-600'}`}
            >
              {color}:{n}
            </span>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t('input.hint')}</p>

      {/* Top action row: scramble + submit */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 sm:flex-wrap">
        <button
          onClick={handleScramble}
          className="px-5 py-2.5 text-sm font-semibold bg-white border border-[var(--border)] rounded hover:bg-gray-50 transition-colors w-full sm:w-auto"
        >
          {t('input.scramble')}
        </button>
        {lastSeed !== null && (
          <span className="text-xs text-gray-400 font-mono">{t('input.seed')}: {lastSeed}</span>
        )}
        {submitBtn}
      </div>

      {palette}

      {/* Mobile: vertical stack of labeled 3x3 grids */}
      <div className="sm:hidden space-y-4">
        {FACE_ORDER.map(face => (
          <div key={face}>
            <p className="text-xs font-semibold text-[var(--muted)] mb-1.5">
              {t(`input.faceLabels.${face}`)}
            </p>
            <FaceGrid
              face={face}
              stickers={stickers[face]}
              painted={painted}
              onPaint={(i) => paint(face, i)}
              stickerSize={44}
            />
          </div>
        ))}
      </div>

      {/* Desktop: unfolded cross layout */}
      <div className="hidden sm:block overflow-x-auto">
        <div className="inline-block">
          <div className="flex justify-start pl-[calc(3*2.25rem+3*0.25rem)]">
            <FaceGrid face="U" stickers={stickers.U} painted={painted} onPaint={(i) => paint('U', i)} />
          </div>
          <div className="flex gap-1 mt-1">
            <FaceGrid face="L" stickers={stickers.L} painted={painted} onPaint={(i) => paint('L', i)} />
            <FaceGrid face="F" stickers={stickers.F} painted={painted} onPaint={(i) => paint('F', i)} />
            <FaceGrid face="R" stickers={stickers.R} painted={painted} onPaint={(i) => paint('R', i)} />
            <FaceGrid face="B" stickers={stickers.B} painted={painted} onPaint={(i) => paint('B', i)} />
          </div>
          <div className="flex justify-start pl-[calc(3*2.25rem+3*0.25rem)] mt-1">
            <FaceGrid face="D" stickers={stickers.D} painted={painted} onPaint={(i) => paint('D', i)} />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm px-3 py-2 rounded border-l-4 border-[var(--accent)] bg-white text-[var(--fg)]">
          {error}
        </div>
      )}

      {submitBtn}
    </div>
  )
}

type FaceGridProps = {
  face: keyof CubeState
  stickers: Face
  painted: Set<string>
  onPaint: (index: number) => void
  stickerSize?: number
}

function FaceGrid({ face, stickers, painted, onPaint, stickerSize }: FaceGridProps) {
  const size = stickerSize ?? 36
  return (
    <div>
      <div className="text-[10px] font-medium text-gray-500 text-center mb-0.5 sm:block hidden">
        {face}
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        {stickers.map((color, i) => {
          const isCenter = i === 4
          const isPainted = isCenter || painted.has(`${face}-${i}`)
          const isWhite = color === 'U'

          let bg: string
          let extraBorder: string
          if (isCenter) {
            bg = FACE_COLORS[color]
            extraBorder = 'border-gray-400'
          } else if (!isPainted) {
            bg = '#E8E8E8'
            extraBorder = 'border-gray-300'
          } else if (isWhite) {
            bg = '#FFFFFF'
            extraBorder = 'border-[var(--muted)] border-2'
          } else {
            bg = FACE_COLORS[color]
            extraBorder = 'border-gray-500'
          }

          return (
            <button
              key={i}
              onClick={() => onPaint(i)}
              disabled={isCenter}
              style={{ backgroundColor: bg, width: `${size}px`, height: `${size}px` }}
              className={`rounded-sm border transition-colors ${extraBorder} ${
                isCenter ? 'cursor-default opacity-80' : 'hover:opacity-90 cursor-pointer'
              }`}
              title={isCenter ? `${face} (center)` : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}
