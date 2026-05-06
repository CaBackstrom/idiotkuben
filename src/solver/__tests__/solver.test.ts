import { describe, test, expect } from 'vitest'
import { solvedState, type CubeState } from '../../cube/CubeState'
import { Moves, type MoveName, ALL_MOVES } from '../../cube/moves'
import { mulberry32 } from '../../cube/prng'
import { isCubeSolved } from '../../cube/queries'
import { solveFromState } from '../solve'
import { sliceIntoPhases } from '../phases'

// cubejs initSolver can take 2-5 seconds on first call
const SOLVER_TIMEOUT = 15000

function scramble(seed: number, numMoves = 20): CubeState {
  const rand = mulberry32(seed)
  let state = solvedState()
  for (let i = 0; i < numMoves; i++) {
    const idx = Math.floor(rand() * ALL_MOVES.length)
    state = Moves[ALL_MOVES[idx]](state)
  }
  return state
}

function applyMoves(state: CubeState, moves: MoveName[]): CubeState {
  let s = state
  for (const m of moves) s = Moves[m](s)
  return s
}

describe('solve', () => {
  test('solving a solved cube returns empty move list', () => {
    expect(solveFromState(solvedState())).toHaveLength(0)
  }, SOLVER_TIMEOUT)

  test('solution for a known scramble produces solved state', () => {
    const initial = scramble(29810)
    const solution = solveFromState(initial)
    expect(solution.length).toBeGreaterThan(0)
    expect(isCubeSolved(applyMoves(initial, solution))).toBe(true)
  }, SOLVER_TIMEOUT)

  test('solution for three different scrambles each produces solved state', () => {
    for (const seed of [1, 42, 9999]) {
      const initial = scramble(seed)
      const solution = solveFromState(initial)
      expect(isCubeSolved(applyMoves(initial, solution))).toBe(true)
    }
  }, SOLVER_TIMEOUT)
})

describe('phases', () => {
  test('phases sum to full solution length', () => {
    const initial = scramble(29810)
    const solution = solveFromState(initial)
    const phases = sliceIntoPhases(initial, solution)
    const total = phases.reduce((sum, p) => sum + p.moves.length, 0)
    expect(total).toBe(solution.length)
  }, SOLVER_TIMEOUT)

  test('stateAfter phase 4 is solved', () => {
    const initial = scramble(12345)
    const solution = solveFromState(initial)
    const phases = sliceIntoPhases(initial, solution)
    expect(isCubeSolved(phases[3].stateAfter)).toBe(true)
  }, SOLVER_TIMEOUT)

  test('phase ids are 1 2 3 4 in order', () => {
    const initial = scramble(54321)
    const solution = solveFromState(initial)
    const phases = sliceIntoPhases(initial, solution)
    expect(phases.map(p => p.id)).toEqual([1, 2, 3, 4])
  }, SOLVER_TIMEOUT)

  test('slicing a solved cube gives four phases each with 0 moves', () => {
    const phases = sliceIntoPhases(solvedState(), [])
    expect(phases).toHaveLength(4)
    expect(phases.every(p => p.moves.length === 0)).toBe(true)
  })

  test('all four phases have at least 1 move for a scrambled cube', () => {
    const initial = scramble(29810)
    const solution = solveFromState(initial)
    const phases = sliceIntoPhases(initial, solution)
    expect(phases.every(p => p.moves.length >= 1)).toBe(true)
  }, SOLVER_TIMEOUT)
})
