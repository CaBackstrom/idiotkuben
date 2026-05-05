import { type MoveName, Moves } from './moves'

const NOTATION_MAP: Record<string, MoveName> = {
  "U":  "U",  "U'": "Uprime", "U2": "U2",
  "R":  "R",  "R'": "Rprime", "R2": "R2",
  "F":  "F",  "F'": "Fprime", "F2": "F2",
  "D":  "D",  "D'": "Dprime", "D2": "D2",
  "L":  "L",  "L'": "Lprime", "L2": "L2",
  "B":  "B",  "B'": "Bprime", "B2": "B2",
}

export function parseNotation(input: string): MoveName[] {
  const tokens = input.trim().split(/\s+/).filter(Boolean)
  return tokens.map(token => {
    const move = NOTATION_MAP[token]
    if (!move) {
      throw new Error(`Invalid move token: "${token}"`)
    }
    return move
  })
}

export function moveToNotation(move: MoveName): string {
  const entry = Object.entries(NOTATION_MAP).find(([, v]) => v === move)
  return entry ? entry[0] : move
}

// Validate that a string is a valid MoveName at runtime.
export function isMoveName(s: string): s is MoveName {
  return s in Moves
}
