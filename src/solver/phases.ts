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
  let state = cloneState(initialState)
  const phaseChecks = [isWhiteCrossSolved, isFirstLayerSolved, isF2LSolved]
  const phaseNameKeys = ['phase1', 'phase2', 'phase3', 'phase4']

  const phases: Phase[] = []
  let moveIdx = 0

  for (let p = 0; p < 4; p++) {
    const phaseMoves: MoveName[] = []

    if (p < 3) {
      const check = phaseChecks[p]
      while (moveIdx < solution.length && !check(state)) {
        const move = solution[moveIdx]
        phaseMoves.push(move)
        state = Moves[move](state)
        moveIdx++
      }
    } else {
      while (moveIdx < solution.length) {
        const move = solution[moveIdx]
        phaseMoves.push(move)
        state = Moves[move](state)
        moveIdx++
      }
    }

    phases.push({
      id: (p + 1) as 1 | 2 | 3 | 4,
      nameKey: phaseNameKeys[p],
      moves: phaseMoves,
      stateAfter: cloneState(state),
    })
  }

  return phases
}
