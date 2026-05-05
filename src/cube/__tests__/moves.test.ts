import { solvedState } from '../CubeState'
import { Moves, ALL_MOVES, type MoveName } from '../moves'
import { parseNotation } from '../notation'
import { isValidCubeState } from '../validate'
import { isCubeSolved } from '../queries'

function applyN(move: MoveName, n: number) {
  let s = solvedState()
  for (let i = 0; i < n; i++) s = Moves[move](s)
  return s
}

function statesEqual(a: ReturnType<typeof solvedState>, b: ReturnType<typeof solvedState>): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

describe('moves', () => {
  test('R applied 4 times returns identity', () => {
    expect(statesEqual(applyN('R', 4), solvedState())).toBe(true)
  })

  test('Rprime applied 4 times returns identity', () => {
    expect(statesEqual(applyN('Rprime', 4), solvedState())).toBe(true)
  })

  test('U2 equals U U', () => {
    const a = Moves.U2(solvedState())
    const b = Moves.U(Moves.U(solvedState()))
    expect(statesEqual(a, b)).toBe(true)
  })

  test('all 18 moves applied 4 times return identity', () => {
    for (const move of ALL_MOVES) {
      const cycles = move.endsWith('2') ? 2 : 4
      expect(statesEqual(applyN(move, cycles), solvedState())).toBe(true)
    }
  })

  test('(R U Rprime Uprime) x6 returns identity', () => {
    let s = solvedState()
    for (let i = 0; i < 6; i++) {
      s = Moves.R(s)
      s = Moves.U(s)
      s = Moves.Rprime(s)
      s = Moves.Uprime(s)
    }
    expect(statesEqual(s, solvedState())).toBe(true)
  })

  test('a move and its inverse cancel', () => {
    const moves: Array<[MoveName, MoveName]> = [
      ['U', 'Uprime'], ['R', 'Rprime'], ['F', 'Fprime'],
      ['D', 'Dprime'], ['L', 'Lprime'], ['B', 'Bprime'],
    ]
    for (const [m, inv] of moves) {
      const s = Moves[inv](Moves[m](solvedState()))
      expect(statesEqual(s, solvedState())).toBe(true)
    }
  })

  test('each move produces a non-solved state', () => {
    for (const move of ALL_MOVES) {
      const s = Moves[move](solvedState())
      expect(isCubeSolved(s)).toBe(false)
    }
  })
})

describe('notation', () => {
  test("parses \"R U R' U2\" into 4 moves", () => {
    expect(parseNotation("R U R' U2")).toEqual(['R', 'U', 'Rprime', 'U2'])
  })

  test('throws on invalid token', () => {
    expect(() => parseNotation('R X U')).toThrow(/Invalid move token/)
  })

  test('handles extra whitespace', () => {
    expect(parseNotation('  R   U  ')).toEqual(['R', 'U'])
  })
})

describe('validate', () => {
  test('solved state is valid', () => {
    expect(isValidCubeState(solvedState()).valid).toBe(true)
  })

  test('detects wrong color count', () => {
    const s = solvedState()
    s.U[0] = 'R' // one extra R, one fewer U
    const result = isValidCubeState(s)
    expect(result.valid).toBe(false)
    // Validator reports count 8 for U (first offender found)
    expect(result.reason).toMatch(/8/)
  })

  test('detects duplicate centers', () => {
    const s = solvedState()
    // Swap U center and a non-center R sticker so counts stay at 9
    // but both U and R faces now have center color R
    s.U[4] = 'R'  // U face center → red
    s.R[0] = 'U'  // compensate so R count stays 9
    const result = isValidCubeState(s)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/mittf/)
  })
})
