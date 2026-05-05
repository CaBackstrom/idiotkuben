import Cube from 'cubejs'
import { type CubeState } from '../cube/CubeState'
import { type MoveName } from '../cube/moves'
import { parseNotation } from '../cube/notation'
import { isCubeSolved } from '../cube/queries'

let initialized = false

function ensureInit(): void {
  if (!initialized) {
    Cube.initSolver()
    initialized = true
  }
}

function toCubejsString(state: CubeState): string {
  return (
    state.U.join('') +
    state.R.join('') +
    state.F.join('') +
    state.D.join('') +
    state.L.join('') +
    state.B.join('')
  )
}

export function solveFromState(state: CubeState): MoveName[] {
  if (isCubeSolved(state)) return []
  ensureInit()
  const cube = Cube.fromString(toCubejsString(state))
  const solution: string = cube.solve()
  if (!solution || solution.trim() === '') return []
  return parseNotation(solution)
}
