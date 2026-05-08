import { describe, it, expect } from 'vitest'
import type { MoveName } from '../../cube/moves'
import { getInstructionForMove } from '../instructions'

const ALL_MOVES: MoveName[] = [
  'U', 'Uprime', 'U2',
  'D', 'Dprime', 'D2',
  'R', 'Rprime', 'R2',
  'L', 'Lprime', 'L2',
  'F', 'Fprime', 'F2',
  'B', 'Bprime', 'B2',
]

describe('getInstructionForMove', () => {
  it('returns correct code for every move', () => {
    const codes: Record<MoveName, string> = {
      U: 'U', Uprime: "U'", U2: 'U2',
      D: 'D', Dprime: "D'", D2: 'D2',
      R: 'R', Rprime: "R'", R2: 'R2',
      L: 'L', Lprime: "L'", L2: 'L2',
      F: 'F', Fprime: "F'", F2: 'F2',
      B: 'B', Bprime: "B'", B2: 'B2',
    }
    for (const move of ALL_MOVES) {
      expect(getInstructionForMove(move, 'en').code).toBe(codes[move])
      expect(getInstructionForMove(move, 'sv').code).toBe(codes[move])
    }
  })

  it('EN — clockwise moves contain color name and "clockwise"', () => {
    expect(getInstructionForMove('U', 'en').primary).toBe('Turn the white side clockwise')
    expect(getInstructionForMove('D', 'en').primary).toBe('Turn the yellow side clockwise')
    expect(getInstructionForMove('F', 'en').primary).toBe('Turn the green side clockwise')
    expect(getInstructionForMove('B', 'en').primary).toBe('Turn the blue side clockwise')
    expect(getInstructionForMove('R', 'en').primary).toBe('Turn the red side clockwise')
    expect(getInstructionForMove('L', 'en').primary).toBe('Turn the orange side clockwise')
  })

  it('EN — prime moves contain "counter-clockwise"', () => {
    expect(getInstructionForMove('Uprime', 'en').primary).toBe('Turn the white side counter-clockwise')
    expect(getInstructionForMove('Fprime', 'en').primary).toBe('Turn the green side counter-clockwise')
    expect(getInstructionForMove('Bprime', 'en').primary).toBe('Turn the blue side counter-clockwise')
  })

  it('EN — double moves contain "twice"', () => {
    expect(getInstructionForMove('U2', 'en').primary).toBe('Turn the white side twice')
    expect(getInstructionForMove('R2', 'en').primary).toBe('Turn the red side twice')
    expect(getInstructionForMove('L2', 'en').primary).toBe('Turn the orange side twice')
  })

  it('SV — clockwise moves contain correct Swedish color + "medsols"', () => {
    expect(getInstructionForMove('U', 'sv').primary).toBe('Vrid den vita sidan medsols')
    expect(getInstructionForMove('D', 'sv').primary).toBe('Vrid den gula sidan medsols')
    expect(getInstructionForMove('F', 'sv').primary).toBe('Vrid den gröna sidan medsols')
    expect(getInstructionForMove('B', 'sv').primary).toBe('Vrid den blåa sidan medsols')
    expect(getInstructionForMove('R', 'sv').primary).toBe('Vrid den röda sidan medsols')
    expect(getInstructionForMove('L', 'sv').primary).toBe('Vrid den orange sidan medsols')
  })

  it('SV — prime moves contain "moturs"', () => {
    expect(getInstructionForMove('Uprime', 'sv').primary).toBe('Vrid den vita sidan moturs')
    expect(getInstructionForMove('Dprime', 'sv').primary).toBe('Vrid den gula sidan moturs')
    expect(getInstructionForMove('Rprime', 'sv').primary).toBe('Vrid den röda sidan moturs')
  })

  it('SV — double moves contain "två varv"', () => {
    expect(getInstructionForMove('U2', 'sv').primary).toBe('Vrid den vita sidan två varv')
    expect(getInstructionForMove('F2', 'sv').primary).toBe('Vrid den gröna sidan två varv')
    expect(getInstructionForMove('B2', 'sv').primary).toBe('Vrid den blåa sidan två varv')
  })

  it('returns { primary, code } for all 18 moves in both languages', () => {
    for (const move of ALL_MOVES) {
      for (const lang of ['en', 'sv'] as const) {
        const result = getInstructionForMove(move, lang)
        expect(typeof result.primary).toBe('string')
        expect(result.primary.length).toBeGreaterThan(0)
        expect(typeof result.code).toBe('string')
        expect(result.code.length).toBeGreaterThan(0)
      }
    }
  })
})
