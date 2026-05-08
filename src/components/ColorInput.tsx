import { useState } from 'react'
import { type CubeState, type StickerColor, type Face, solvedState, FACE_COLORS } from '../cube/CubeState'
import { Moves, ALL_MOVES } from '../cube/moves'
import { mulberry32 } from '../cube/prng'
import { sv } from '../i18n/sv'

const ALL_COLORS: StickerColor[] = ['U', 'R', 'F', 'D', 'L', 'B']

type Props = {
  onSubmit: (state: CubeState) => void
  error: string | null
  onClearError: () => void
}

function stickerKey(face: keyof CubeState, index: number): string {
  return `${face}-${index}`
}

export default function ColorInput({ onSubmit, error, onClearError }: Props) {
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

  // Live per-color count across all 54 stickers
  const counts: Record<StickerColor, number> = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 }
  for (const face of ALL_COLORS as (keyof CubeState)[]) {
    for (const c of stickers[face]) counts[c]++
  }

  const submitBtn = (
    <button
      onClick={handleSubmit}
      className="px-5 py-2.5 text-sm font-semibold bg-[var(--accent)] text-white rounded hover:opacity-90 transition-opacity w-full sm:w-auto"
    >
      {sv.input.submit}
    </button>
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{sv.input.hint}</p>

      {/* Top action row: scramble + submit */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 sm:flex-wrap">
        <button
          onClick={handleScramble}
          className="px-5 py-2.5 text-sm font-semibold bg-white border border-[var(--border)] rounded hover:bg-gray-50 transition-colors w-full sm:w-auto"
        >
          {sv.input.scramble}
        </button>
        {lastSeed !== null && (
          <span className="text-xs text-gray-400 font-mono">{sv.input.seed}: {lastSeed}</span>
        )}
        {submitBtn}
      </div>

      {/* Color palette + live counter */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">{sv.input.palette}</p>
        <div className="flex gap-2 flex-wrap">
          {ALL_COLORS.map(color => (
            <button
              key={color}
              onClick={() => setActiveColor(color)}
              style={{ backgroundColor: color === 'U' ? '#FFFFFF' : FACE_COLORS[color] }}
              className={`w-8 h-8 rounded transition-all ${
                activeColor === color
                  ? 'border-2 border-[var(--fg)] scale-110 shadow-sm'
                  : 'border-2 border-gray-300'
              }`}
              title={sv.input.faceLabels[color]}
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

      {/* Unfolded cross layout */}
      <div className="overflow-x-auto">
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
}

function FaceGrid({ face, stickers, painted, onPaint }: FaceGridProps) {
  return (
    <div>
      <div className="text-[10px] font-medium text-gray-500 text-center mb-0.5">
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
              style={{ backgroundColor: bg }}
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-sm border transition-colors ${extraBorder} ${
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
