import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { type CubeState, type StickerColor } from '../cube/CubeState'
import { Moves, type MoveName } from '../cube/moves'
import { moveToNotation } from '../cube/notation'
import { mulberry32 } from '../cube/prng'
import { type Phase } from '../solver/phases'
import { updateStep, clearSession } from '../persistence/session'
import { useLanguage } from '../context/LanguageContext'
import { type Navigate } from '../pages/routes'
import { getInstructionForMove } from '../solver/instructions'
import PhaseTabs from './solve/PhaseTabs'
import Cube3D from './Cube3D'
import { useMoveQueue } from './MoveQueue'
import PhaseProgress from './PhaseProgress'
import TutorPanel from './TutorPanel'
import { track } from '../utils/telemetry'
import { sounds } from '../utils/sounds'

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

const RUBIK_COLORS = ['#FFFFFF', '#C8102E', '#009B48', '#FFCC00', '#FF5800', '#0046AD']

function makeConfetti() {
  const rand = mulberry32(42)
  return Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: rand() * 100,
    delay: 0.4 + rand() * 1.5,
    size: [8, 12, 16][Math.floor(rand() * 3)],
    color: RUBIK_COLORS[Math.floor(rand() * RUBIK_COLORS.length)],
    drift: (rand() - 0.5) * 80,
    rotateDir: rand() > 0.5 ? 1 : -1,
  }))
}

// ── Phase completion overlay ──────────────────────────────────────────────────

function PhaseOverlay({ phaseId, onDismiss }: { phaseId: number; onDismiss: () => void }) {
  const { t } = useLanguage()
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 cursor-pointer"
      style={{ background: 'rgba(26,26,26,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onDismiss}
    >
      <div className="phase-overlay-enter bg-white border border-[var(--border)] rounded-xl px-8 py-5 text-center shadow-lg">
        <div
          className="text-2xl font-bold text-[var(--accent)] mb-1"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {'✓'}
        </div>
        <p className="font-bold text-base" style={{ fontFamily: 'var(--font-display)' }}>
          {t('phaseComplete.prefix')} {phaseId} {t('phaseComplete.suffix')}
        </p>
        <p className="text-sm text-[var(--muted)] mt-0.5">{t(`phases.${phaseId}`)}</p>
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
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            '--drift': `${p.drift}px`,
            '--rotate-dir': p.rotateDir,
          } as React.CSSProperties}
        />
      ))}
    </>
  )
}

// ── Proactive tutor card ──────────────────────────────────────────────────────

function ProactiveCard({
  onAccept,
  onDismiss,
}: {
  onAccept: () => void
  onDismiss: () => void
}) {
  const { t } = useLanguage()
  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-50 w-72 bg-white border border-[var(--border)] rounded-xl shadow-lg p-4 space-y-3 animate-[fadeInUp_0.25s_ease-out]">
      <div>
        <p className="font-semibold text-sm text-[var(--fg)]">{t('tutor.stuckTitle')}</p>
        <p className="text-xs text-[var(--muted)] mt-0.5">{t('tutor.stuckBody')}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="flex-1 py-1.5 text-xs font-semibold bg-[var(--accent)] text-white rounded hover:opacity-90 transition-opacity"
        >
          {t('tutor.stuckYes')}
        </button>
        <button
          onClick={onDismiss}
          className="flex-1 py-1.5 text-xs border border-[var(--border)] rounded hover:bg-gray-50 transition-colors"
        >
          {t('tutor.stuckDismiss')}
        </button>
      </div>
    </div>
  )
}

// ── Guided mode ───────────────────────────────────────────────────────────────

function GuidedPlayer({ initialState, phases, navigate, onPhaseChange, solveStart }: PlayerProps) {
  const { t, lang } = useLanguage()
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

  // Proactive tutor state
  const [backCounts, setBackCounts] = useState<Record<number, number>>({})
  const [proactiveShown, setProactiveShown] = useState<Record<number, boolean>>({})
  const [showProactiveCard, setShowProactiveCard] = useState(false)
  const [tutorAutoQuestion, setTutorAutoQuestion] = useState<string | undefined>(undefined)

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

  // Proactive tutor trigger
  useEffect(() => {
    if ((backCounts[guidedStep] ?? 0) >= 3 && !proactiveShown[guidedStep]) {
      setShowProactiveCard(true)
      setProactiveShown(p => ({ ...p, [guidedStep]: true }))
    }
  }, [backCounts, guidedStep, proactiveShown])

  function handleNext() {
    if (mq.isAnimating || isDone || !currentMove) return
    sounds.click()
    mq.enqueue(currentMove)
    const newStep = guidedStep + 1
    const nextInfo = getPhaseAtStep(Math.min(newStep, totalMoves - 1), phases)

    if (nextInfo.phase.id !== currentPhase.id) {
      track('phase_completed', { phase: String(currentPhase.id) })
      setPhaseOverlay(currentPhase.id)
      sounds.phaseComplete()
      setTimeout(() => setPhaseOverlay(null), 1800)
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
    setBackCounts(c => ({ ...c, [guidedStep]: (c[guidedStep] ?? 0) + 1 }))
    setGuidedStep(newStep)
    setCubeDisplayState(guidedStates[newStep])
    setCubeKey(k => k + 1)
    mq.clear()
  }

  useEffect(() => {
    if (isDone) {
      sounds.solved()
      track('solve_completed')
    }
  }, [isDone])

  // Celebration view
  if (isDone) {
    const elapsed = Math.round((Date.now() - solveStart) / 1000)
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    const timeStr = mins > 0
      ? `${mins} ${t('solve.celebrationMinutes')}`
      : `${secs} ${t('solve.celebrationSeconds')}`
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
              celebrationMode
            />
          </div>
          <PhaseProgress currentPhase={4 as 1 | 2 | 3 | 4} phases={phases} />
          <div className="text-center space-y-1 py-4">
            <p
              className="font-bold text-[var(--fg)]"
              style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}
            >
              {t('guided.done')}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {t('solve.celebrationDone')} {totalMoves} {t('solve.celebrationMovesUnit')} {timeStr}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => { clearSession(); navigate?.('/input') }}
              className="py-3 text-sm font-semibold bg-[var(--accent)] text-white rounded hover:opacity-90 active:scale-[0.97] transition-all duration-150"
            >
              {t('solve.solveAnother')}
            </button>
            <button
              onClick={() => navigate?.('/')}
              className="py-3 text-sm border border-[var(--border)] rounded hover:bg-gray-50 active:scale-[0.97] transition-all duration-150"
            >
              {t('solve.backToStart')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Normal play view
  const instruction = currentMove ? getInstructionForMove(currentMove, lang) : null
  const activeFace: StickerColor | undefined = currentMove ? currentMove[0] as StickerColor : undefined
  const overallProgress = `${guidedStep + 1} / ${totalMoves}`
  const phaseProgress = `${phaseStep + 1} / ${phaseTotal}`
  const progressPct = (guidedStep / totalMoves) * 100

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {phaseOverlay !== null && <PhaseOverlay phaseId={phaseOverlay} onDismiss={() => setPhaseOverlay(null)} />}

      {showProactiveCard && (
        <ProactiveCard
          onAccept={() => {
            setShowProactiveCard(false)
            setTutorAutoQuestion(t('tutor.stuckQ'))
          }}
          onDismiss={() => setShowProactiveCard(false)}
        />
      )}

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
              activeFace={activeFace}
              showOrientationBadge
              isAnimating={mq.isAnimating}
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
          {t(`phases.${currentPhase.id}`)}
        </h2>

        <div ref={instructionRef} className="card-base space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-[var(--muted)]">
              {phaseProgress} {t('guided.stepOf')}
            </p>
            <div className="flex items-center gap-2">
              {moveMilestone !== null && (
                <span className="text-xs font-semibold text-[var(--accent)]">
                  {t('solve.movePrefix')} {moveMilestone} {'✓'}
                </span>
              )}
              <p className="text-xs text-[var(--muted)]">{overallProgress} {t('solve.total')}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span
              className="text-5xl font-bold text-[var(--fg)] leading-none"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {instruction?.code ?? '—'}
            </span>
            <p className="text-sm text-[var(--fg)]">
              {instruction?.primary}
              {instruction && (
                <span
                  className="ml-1 text-xs text-[var(--muted)]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  ({instruction.code})
                </span>
              )}
            </p>
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
            phaseName: t(`phases.${currentPhase.id}`),
            currentMove: instruction?.code ?? '—',
            explanation: instruction?.primary ?? '',
          }}
          autoQuestion={tutorAutoQuestion}
          onAutoQuestionHandled={() => setTutorAutoQuestion(undefined)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={handleBack}
            disabled={guidedStep === 0 || mq.isAnimating}
            className="py-2.5 text-sm border border-[var(--border)] rounded hover:bg-gray-50 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-150"
          >
            {'←'} {t('guided.back')}
          </button>
          <button
            onClick={handleNext}
            disabled={mq.isAnimating}
            className="min-h-[56px] sm:min-h-0 sm:py-2.5 py-4 text-sm font-medium bg-[var(--accent)] text-white rounded hover:opacity-90 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-150"
          >
            {t('guided.next')} {'→'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Quick mode ────────────────────────────────────────────────────────────────

function QuickPlayer({ initialState, phases, navigate, onPhaseChange, solveStart }: PlayerProps) {
  const { t } = useLanguage()
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
    sounds.click()
    currentPhase.moves.forEach(m => mq.enqueue(m))
  }

  function skipToEnd() {
    mq.clear()
    setCubeDisplayState(currentPhase.stateAfter)
    setCubeKey(k => k + 1)
  }

  function goNext() {
    if (isLastPhase) return
    sounds.phaseComplete()
    const nextIdx = phaseIdx + 1
    const completedPhaseId = currentPhase.id

    setPhaseOverlay(completedPhaseId)
    setTimeout(() => setPhaseOverlay(null), 1800)
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
    sounds.solved()
    setCompleted(true)
    track('solve_completed')
  }

  // Celebration view
  if (completed) {
    const elapsed = Math.round((Date.now() - solveStart) / 1000)
    const mins = Math.floor(elapsed / 60)
    const secs = elapsed % 60
    const timeStr = mins > 0
      ? `${mins} ${t('solve.celebrationMinutes')}`
      : `${secs} ${t('solve.celebrationSeconds')}`
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
              celebrationMode
            />
          </div>
          <PhaseProgress currentPhase={4 as 1 | 2 | 3 | 4} phases={phases} />
          <div className="text-center space-y-1 py-4">
            <p
              className="font-bold text-[var(--fg)]"
              style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}
            >
              {t('solve.done')}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {t('solve.celebrationDone')} {totalMoves} {t('solve.celebrationMovesUnit')} {timeStr}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => { clearSession(); navigate?.('/input') }}
              className="py-3 text-sm font-semibold bg-[var(--accent)] text-white rounded hover:opacity-90 active:scale-[0.97] transition-all duration-150"
            >
              {t('solve.solveAnother')}
            </button>
            <button
              onClick={() => navigate?.('/')}
              className="py-3 text-sm border border-[var(--border)] rounded hover:bg-gray-50 active:scale-[0.97] transition-all duration-150"
            >
              {t('solve.backToStart')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Normal play view
  const algorithmStr = currentPhase.moves.map(moveToNotation).join(' ') || '—'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {phaseOverlay !== null && <PhaseOverlay phaseId={phaseOverlay} onDismiss={() => setPhaseOverlay(null)} />}

      {/* Cube: order-2 on mobile (below info), order-1 on desktop (left column) */}
      <div className="order-2 md:order-1">
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

      {/* Controls: order-1 on mobile (above cube), order-2 on desktop (right column) */}
      <div className="order-1 md:order-2 space-y-4">
        {/* Solution header: rendered once above the phase card */}
        <PhaseTabs
          mode="quick"
          phases={phases}
          currentPhaseId={currentPhase.id}
          totalMoves={phases.reduce((s, p) => s + p.moves.length, 0)}
        />
        <div className="card-base space-y-3">
          <p className="text-sm text-[var(--fg)]">
            <span className="font-medium">{t('solve.algorithm')}: </span>
            <span
              className="text-xs break-all"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {algorithmStr}
            </span>
          </p>
          <p className="text-xs text-[var(--muted)]">
            {currentPhase.moves.length} {t('solve.moves')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={playPhase}
            disabled={mq.isAnimating || currentPhase.moves.length === 0}
            style={{ touchAction: 'manipulation' }}
            className="py-3 text-sm bg-[var(--fg)] text-white rounded hover:opacity-80 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-150"
          >
            {t('solve.play')}
          </button>
          <button
            onClick={skipToEnd}
            style={{ touchAction: 'manipulation' }}
            className="py-3 text-sm border border-[var(--border)] rounded hover:bg-gray-50 active:scale-[0.97] transition-all duration-150"
          >
            {t('solve.skip')}
          </button>
          <button
            onClick={goPrev}
            disabled={isFirstPhase || mq.isAnimating}
            style={{ touchAction: 'manipulation' }}
            className="py-3 text-sm border border-[var(--border)] rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-150"
          >
            {'←'} {t('solve.prev')}
          </button>
          <button
            onClick={isLastPhase ? handleComplete : goNext}
            disabled={mq.isAnimating}
            style={{ touchAction: 'manipulation' }}
            className="py-3 text-sm border border-[var(--border)] rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all duration-150"
          >
            {isLastPhase ? t('solve.done') : `${t('solve.next')} →`}
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
