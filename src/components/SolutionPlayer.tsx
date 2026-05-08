import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { type CubeState } from '../cube/CubeState'
import { Moves, type MoveName } from '../cube/moves'
import { moveToNotation } from '../cube/notation'
import { type Phase } from '../solver/phases'
import { updateStep } from '../persistence/session'
import { sv } from '../i18n/sv'
import Cube3D from './Cube3D'
import { useMoveQueue } from './MoveQueue'
import PhaseProgress from './PhaseProgress'
import TutorPanel from './TutorPanel'
import { track } from '../utils/telemetry'

type Props = {
  initialState: CubeState
  phases: Phase[]
  mode?: 'guided' | 'quick'
}

function startStateFor(phaseIdx: number, initialState: CubeState, phases: Phase[]): CubeState {
  return phaseIdx === 0 ? initialState : phases[phaseIdx - 1].stateAfter
}

function getPhaseAtStep(step: number, phases: Phase[]) {
  let count = 0
  for (const phase of phases) {
    if (step < count + phase.moves.length) {
      return { phase, phaseStep: step - count, phaseTotal: phase.moves.length }
    }
    count += phase.moves.length
  }
  return {
    phase: phases[phases.length - 1],
    phaseStep: phases[phases.length - 1].moves.length,
    phaseTotal: phases[phases.length - 1].moves.length,
  }
}

// ── Guided mode ───────────────────────────────────────────────────────────────

function GuidedPlayer({ initialState, phases }: { initialState: CubeState; phases: Phase[] }) {
  const guidedMoves = useMemo(() => phases.flatMap(p => p.moves), [phases])
  const guidedStates = useMemo(() => {
    const states: CubeState[] = [initialState]
    for (const m of guidedMoves) {
      states.push(Moves[m](states[states.length - 1]))
    }
    return states
  }, [guidedMoves, initialState])

  const [guidedStep, setGuidedStep] = useState(0)
  const [cubeDisplayState, setCubeDisplayState] = useState<CubeState>(initialState)
  const [cubeKey, setCubeKey] = useState(0)
  const groupRef = useRef<THREE.Group | null>(null)
  const mq = useMoveQueue()

  const totalMoves = guidedMoves.length
  // Wait for the last animation to finish before showing the done screen
  const isDone = guidedStep >= totalMoves && !mq.isAnimating
  const { phase: currentPhase, phaseStep, phaseTotal } = getPhaseAtStep(
    Math.min(guidedStep, totalMoves - 1),
    phases,
  )
  const currentMove: MoveName | undefined = guidedMoves[guidedStep]

  const handleMoveComplete = useCallback(
    (moveId: number, _newState: CubeState) => { mq.onMoveComplete(moveId) },
    [mq],
  )

  function handleNext() {
    if (mq.isAnimating || isDone || !currentMove) return
    mq.enqueue(currentMove)
    const newStep = guidedStep + 1
    const nextInfo = getPhaseAtStep(Math.min(newStep, totalMoves - 1), phases)
    if (nextInfo.phase.id !== currentPhase.id) {
      track('phase_completed', { phase: String(currentPhase.id) })
    }
    setGuidedStep(newStep)
    updateStep(newStep, currentPhase.id)
  }

  function handleBack() {
    if (mq.isAnimating || guidedStep === 0) return
    const newStep = guidedStep - 1
    setGuidedStep(newStep)
    setCubeDisplayState(guidedStates[newStep])
    setCubeKey(k => k + 1)
    mq.clear()
  }

  useEffect(() => {
    if (isDone) track('solve_completed')
  }, [isDone])

  if (isDone) {
    return (
      <div className="space-y-4">
        <div className="w-full h-[300px] sm:h-[450px] bg-white rounded border border-[var(--border)] shadow-sm">
          <Cube3D
            key={'done'}
            initialState={guidedStates[totalMoves]}
            moveQueue={[]}
            onMoveComplete={handleMoveComplete}
            groupRef={groupRef}
          />
        </div>
        <PhaseProgress currentPhase={4 as 1 | 2 | 3 | 4} phases={phases} />
        <div className="py-6 text-center">
          <p className="text-2xl font-bold text-[var(--fg)]" style={{ fontFamily: 'var(--font-display)' }}>
            {sv.guided.done}
          </p>
        </div>
      </div>
    )
  }

  const moveNotation = currentMove ? moveToNotation(currentMove) : '—'
  const moveExplanation = currentMove ? (sv.moves[currentMove] ?? '') : ''
  const overallProgress = `${guidedStep + 1} / ${totalMoves}`
  const phaseProgress = `${phaseStep + 1} / ${phaseTotal}`

  return (
    <div className="space-y-4">
      <div className="w-full h-[300px] sm:h-[450px] bg-white rounded border border-[var(--border)] shadow-sm">
        <Cube3D
          key={cubeKey}
          initialState={cubeDisplayState}
          moveQueue={mq.queue}
          onMoveComplete={handleMoveComplete}
          groupRef={groupRef}
        />
      </div>

      <PhaseProgress currentPhase={currentPhase.id} phases={phases} />

      <div className="border border-[var(--border)] rounded-lg p-5 bg-white space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-[var(--muted)]">
            {sv.phases[currentPhase.id]} &middot; {phaseProgress} {sv.guided.stepOf}
          </p>
          <p className="text-xs text-[var(--muted)]">{overallProgress} totalt</p>
        </div>

        <div className="flex items-center gap-4">
          <span
            className="text-5xl font-bold text-[var(--fg)] leading-none"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {moveNotation}
          </span>
          <p className="text-sm text-[var(--fg)]">{moveExplanation}</p>
        </div>

        {/* progress bar */}
        <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all"
            style={{ width: `${(guidedStep / totalMoves) * 100}%` }}
          />
        </div>
      </div>

      <TutorPanel
        context={{
          phase: currentPhase.id,
          phaseName: sv.phases[currentPhase.id],
          currentMove: moveNotation,
          explanation: moveExplanation,
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={handleBack}
          disabled={guidedStep === 0 || mq.isAnimating}
          className="py-2.5 text-sm border border-[var(--border)] rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {'←'} {sv.guided.back}
        </button>
        <button
          onClick={handleNext}
          disabled={mq.isAnimating}
          className="min-h-[56px] sm:min-h-0 sm:py-2.5 py-4 text-sm font-medium bg-[var(--accent)] text-white rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {sv.guided.next} {'→'}
        </button>
      </div>
    </div>
  )
}

// ── Quick mode (unchanged) ────────────────────────────────────────────────────

function QuickPlayer({ initialState, phases }: { initialState: CubeState; phases: Phase[] }) {
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
      <div className="w-full h-[300px] sm:h-[450px] bg-white rounded border border-[var(--border)] shadow-sm">
        <Cube3D
          key={cubeKey}
          initialState={cubeDisplayState}
          moveQueue={mq.queue}
          onMoveComplete={handleMoveComplete}
          groupRef={groupRef}
        />
      </div>

      <PhaseProgress currentPhase={currentPhase.id} phases={phases} />

      <div className="space-y-1 text-sm text-[var(--fg)]">
        <p>
          <span className="font-medium">
            {sv.solve.phase} {currentPhase.id} {sv.solve.of} {phases.length}:
          </span>{' '}
          {sv.phases[currentPhase.id]}
        </p>
        <p>
          <span className="font-medium">{sv.solve.algorithm}:</span>{' '}
          <span className="text-xs" style={{ fontFamily: 'var(--font-mono)' }}>{algorithmStr}</span>
        </p>
        <p className="text-xs text-[var(--muted)]">
          {currentPhase.moves.length} {sv.solve.moves}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={playPhase}
          disabled={mq.isAnimating || currentPhase.moves.length === 0}
          className="py-2 text-sm bg-[var(--fg)] text-white rounded hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {sv.solve.play}
        </button>
        <button
          onClick={skipToEnd}
          className="py-2 text-sm border border-[var(--border)] rounded hover:bg-gray-50 transition-colors"
        >
          {sv.solve.skip}
        </button>
        <button
          onClick={goPrev}
          disabled={isFirstPhase || mq.isAnimating}
          className="py-2 text-sm border border-[var(--border)] rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {'←'} {sv.solve.prev}
        </button>
        <button
          onClick={isLastPhase ? undefined : goNext}
          disabled={mq.isAnimating}
          className="py-2 text-sm border border-[var(--border)] rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLastPhase ? sv.solve.done : `${sv.solve.next} →`}
        </button>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SolutionPlayer({ initialState, phases, mode = 'quick' }: Props) {
  if (mode === 'guided') {
    return <GuidedPlayer initialState={initialState} phases={phases} />
  }
  return <QuickPlayer initialState={initialState} phases={phases} />
}
