import { useState, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { type CubeState } from '../cube/CubeState'
import { moveToNotation } from '../cube/notation'
import { type Phase } from '../solver/phases'
import { updateStep } from '../persistence/session'
import { sv } from '../i18n/sv'
import Cube3D from './Cube3D'
import { useMoveQueue } from './MoveQueue'
import PhaseProgress from './PhaseProgress'

type Props = {
  initialState: CubeState
  phases: Phase[]
}

function startStateFor(phaseIdx: number, initialState: CubeState, phases: Phase[]): CubeState {
  return phaseIdx === 0 ? initialState : phases[phaseIdx - 1].stateAfter
}

export default function SolutionPlayer({ initialState, phases }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [cubeDisplayState, setCubeDisplayState] = useState<CubeState>(() => initialState)
  const [cubeKey, setCubeKey] = useState(0)
  const groupRef = useRef<THREE.Group | null>(null)
  const mq = useMoveQueue()

  const currentPhase = phases[phaseIdx]
  const isLastPhase = phaseIdx === phases.length - 1
  const isFirstPhase = phaseIdx === 0

  const handleMoveComplete = useCallback((moveId: number, _newState: CubeState) => {
    mq.onMoveComplete(moveId)
  }, [mq])

  function playPhase() {
    if (mq.isAnimating) return
    currentPhase.moves.forEach(m => mq.enqueue(m))
  }

  function skipToEnd() {
    mq.clear()
    setCubeDisplayState(currentPhase.stateAfter)
    setCubeKey(k => k + 1)
  }

  function goNext() {
    if (isLastPhase) return
    const nextIdx = phaseIdx + 1
    updateStep(
      phases.slice(0, nextIdx).reduce((sum, p) => sum + p.moves.length, 0),
      (nextIdx + 1) as 1 | 2 | 3 | 4,
    )
    setPhaseIdx(nextIdx)
    setCubeDisplayState(currentPhase.stateAfter)
    setCubeKey(k => k + 1)
    mq.clear()
  }

  function goPrev() {
    if (isFirstPhase) return
    const prevIdx = phaseIdx - 1
    setPhaseIdx(prevIdx)
    setCubeDisplayState(startStateFor(prevIdx, initialState, phases))
    setCubeKey(k => k + 1)
    mq.clear()
  }

  const algorithmStr = currentPhase.moves.map(moveToNotation).join(' ') || '—'

  return (
    <div className="space-y-4">
      {/* 3D cube */}
      <div className="w-full h-[360px] bg-white rounded border border-gray-200 shadow-sm">
        <Cube3D
          key={cubeKey}
          initialState={cubeDisplayState}
          moveQueue={mq.queue}
          onMoveComplete={handleMoveComplete}
          groupRef={groupRef}
        />
      </div>

      {/* Phase progress */}
      <PhaseProgress currentPhase={currentPhase.id} phases={phases} />

      {/* Phase info */}
      <div className="space-y-1 text-sm text-gray-700">
        <p>
          <span className="font-medium">
            {sv.solve.phase} {currentPhase.id} {sv.solve.of} {phases.length}:
          </span>{' '}
          {sv.phases[currentPhase.id]}
        </p>
        <p>
          <span className="font-medium">{sv.solve.algorithm}:</span>{' '}
          <span className="font-mono text-xs">{algorithmStr}</span>
        </p>
        <p className="text-xs text-gray-500">
          {currentPhase.moves.length} {sv.solve.moves}
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={playPhase}
          disabled={mq.isAnimating || currentPhase.moves.length === 0}
          className="py-2 text-sm bg-[#1A1A1A] text-white rounded hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {sv.solve.play}
        </button>
        <button
          onClick={skipToEnd}
          className="py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          {sv.solve.skip}
        </button>
        <button
          onClick={goPrev}
          disabled={isFirstPhase || mq.isAnimating}
          className="py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {'←'} {sv.solve.prev}
        </button>
        <button
          onClick={isLastPhase ? undefined : goNext}
          disabled={mq.isAnimating}
          className="py-2 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLastPhase ? sv.solve.done : `${sv.solve.next} →`}
        </button>
      </div>
    </div>
  )
}
