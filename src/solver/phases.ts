import { type CubeState, cloneState } from '../cube/CubeState'
import { Moves, type MoveName } from '../cube/moves'
import { isWhiteCrossSolved, isFirstLayerSolved, isF2LSolved } from '../cube/queries'

export type Phase = {
  id: 1 | 2 | 3 | 4
  nameKey: string
  moves: MoveName[]
  stateAfter: CubeState
}

export function sliceIntoPhases(initialState: CubeState, solution: MoveName[]): Phase[] {
  const n = solution.length

  // Pre-compute every intermediate state
  const states: CubeState[] = [cloneState(initialState)]
  for (const m of solution) {
    states.push(Moves[m](states[states.length - 1]))
  }

  // Scan backwards: find the LAST index where each LBL condition is not yet satisfied.
  // boundary = that index + 1 (= first state where it IS satisfied).
  // Using backwards scan rather than forwards so that Kociemba solutions — which often
  // satisfy all conditions simultaneously in the last 1-2 moves — still get natural splits.
  function lastNotSat(check: (s: CubeState) => boolean, upTo: number): number {
    for (let i = upTo; i >= 0; i--) {
      if (!check(states[i])) return i
    }
    return -1
  }

  let b3 = Math.min(lastNotSat(isF2LSolved, n) + 1, n)
  let b2 = Math.min(lastNotSat(isFirstLayerSolved, Math.max(0, b3 - 1)) + 1, b3)
  let b1 = Math.min(lastNotSat(isWhiteCrossSolved, Math.max(0, b2 - 1)) + 1, b2)

  // Guarantee every phase gets at least 1 move when the solution is long enough.
  // This handles Kociemba solutions where all conditions become true simultaneously.
  if (n >= 4) {
    b3 = Math.min(b3, n - 1)
    b2 = Math.min(b2, b3 - 1)
    b1 = Math.min(b1, b2 - 1)
    b1 = Math.max(b1, 1)
    b2 = Math.max(b2, b1 + 1)
    b3 = Math.max(b3, b2 + 1)
  }

  return [
    { id: 1, nameKey: 'phase1', moves: solution.slice(0, b1),   stateAfter: cloneState(states[b1]) },
    { id: 2, nameKey: 'phase2', moves: solution.slice(b1, b2),  stateAfter: cloneState(states[b2]) },
    { id: 3, nameKey: 'phase3', moves: solution.slice(b2, b3),  stateAfter: cloneState(states[b3]) },
    { id: 4, nameKey: 'phase4', moves: solution.slice(b3),      stateAfter: cloneState(states[n])  },
  ]
}
