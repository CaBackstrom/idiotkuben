import { useState } from 'react'
import { type CubeState, type StickerColor, type Face, solvedState, FACE_COLORS } from '../cube/CubeState'
import { sv } from '../i18n/sv'

const ALL_COLORS: StickerColor[] = ['U', 'R', 'F', 'D', 'L', 'B']

type Props = {
  onSubmit: (state: CubeState) => void
  error: string | null
}

export default function ColorInput({ onSubmit, error }: Props) {
  const [stickers, setStickers] = useState<CubeState>(solvedState)
  const [activeColor, setActiveColor] = useState<StickerColor>('U')

  function paint(face: keyof CubeState, index: number) {
    if (index === 4) return
    setStickers(prev => {
      const newFace = [...prev[face]] as Face
      newFace[index] = activeColor
      return { ...prev, [face]: newFace }
    })
  }

  function handleSubmit() {
    onSubmit(stickers)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">{sv.input.hint}</p>

      {/* Color palette */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">{sv.input.palette}</p>
        <div className="flex gap-2 flex-wrap">
          {ALL_COLORS.map(color => (
            <button
              key={color}
              onClick={() => setActiveColor(color)}
              style={{ backgroundColor: FACE_COLORS[color] }}
              className={`w-8 h-8 rounded border-2 transition-all ${
                activeColor === color
                  ? 'border-[#1A1A1A] scale-110 shadow-sm'
                  : 'border-transparent'
              }`}
              title={sv.input.faceLabels[color]}
            />
          ))}
        </div>
      </div>

      {/* Unfolded cross layout */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Top: U face */}
          <div className="flex justify-start pl-[calc(3*2.25rem+3*0.25rem)]">
            <FaceGrid face="U" stickers={stickers.U} onPaint={(i) => paint('U', i)} />
          </div>
          {/* Middle row: L F R B */}
          <div className="flex gap-1 mt-1">
            <FaceGrid face="L" stickers={stickers.L} onPaint={(i) => paint('L', i)} />
            <FaceGrid face="F" stickers={stickers.F} onPaint={(i) => paint('F', i)} />
            <FaceGrid face="R" stickers={stickers.R} onPaint={(i) => paint('R', i)} />
            <FaceGrid face="B" stickers={stickers.B} onPaint={(i) => paint('B', i)} />
          </div>
          {/* Bottom: D face */}
          <div className="flex justify-start pl-[calc(3*2.25rem+3*0.25rem)] mt-1">
            <FaceGrid face="D" stickers={stickers.D} onPaint={(i) => paint('D', i)} />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm px-3 py-2 rounded border bg-red-50 border-red-200 text-red-800">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        className="px-5 py-2.5 text-sm font-medium bg-[#1A1A1A] text-white rounded hover:bg-[#333] transition-colors"
      >
        {sv.input.submit}
      </button>
    </div>
  )
}

type FaceGridProps = {
  face: keyof CubeState
  stickers: Face
  onPaint: (index: number) => void
}

function FaceGrid({ face, stickers, onPaint }: FaceGridProps) {
  return (
    <div>
      <div className="text-[10px] font-medium text-gray-500 text-center mb-0.5">
        {face}
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        {stickers.map((color, i) => {
          const isCenter = i === 4
          return (
            <button
              key={i}
              onClick={() => onPaint(i)}
              disabled={isCenter}
              style={{ backgroundColor: FACE_COLORS[color] }}
              className={`w-9 h-9 rounded-sm border transition-colors ${
                isCenter
                  ? 'border-gray-400 cursor-default opacity-80'
                  : 'border-gray-500 hover:opacity-90 cursor-pointer'
              }`}
              title={isCenter ? `${face} (center)` : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}
