import { describe, test, expect } from 'vitest'
import { solvedState, type CubeState } from '../CubeState'
import { Moves } from '../moves'
import { isValidCubeState } from '../validate'

describe('isValidCubeState — basic', () => {
  test('solved state is valid', () => {
    expect(isValidCubeState(solvedState())).toEqual({ valid: true })
  })

  test('after each of the 6 basic moves, state is valid', () => {
    for (const move of ['R', 'U', 'F', 'L', 'D', 'B'] as const) {
      expect(isValidCubeState(Moves[move](solvedState()))).toEqual({ valid: true })
    }
  })

  test('20-move scramble produces valid state', () => {
    let s: CubeState = solvedState()
    const seq = ['R', 'U', 'F', 'Rprime', 'Uprime', 'Fprime',
                 'R2', 'U2', 'D', 'L', 'B', 'Dprime',
                 'Lprime', 'Bprime', 'D2', 'L2', 'B2', 'R', 'U', 'F'] as const
    for (const m of seq) s = Moves[m](s)
    expect(isValidCubeState(s)).toEqual({ valid: true })
  })
})

describe('isValidCubeState — color count errors', () => {
  test('detects wrong color count', () => {
    const bad = solvedState()
    bad.U[0] = 'R'  // now 10 R, 8 U
    const result = isValidCubeState(bad)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/9/)
  })

  test('detects duplicate centers', () => {
    const bad = solvedState()
    bad.R[4] = 'U'  // two U centers
    const result = isValidCubeState(bad)
    expect(result.valid).toBe(false)
  })
})

describe('isValidCubeState — corner orientation parity', () => {
  test('detects impossible corner twist', () => {
    // Twist UFR corner CW (when viewed from outside):
    // UFR slots: U[8], R[0], F[2]. CW twist: U[8]←R, R[0]←F, F[2]←U
    // Color counts unchanged (one cycle of 3 distinct colors).
    const bad = solvedState()
    bad.U[8] = 'R'
    bad.R[0] = 'F'
    bad.F[2] = 'U'
    const result = isValidCubeState(bad)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/hörnorienter/)
  })
})

describe('isValidCubeState — edge orientation parity', () => {
  test('detects single flipped edge', () => {
    // Flip UF edge: swap U[7] and F[1]. Color counts unchanged (swap within pair).
    const bad = solvedState()
    bad.U[7] = 'F'
    bad.F[1] = 'U'
    const result = isValidCubeState(bad)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/kantorienter/)
  })
})

describe('isValidCubeState — permutation parity', () => {
  test('detects two edges swapped (one transposition)', () => {
    // Swap UF and UR pieces while keeping orientations.
    // UF edge: U[7]=U, F[1]=F.  UR edge: U[5]=U, R[1]=R.
    // Swap non-U stickers to keep orientations: F[1]↔R[1]
    const bad = solvedState()
    bad.F[1] = 'R'
    bad.R[1] = 'F'
    // Color counts: F loses F[1]=F, gains R[1]=F → same; R loses R[1]=R, gains F[1]=R → same
    const result = isValidCubeState(bad)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/paritet/i)
  })
})
