import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { type CubeState } from '../cube/CubeState'
import { Moves, type MoveName } from '../cube/moves'
import { moveToNotation } from '../cube/notation'
import { mulberry32 } from '../cube/prng'
import { type Phase } from '../solver/phases'
import { updateStep, clearSession } from '../persistence/session'
import { sv } from '../i18n/sv'
import { type Navigate } from '../pages/routes'
import Cube3D from './Cube3D'
import { useMoveQueue } from './MoveQueue'
import PhaseProgress from './PhaseProgress'
import TutorPanel from './TutorPanel'
import { track } from '../utils/telemetry'

type Props = {
  initialState: CubeState
  phases: Phase[]
  mode?: 'guided' | 'quick'
  navigate?: Navigate
  onPhaseChange?: (phase: number) => void
}

type PlayerProps = {
  initialState: CubeState
  phases: Phase[]
  navigate?: Navigate
  onPhaseChange?: (phase: number) => void
  solveStart: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function startStateFor(phaseIdx: number, initialState: CubeState, phases: Phase[]): CubeState {
  return phaseIdx === 0 ? initialState : phases[phaseIdx - 1].stateAfter
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds} ${sv.solve.celebrationSeconds}`
  return `${Math.floor(seconds / 60)} ${sv.solve.celebrationMinutes}`
}

function makeConfetti() {
  const rand = mulberry32(42)
  const count = typeof window !== 'undefined' && window.innerWidth < 768 ? 15 : 30
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: rand() * 100,
    delay: rand() * 1.5,
    size: 6 + rand() * 6,
  }))
}

// ── Phase completion overlay ──────────────────────────────────────────────────

function PhaseOverlay({ phaseId }: { phaseId: number }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="phase-overlay-enter bg-white/95 border border-[var(--border)] rounded-xl px-8 py-5 text-center shadow-lg">
        <div
          className="text-2xl font-bold text-[var(--accent)] mb-1"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {'✓'}
        </div>
        <p className="font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>
          {sv.phaseComplete.prefix} {phaseId} {sv.phaseComplete.suffix}
        </p>
        <p className="text-sm text-[var(--muted)] mt-0.5">{sv.phases[phaseId as 1 | 2 | 3 | 4]}</p>
      </div>
    </div>
  )
}

// ── Confetti layer ────────────────────────────────────────────────────────────

function Confetti({ particles }: { particles: ReturnType<typeof makeConfetti> }) {
  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay.toFixed(2)}s`,
            width: `${p.size.toFixed(0)}px`,
            height: `${p.size.toFixed(0)}px`,
          }}
        />
      ))}
    </>
  )
}

// ── Guided mode ───────────────────────────────────────────────────────────────

function GuidedPlayer({ initialState, phases, navigate, onPhaseChange, solveStart }: PlayerProps) {
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
  const [phaseOverlay, setPhaseOverlay] = useState<number | null>(null)
  const [moveMilestone, setMoveMilestone] = useState<number | null>(null)
  const [pulseProgress, setPulseProgress] = useState(false)
  const groupRef = useRef<THREE.Group | null>(null)
  const instructionRef = useRef<HTMLDivElement>(null)
  const mq = useMoveQueue()
  const confetti = useMemo(() => makeConfetti(), [])

  const totalMoves = guidedMoves.length
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
      setPhaseOverlay(currentPhase.id)
      setTimeout(() => setPhaseOverlay(null), 1500)
      onPhaseChange?.(nextInfo.phase.id)
    }

    if (newStep > 0 && newStep % 10 === 0) {
      setMoveMilestone(newStep)
      setTimeout(() => setMoveMilestone(null), 2000)
    }

    setPulseProgress(true)
    setTimeout(() => setPulseProgress(false), 600)

    setGuidedStep(newStep)
    updateStep(newStep, currentPhase.id)

    requestAnimationFrame(() => {
      instructionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
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

  // ── Celebration view ──────────────────────────────────────────────────────
  if (isDone) {
    const elapsed = Math.round((Date.now() - solveStart) / 1000)
    return (
      <div className="relative">
        <Confetti particles={confetti} />
        <div className="space-y-6">
          <div className="w-full h-[300px] sm:h-[450px] bg-white rounded border border-[var(--border)] shadow-sm">
            <Cube3D
              key="done"
              initialState={guidedStates[totalMoves]}
              moveQueue={[]}
              onMoveComplete={handleMoveComplete}
              groupRef={groupRef}
            />
          </div>
          <PhaseProgress currentPhase={4 as 1 | 2 | 3 | 4} phases={phases} />
          <div className="text-center space-y-1 py-4">
            <p
              className="font-bold text-[var(--fg)]"
              style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}
            >
              {sv.guided.done}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {sv.solve.celebrationDone} {totalMoves} {sv.solve.celebrationMovesUnit} {formatElapsed(elapsed)}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => { clearSession(); navigate?.('/input') }}
              className="py-3 text-sm font-semibold bg-[var(--accent)] text-white rounded hover:opacity-90 active:scale-[0.98] transition-all duration-150"
            >
              {sv.solve.solveAnother}
            </button>
            <button
              onClick={() => navigate?.('/')}
              className="py-3 text-sm border border-[var(--border)] rounded hover:bg-gray-50 active:scale-[0.98] transition-all duration-150"
            >
              {sv.solve.backToStart}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Normal play view ──────────────────────────────────────────────────────
  const moveNotation = currentMove ? moveToNotation(currentMove) : '—'
  const moveExplanation = currentMove ? (sv.moves[currentMove] ?? '') : ''
  const overallProgress = `${guidedStep + 1} / ${totalMoves}`
  const phaseProgress = `${phaseStep + 1} / ${phaseTotal}`
  const progressPct = (guidedStep / totalMoves) * 100

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {phaseOverlay !== null && <PhaseOverlay phaseId={phaseOverlay} />}

      {/* Left: sticky cube */}
      <div>
        <div className="md:sticky md:top-20">
          <div className="w-full h-[300px] sm:h-[450px] bg-white rounded border border-[var(--border)] shadow-sm">
            <Cube3D
              key={cubeKey}
              initialState={cubeDisplayState}
              moveQueue={mq.queue}
              onMoveComplete={handleMoveComplete}
              groupRef={groupRef}
            />
          </div>
        </div>
      </div>

      {/* Right: instruction panel */}
      <div className="space-y-4">
        <PhaseProgress currentPhase={currentPhase.id} phases={phases} />

        <h2
          className="font-bold text-[var(--fg)]"
          style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1.1 }}
        >
          {sv.phases[currentPhase.id]}
        </h2>

        <div ref={instructionRef} className="border border-[var(--border)] rounded-lg p-5 bg-white space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-[var(--muted)]">
              {phaseProgress} {sv.guided.stepOf}
            </p>
            <div className="flex items-center gap-2">
              {moveMilestone !== null && (
                <span className="text-xs font-semibold text-[var(--accent)]">
                  Drag {moveMilestone} {'✓'}
                </span>
              )}
              <p className="text-xs text-[var(--muted)]">{overallProgress} totalt</p>
            </div>
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

          <div className="h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full"
              style={{
                width: `${progressPct}%`,
                transition: 'width 0.4s ease-out, box-shadow 0.3s ease-out',
                boxShadow: pulseProgress ? '0 0 8px 2px rgba(200,16,46,0.35)' : 'none',
              }}
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
            className="py-2.5 text-sm border border-[var(--border)] rounded hover:bg-gray-50 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150"
          >
            {'←'} {sv.guided.back}
          </button>
          <button
            onClick={handleNext}
            disabled={mq.isAnimating}
            className="min-h-[56px] sm:min-h-0 sm:py-2.5 py-4 text-sm font-medium bg-[var(--accent)] text-white rounded hover:opacity-90 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150"
          >
            {sv.guided.next} {'→'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Quick mode ────────────────────────────────────────────────────────────────

function QuickPlayer({ initialState, phases, navigate, onPhaseChange, solveStart }: PlayerProps) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [cubeDisplayState, setCubeDisplayState] = useState<CubeState>(() => initialState)
  const [cubeKey, setCubeKey] = useState(0)
  const [phaseOverlay, setPhaseOverlay] = useState<number | null>(null)
  const [completed, setCompleted] = useState(false)
  const groupRef = useRef<THREE.Group | null>(null)
  const mq = useMoveQueue()
  const confetti = useMemo(() => makeConfetti(), [])

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
    const completedPhaseId = currentPhase.id

    setPhaseOverlay(completedPhaseId)
    setTimeout(() => setPhaseOverlay(null), 1500)
    onPhaseChange?.((nextIdx + 1) as 1 | 2 | 3 | 4)

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

  function handleComplete() {
    setCompleted(true)
    track('solve_completed')
  }

  // ── Celebration view ──────────────────────────────────────────────────────
  if (completed) {
    const elapsed = Math.round((Date.now() - solveStart) / 1000)
    const totalMoves = phases.reduce((sum, p) => sum + p.moves.length, 0)
    return (
      <div className="relative">
        <Confetti particles={confetti} />
        <div className="space-y-6">
          <div className="w-full h-[300px] sm:h-[450px] bg-white rounded border border-[var(--border)] shadow-sm">
            <Cube3D
              key="done"
              initialState={phases[phases.length - 1].stateAfter}
              moveQueue={[]}
              onMoveComplete={handleMoveComplete}
              groupRef={groupRef}
            />
          </div>
          <PhaseProgress currentPhase={4 as 1 | 2 | 3 | 4} phases={phases} />
          <div className="text-center space-y-1 py-4">
            <p
              className="font-bold text-[var(--fg)]"
              style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}
            >
              {sv.solve.done}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {sv.solve.celebrationDone} {totalMoves} {sv.solve.celebrationMovesUnit} {formatElapsed(elapsed)}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => { clearSession(); navigate?.('/input') }}
              className="py-3 text-sm font-semibold bg-[var(--accent)] text-white rounded hover:opacity-90 active:scale-[0.98] transition-all duration-150"
            >
              {sv.solve.solveAnother}
            </button>
            <button
              onClick={() => navigate?.('/')}
              className="py-3 text-sm border border-[var(--border)] rounded hover:bg-gray-50 active:scale-[0.98] transition-all duration-150"
            >
              {sv.solve.backToStart}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Normal play view ──────────────────────────────────────────────────────
  const algorithmStr = currentPhase.moves.map(moveToNotation).join(' ') || '—'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {phaseOverlay !== null && <PhaseOverlay phaseId={phaseOverlay} />}

      {/* Left: sticky cube */}
      <div>
        <div className="md:sticky md:top-20">
          <div className="w-full h-[300px] sm:h-[450px] bg-white rounded border border-[var(--border)] shadow-sm">
            <Cube3D
              key={cubeKey}
              initialState={cubeDisplayState}
              moveQueue={mq.queue}
              onMoveComplete={handleMoveComplete}
              groupRef={groupRef}
            />
          </div>
        </div>
      </div>

      {/* Right: phase info + controls */}
      <div className="space-y-4">
        <PhaseProgress currentPhase={currentPhase.id} phases={phases} />

        <div className="border border-[var(--border)] rounded-lg p-5 bg-white space-y-3">
          <div>
            <p className="text-xs text-[var(--muted)] mb-1">
              {sv.solve.phase} {currentPhase.id} {sv.solve.of} {phases.length}
            </p>
            <h2
              className="font-bold text-[var(--fg)]"
              style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1.1 }}
            >
              {sv.phases[currentPhase.id]}
            </h2>
          </div>
          <p className="text-sm text-[var(--fg)]">
            <span className="font-medium">{sv.solve.algorithm}: </span>
            <span
              className="text-xs break-all"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {algorithmStr}
            </span>
          </p>
          <p className="text-xs text-[var(--muted)]">
            {currentPhase.moves.length} {sv.solve.moves}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={playPhase}
            disabled={mq.isAnimating || currentPhase.moves.length === 0}
            className="py-2.5 text-sm bg-[var(--fg)] text-white rounded hover:opacity-80 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150"
          >
            {sv.solve.play}
          </button>
          <button
            onClick={skipToEnd}
            className="py-2.5 text-sm border border-[var(--border)] rounded hover:bg-gray-50 active:scale-[0.98] transition-all duration-150"
          >
            {sv.solve.skip}
          </button>
          <button
            onClick={goPrev}
            disabled={isFirstPhase || mq.isAnimating}
            className="py-2.5 text-sm border border-[var(--border)] rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150"
          >
            {'←'} {sv.solve.prev}
          </button>
          <button
            onClick={isLastPhase ? handleComplete : goNext}
            disabled={mq.isAnimating}
            className="py-2.5 text-sm border border-[var(--border)] rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150"
          >
            {isLastPhase ? sv.solve.done : `${sv.solve.next} →`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function SolutionPlayer({ initialState, phases, mode = 'quick', navigate, onPhaseChange }: Props) {
  const solveStart = useRef(Date.now()).current
  if (mode === 'guided') {
    return (
      <GuidedPlayer
        initialState={initialState}
        phases={phases}
        navigate={navigate}
        onPhaseChange={onPhaseChange}
        solveStart={solveStart}
      />
    )
  }
  return (
    <QuickPlayer
      initialState={initialState}
      phases={phases}
      navigate={navigate}
      onPhaseChange={onPhaseChange}
      solveStart={solveStart}
    />
  )
}
