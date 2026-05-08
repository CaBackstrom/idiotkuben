import { type CubeState, type StickerColor } from './CubeState'

const ALL_COLORS: StickerColor[] = ['U', 'R', 'F', 'D', 'L', 'B']

// Corner positions: each entry is [face0, idx0, face1, idx1, face2, idx2].
// Slot 0 is always the U or D face slot — used for orientation.
const CORNER_POSITIONS: [keyof CubeState, number, keyof CubeState, number, keyof CubeState, number][] = [
  ['U', 0, 'L', 0, 'B', 2], // ULB
  ['U', 2, 'B', 0, 'R', 2], // UBR
  ['U', 6, 'F', 0, 'L', 2], // UFL
  ['U', 8, 'R', 0, 'F', 2], // UFR
  ['D', 0, 'L', 8, 'F', 6], // DLF
  ['D', 2, 'F', 8, 'R', 6], // DFR
  ['D', 6, 'B', 8, 'L', 6], // DBL
  ['D', 8, 'R', 8, 'B', 6], // DRB
]

// Sorted color sets that identify each corner piece in solved state.
const HOME_CORNER_KEYS = [
  'BLU', 'BRU', 'FLU', 'FRU',
  'DFL', 'DFR', 'BDL', 'BDR',
]

// Edge positions: each entry is [face0, idx0, face1, idx1].
// Slot 0 is U/D face for U/D-layer edges; F/B face for E-slice edges.
const EDGE_POSITIONS: [keyof CubeState, number, keyof CubeState, number][] = [
  ['U', 1, 'B', 1], // UB
  ['U', 3, 'L', 1], // UL
  ['U', 5, 'R', 1], // UR
  ['U', 7, 'F', 1], // UF
  ['D', 1, 'F', 7], // DF
  ['D', 3, 'L', 7], // DL
  ['D', 5, 'R', 7], // DR
  ['D', 7, 'B', 7], // DB
  ['F', 3, 'L', 5], // FL  (E-slice)
  ['F', 5, 'R', 3], // FR  (E-slice)
  ['B', 3, 'R', 5], // BR  (E-slice)
  ['B', 5, 'L', 3], // BL  (E-slice)
]

// Sorted color-pair keys for the 12 home edge pieces.
const HOME_EDGE_KEYS = [
  'BU', 'LU', 'RU', 'FU',
  'DF', 'DL', 'DR', 'BD',
  'FL', 'FR', 'BR', 'BL',
]

function colorKey2(a: StickerColor, b: StickerColor): string {
  return [a, b].sort().join('')
}

function colorKey3(a: StickerColor, b: StickerColor, c: StickerColor): string {
  return [a, b, c].sort().join('')
}

function permParity(perm: number[]): number {
  const n = perm.length
  const visited = new Array<boolean>(n).fill(false)
  let numCycles = 0
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      numCycles++
      let j = i
      while (!visited[j]) {
        visited[j] = true
        j = perm[j]
      }
    }
  }
  return (n - numCycles) % 2
}

export function isValidCubeState(state: CubeState): { valid: boolean; reason?: string } {
  // Check 1: each face has exactly 9 stickers
  for (const face of ALL_COLORS) {
    if (state[face].length !== 9) {
      return { valid: false, reason: `Face ${face} has ${state[face].length} stickers instead of 9.` }
    }
  }

  // Check 2: each color appears exactly 9 times
  const counts: Partial<Record<StickerColor, number>> = {}
  for (const face of ALL_COLORS) {
    for (const sticker of state[face]) {
      if (!ALL_COLORS.includes(sticker as StickerColor)) {
        return { valid: false, reason: `Unknown color "${sticker}" on face ${face}.` }
      }
      counts[sticker as StickerColor] = (counts[sticker as StickerColor] ?? 0) + 1
    }
  }
  for (const color of ALL_COLORS) {
    const n = counts[color] ?? 0
    if (n !== 9) {
      const colorName = COLOR_NAMES[color]
      return {
        valid: false,
        reason: `Du har ${n} ${colorName}-bitar — det ska vara exakt 9. Kontrollera att du inte blandat ihop färgerna.`,
      }
    }
  }

  // Check 3: all 6 centers are unique
  const centers = ALL_COLORS.map(f => state[f][4])
  const uniqueCenters = new Set(centers)
  if (uniqueCenters.size !== 6) {
    const dupes = ALL_COLORS.filter((_f, i) => centers.indexOf(centers[i]) !== i)
    return {
      valid: false,
      reason: `Två eller fler sidor har samma mittfärg (${dupes.join(', ')}).`,
    }
  }

  // Check 4: corner orientation — sum of all 8 corner orientations must be divisible by 3.
  // Orientation: 0 if U/D sticker is at slot 0 (U/D face), 1 if at slot 1, 2 if at slot 2.
  {
    let orientationSum = 0
    for (const [f0, i0, f1, i1, f2, i2] of CORNER_POSITIONS) {
      const s0 = state[f0][i0]
      const s1 = state[f1][i1]
      const s2 = state[f2][i2]
      if (s0 === 'U' || s0 === 'D') {
        orientationSum += 0
      } else if (s1 === 'U' || s1 === 'D') {
        orientationSum += 1
      } else if (s2 === 'U' || s2 === 'D') {
        orientationSum += 2
      }
      // If no U/D sticker found, piece is invalid — but color counts above would have
      // caught a state where no valid corner piece could be here.
    }
    if (orientationSum % 3 !== 0) {
      return {
        valid: false,
        reason: 'Ogiltigt hörnorienteringsvärde — en eller fler hörn är vridna fel.',
      }
    }
  }

  // Check 5: edge orientation — sum of all 12 edge orientations must be even.
  // Kociemba definition: each edge's "primary" sticker is U if the piece has U, D if it
  // has D, otherwise F or B (whichever the piece has). An edge is oriented (ori=0) iff
  // its primary sticker is at slot 0 of its current position. This is consistent with the
  // fact that only F/B quarter-turns change edge orientation.
  {
    let orientationSum = 0
    for (const [f0, i0, f1, i1] of EDGE_POSITIONS) {
      const s0 = state[f0][i0]
      const s1 = state[f1][i1]
      let primary: StickerColor
      if (s0 === 'U' || s1 === 'U') {
        primary = 'U'
      } else if (s0 === 'D' || s1 === 'D') {
        primary = 'D'
      } else if (s0 === 'F' || s1 === 'F') {
        primary = 'F'
      } else {
        primary = 'B'
      }
      if (s0 !== primary) orientationSum += 1
    }
    if (orientationSum % 2 !== 0) {
      return {
        valid: false,
        reason: 'Ogiltigt kantorienteringsvärde — en eller fler kanter är vridna fel.',
      }
    }
  }

  // Check 6: permutation parity — corner parity must equal edge parity.
  {
    const cornerPerm: number[] = new Array(8).fill(-1)
    for (let i = 0; i < 8; i++) {
      const [f0, i0, f1, i1, f2, i2] = CORNER_POSITIONS[i]
      const key = colorKey3(state[f0][i0], state[f1][i1], state[f2][i2])
      const homeIdx = HOME_CORNER_KEYS.indexOf(key)
      if (homeIdx === -1) {
        return { valid: false, reason: 'Ogiltigt hörnställning — ommöjlig färgkombination på ett hörn.' }
      }
      cornerPerm[i] = homeIdx
    }

    const edgePerm: number[] = new Array(12).fill(-1)
    for (let i = 0; i < 12; i++) {
      const [f0, i0, f1, i1] = EDGE_POSITIONS[i]
      const key = colorKey2(state[f0][i0], state[f1][i1])
      const homeIdx = HOME_EDGE_KEYS.indexOf(key)
      if (homeIdx === -1) {
        return { valid: false, reason: 'Ogiltigt kantstickersställning — ommöjlig färgkombination på en kant.' }
      }
      edgePerm[i] = homeIdx
    }

    const cp = permParity(cornerPerm)
    const ep = permParity(edgePerm)
    if (cp !== ep) {
      return {
        valid: false,
        reason: 'Paritetsfel — kuben är omöjlig att lösa. Kontrollera att du inte bytt plats på några bitar.',
      }
    }
  }

  return { valid: true }
}

const COLOR_NAMES: Record<StickerColor, string> = {
  U: 'vita', R: 'röda', F: 'gröna', D: 'gula', L: 'orange', B: 'blåa',
}
