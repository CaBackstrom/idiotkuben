import { useState, useCallback, type ReactNode } from 'react'
import { type CubeState, type StickerColor, type Face, solvedState, FACE_COLORS } from '../cube/CubeState'
import { Moves, ALL_MOVES } from '../cube/moves'
import { mulberry32 } from '../cube/prng'
import { useLanguage } from '../context/LanguageContext'
import { useColorShortcuts } from '../hooks/useColorShortcuts'

const ALL_COLORS: StickerColor[] = ['U', 'R', 'F', 'D', 'L', 'B']

type Props = {
  onSubmit: (state: CubeState) => void
  error: string | null
  onClearError: () => void
  isSubmitting?: boolean
  heading?: ReactNode
}

function stickerKey(face: keyof CubeState, index: number): string {
  return `${face}-${index}`
}

// Unified T-shape unfolded cube net for all viewports.
// compact=true → 24px cells (~316px wide, fits 375px mobile)
// compact=false → 28px cells (~364px wide, fits lg desktop right column)
function CubeNet({
  stickers, painted, onPaint, onFillFace, compact,
}: {
  stickers: CubeState
  painted: Set<string>
  onPaint: (face: keyof CubeState, i: number) => void
  onFillFace: (face: keyof CubeState) => void
  compact: boolean
}) {
  const offsetPx = compact ? 80 : 92
  const paint = (face: keyof CubeState) => (i: number) => onPaint(face, i)
  const fill = (face: keyof CubeState) => () => onFillFace(face)

  return (
    <div className="select-none">
      <div style={{ paddingLeft: `${offsetPx}px` }}>
        <FaceGrid face="U" stickers={stickers.U} painted={painted} onPaint={paint('U')} onFillFace={fill('U')} compact={compact} />
      </div>
      <div className="flex gap-1 mt-0.5">
        {(['L', 'F', 'R', 'B'] as (keyof CubeState)[]).map(face => (
          <FaceGrid
            key={face}
            face={face}
            stickers={stickers[face]}
            painted={painted}
            onPaint={paint(face)}
            onFillFace={fill(face)}
            compact={compact}
          />
        ))}
      </div>
      <div className="mt-0.5" style={{ paddingLeft: `${offsetPx}px` }}>
        <FaceGrid face="D" stickers={stickers.D} painted={painted} onPaint={paint('D')} onFillFace={fill('D')} compact={compact} />
      </div>
    </div>
  )
}

export default function ColorInput({ onSubmit, error, onClearError, isSubmitting = false, heading }: Props) {
  const { t } = useLanguage()
  const [stickers, setStickers] = useState<CubeState>(solvedState)
  const [activeColor, setActiveColor] = useState<StickerColor>('U')
  const [painted, setPainted] = useState<Set<string>>(() => new Set())
  const [lastSeed, setLastSeed] = useState<number | null>(null)
  const [flashColor, setFlashColor] = useState<StickerColor | null>(null)

  function paint(face: keyof CubeState, index: number) {
    if (index === 4) return
    setStickers(prev => {
      const newFace = [...prev[face]] as Face
      newFace[index] = activeColor
      return { ...prev, [face]: newFace }
    })
    setPainted(prev => new Set(prev).add(stickerKey(face, index)))
  }

  function fillFace(face: keyof CubeState) {
    setStickers(prev => {
      const newFace = [...prev[face]] as Face
      for (let i = 0; i < 9; i++) {
        if (i !== 4) newFace[i] = activeColor
      }
      return { ...prev, [face]: newFace }
    })
    setPainted(prev => {
      const next = new Set(prev)
      for (let i = 0; i < 9; i++) {
        if (i !== 4) next.add(stickerKey(face, i))
      }
      return next
    })
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

  const handleColorShortcut = useCallback((color: StickerColor) => {
    setActiveColor(color)
    setFlashColor(color)
    setTimeout(() => setFlashColor(null), 150)
  }, [])

  useColorShortcuts(handleColorShortcut)

  const counts: Record<StickerColor, number> = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 }
  for (const face of ALL_COLORS as (keyof CubeState)[]) {
    for (const c of stickers[face]) counts[c]++
  }

  const isValid = (Object.values(counts) as number[]).every(n => n === 9)

  const overColors = ALL_COLORS.filter(c => counts[c] > 9)
  const underColors = ALL_COLORS.filter(c => counts[c] < 9)
  let validationMsg = ''
  if (!isValid) {
    const parts = [t('input.validationExact')]
    if (overColors.length > 0)
      parts.push(`${t('input.validationTooMany')} ${overColors.map(c => `${t(`input.colorNames.${c}`)} (${counts[c]})`).join(', ')}.`)
    if (underColors.length > 0)
      parts.push(`${t('input.validationTooFew')} ${underColors.map(c => `${t(`input.colorNames.${c}`)} (${counts[c]})`).join(', ')}.`)
    validationMsg = parts.join(' ')
  }

  const submitBtn = (
    <button
      onClick={handleSubmit}
      disabled={isSubmitting || !isValid}
      className="px-5 py-2.5 text-sm font-semibold bg-[var(--accent)] text-white rounded hover:opacity-90 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-150 w-full sm:w-auto"
    >
      {isSubmitting ? t('input.solving') : t('input.submit')}
    </button>
  )

  const netProps = { stickers, painted, onPaint: paint, onFillFace: fillFace }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-8 lg:gap-12 items-start">
      {/* Left column: controls */}
      <div className="space-y-4">
        {heading}
        <div className="space-y-1">
          <p className="text-sm text-gray-600">{t('input.hint')}</p>
          <p className="text-sm text-gray-500">{t('input.howToUse')}</p>
          <p className="text-xs text-gray-400">{t('input.keyboardHint')}</p>
        </div>

        {/* Action row: scramble + submit */}
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

        {/* Inline validation message (B4) */}
        {!isValid && (
          <p className="text-xs text-[var(--accent)]">{validationMsg}</p>
        )}

        {/* Color palette: each circle + count chip as a column */}
        <div className="sticky top-12 sm:top-14 z-10 bg-[var(--bg)] pb-2 pt-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">{t('input.palette')}</p>
          <div className="flex gap-3 flex-wrap">
            {ALL_COLORS.map(color => {
              const n = counts[color]
              const isActive = activeColor === color
              const isFlashing = flashColor === color
              return (
                <div key={color} className="flex flex-col items-center gap-1" style={{ width: '44px' }}>
                  <button
                    onClick={() => setActiveColor(color)}
                    title={t(`input.faceLabels.${color}`)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: color === 'U' ? '#FFFFFF' : FACE_COLORS[color],
                      boxShadow: isActive
                        ? '0 0 0 2px white, 0 0 0 4px var(--fg)'
                        : '0 0 0 1px rgba(0,0,0,0.1)',
                      transition: 'transform 150ms, box-shadow 150ms',
                      transform: isFlashing ? 'scale(1.1)' : isActive ? 'scale(1.05)' : 'scale(1)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                  />
                  <span className={`text-xs font-mono font-semibold text-center ${n === 9 ? 'text-green-600' : 'text-red-600'}`}>
                    {color}:{n}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cube net shown below palette on mobile/tablet; hidden on lg+ (in right column) */}
        <div className="lg:hidden overflow-x-auto">
          <CubeNet {...netProps} compact={true} />
        </div>

        {error && (
          <div className="text-sm px-3 py-2 rounded border-l-4 border-[var(--accent)] bg-white text-[var(--fg)]">
            {error}
          </div>
        )}
      </div>

      {/* Right column: cube net, desktop only (lg+) */}
      <div className="hidden lg:block lg:sticky lg:top-20">
        <CubeNet {...netProps} compact={false} />
      </div>
    </div>
  )
}

type FaceGridProps = {
  face: keyof CubeState
  stickers: Face
  painted: Set<string>
  onPaint: (index: number) => void
  onFillFace: () => void
  compact?: boolean
}

function FaceGrid({ face, stickers, painted, onPaint, onFillFace, compact = false }: FaceGridProps) {
  const cellClass = compact ? 'w-6 h-6' : 'w-7 h-7'

  return (
    <div className="w-fit grid grid-cols-3 gap-0.5">
      {stickers.map((color, i) => {
        const isCenter = i === 4
        const isPainted = isCenter || painted.has(`${face}-${i}`)
        const isWhite = color === 'U'

        let bgColor: string
        let borderStyle: string
        if (isCenter) {
          bgColor = FACE_COLORS[color]
          borderStyle = '1px solid rgba(26,26,26,0.25)'
        } else if (!isPainted) {
          bgColor = '#E8E8E8'
          borderStyle = '1px solid rgba(26,26,26,0.12)'
        } else if (isWhite) {
          bgColor = '#FFFFFF'
          borderStyle = '2px solid rgba(26,26,26,0.15)'
        } else {
          bgColor = FACE_COLORS[color]
          borderStyle = '1px solid rgba(26,26,26,0.22)'
        }

        return (
          <button
            key={i}
            onClick={() => onPaint(i)}
            onDoubleClick={isCenter ? undefined : () => onFillFace()}
            disabled={isCenter}
            style={{ backgroundColor: bgColor, border: borderStyle }}
            className={`${cellClass} rounded-sm transition-colors ${
              isCenter ? 'cursor-default opacity-80' : 'hover:opacity-90 cursor-pointer'
            }`}
            title={isCenter ? `${face} (center)` : undefined}
          />
        )
      })}
    </div>
  )
}
