import { type CubeState } from '../cube/CubeState'
import { type MoveName } from '../cube/moves'

export type SavedSession = {
  version: 1
  level: 'guided' | 'quick'
  cubeState: CubeState
  solution: MoveName[]
  currentStepIndex: number
  phase: 1 | 2 | 3 | 4
  startedAt: string
  frustrationCount: { phase1: number; phase2: number; phase3: number; phase4: number }
}

const SESSION_KEY = 'idiotkuben:session'

export function saveSession(session: SavedSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedSession
    if (parsed.version !== 1) return null
    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function updateStep(stepIndex: number, phase: 1 | 2 | 3 | 4): void {
  const session = loadSession()
  if (!session) return
  saveSession({ ...session, currentStepIndex: stepIndex, phase })
}
