import { useState, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { type CubeState, solvedState } from '../cube/CubeState'
import { type MoveName, INVERSE, ALL_MOVES } from '../cube/moves'
import { mulberry32 } from '../cube/prng'
import { verifyScene } from '../cube/verify'
import { sv } from '../i18n/sv'
import Cube3D from './Cube3D'
import { useMoveQueue } from './MoveQueue'

const MOVE_GROUPS: [string, MoveName, MoveName, MoveName][] = [
  ['U', 'U', 'Uprime', 'U2'],
  ['R', 'R', 'Rprime', 'R2'],
  ['F', 'F', 'Fprime', 'F2'],
  ['L', 'L', 'Lprime', 'L2'],
  ['D', 'D', 'Dprime', 'D2'],
  ['B', 'B', 'Bprime', 'B2'],
]

const MOVE_LABELS: Record<MoveName, string> = {
  U: 'U', Uprime: "U'", U2: 'U2',
  R: 'R', Rprime: "R'", R2: 'R2',
  F: 'F', Fprime: "F'", F2: 'F2',
  D: 'D', Dprime: "D'", D2: 'D2',
  L: 'L', Lprime: "L'", L2: 'L2',
  B: 'B', Bprime: "B'", B2: 'B2',
}

function stateHash(state: CubeState): number {
  const str = JSON.stringify(state)
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h >>> 0
}

export default function DemoPage() {
  const [cubeKey, setCubeKey] = useState(0)
  const [state, setState] = useState<CubeState>(solvedState)
  const [history, setHistory] = useState<MoveName[]>([])
  const [seedInput, setSeedInput] = useState(() => String(Math.floor(Math.random() * 99999)))
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; message: string } | null>(null)
  const groupRef = useRef<THREE.Group | null>(null)
  const mq = useMoveQueue()

  const handleMoveComplete = useCallback((moveId: number, newState: CubeState) => {
    setState(newState)
    mq.onMoveComplete(moveId)
    console.log('[state]', stateHash(newState))
  }, [mq])

  const enqueueMove = (move: MoveName) => {
    setHistory(h => [...h, move])
    mq.enqueue(move)
  }

  const handleReset = () => {
    const fresh = solvedState()
    setState(fresh)
    setHistory([])
    mq.clear()
    setVerifyResult(null)
    setCubeKey(k => k + 1)
  }

  const handleScramble = () => {
    const seed = parseInt(seedInput, 10)
    if (isNaN(seed)) return
    const rand = mulberry32(seed)
    const moves20: MoveName[] = Array.from({ length: 20 }, () => {
      const idx = Math.floor(rand() * ALL_MOVES.length)
      return ALL_MOVES[idx]
    })
    moves20.forEach(m => {
      setHistory(h => [...h, m])
      mq.enqueue(m)
    })
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const last = history[history.length - 1]
    const inv = INVERSE[last]
    setHistory(h => h.slice(0, -1))
    mq.enqueue(inv)
  }

  const handleVerify = () => {
    const g = groupRef.current
    if (!g) { setVerifyResult({ ok: false, message: 'Scenen hittades inte.' }); return }
    const result = verifyScene(state, g)
    if (result.ok) {
      setVerifyResult({ ok: true, message: sv.demo.verifyOk })
    } else {
      const details = result.mismatches
        .slice(0, 5)
        .map(m => `${m.face}[${m.index}]: expected ${m.expected}, got ${m.actual}`)
        .join('; ')
      setVerifyResult({ ok: false, message: `${sv.demo.verifyFail}: ${details}` })
    }
  }

  const lastMoves = history.slice(-8).map(m => MOVE_LABELS[m]).join(' ')

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#1A1A1A] p-6 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">{sv.demo.title}</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 3D cube */}
        <div className="w-full lg:w-[480px] h-[420px] bg-white rounded border border-gray-200 shadow-sm">
          <Cube3D
            key={cubeKey}
            initialState={state}
            moveQueue={mq.queue}
            onMoveComplete={handleMoveComplete}
            groupRef={groupRef}
          />
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-4">
          {/* Move buttons */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">{sv.demo.moves}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {MOVE_GROUPS.map(([, a, b, c]) => (
                <div key={a} className="flex gap-1">
                  {[a, b, c].map(m => (
                    <button
                      key={m}
                      onClick={() => enqueueMove(m as MoveName)}
                      className="flex-1 py-1.5 text-sm font-mono bg-white border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      {MOVE_LABELS[m as MoveName]}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              {sv.demo.reset}
            </button>
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {sv.demo.undo}
            </button>
            <button
              onClick={handleVerify}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              {sv.demo.verify}
            </button>
          </div>

          {/* Scramble */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleScramble}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              {sv.demo.scramble}
            </button>
            <span className="text-sm text-gray-500">seed =</span>
            <input
              type="number"
              value={seedInput}
              onChange={e => setSeedInput(e.target.value)}
              className="w-24 px-2 py-1 text-sm font-mono border border-gray-300 rounded"
            />
          </div>

          {/* Status */}
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium">{sv.demo.lastMoves}:</span>{' '}
              <span className="font-mono">{lastMoves || '—'}</span>
            </p>
            <p>
              <span className="font-medium">{sv.demo.queue}:</span> {mq.pendingCount} pending
              {mq.isAnimating && <span className="ml-2 text-blue-600">animerar...</span>}
            </p>
          </div>

          {/* Verify result */}
          {verifyResult && (
            <div className={`text-sm px-3 py-2 rounded border ${verifyResult.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {verifyResult.ok ? '✓' : '✗'} {verifyResult.message}
            </div>
          )}
        </div>
      </div>

      {/* State JSON */}
      <div className="mt-6">
        <details className="border border-gray-200 rounded">
          <summary className="px-4 py-2 text-sm font-medium cursor-pointer select-none">
            {sv.demo.state}
          </summary>
          <pre className="px-4 pb-4 pt-2 text-xs font-mono overflow-auto max-h-48 text-gray-700">
            {JSON.stringify(state, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
