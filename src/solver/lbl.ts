import type { CubeState } from '../cube/CubeState';
import { type MoveName, Moves, ALL_MOVES } from '../cube/moves';
import { isCubeSolved, isWhiteCrossSolved, isFirstLayerSolved, isF2LSolved } from '../cube/queries';

// ── Flat-54 representation ────────────────────────────────────────────────
// Faces in order: U(0-8), R(9-17), F(18-26), D(27-35), L(36-44), B(45-53)
// Colors: U=0, R=1, F=2, D=3, L=4, B=5

const FACE_NAMES: (keyof CubeState)[] = ['U', 'R', 'F', 'D', 'L', 'B']
const TO_NUM: Record<string, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 }
const TO_COLOR = ['U', 'R', 'F', 'D', 'L', 'B'] as const

function stateToFlat(s: CubeState): Uint8Array {
  const f = new Uint8Array(54)
  for (let fi = 0; fi < 6; fi++) {
    const face = FACE_NAMES[fi]
    for (let i = 0; i < 9; i++) f[fi * 9 + i] = TO_NUM[s[face][i]]
  }
  return f
}

function flatToState(f: Uint8Array): CubeState {
  const s: any = {}
  for (let fi = 0; fi < 6; fi++) {
    s[FACE_NAMES[fi]] = Array.from(f.subarray(fi * 9, fi * 9 + 9)).map(c => TO_COLOR[c]) as any
  }
  return s as CubeState
}

// Pull permutation: result[i] = input[perm[i]]
function applyP(f: Uint8Array, p: Uint8Array): Uint8Array {
  const r = new Uint8Array(54)
  for (let i = 0; i < 54; i++) r[i] = f[p[i]]
  return r
}

// Compute pull permutation for a single move by probing with a tagged state
function computeMovePerm(fn: (s: CubeState) => CubeState): Uint8Array {
  const p = new Uint8Array(54)
  const base = new Uint8Array(54).fill(3) // all 'D'
  for (let i = 0; i < 54; i++) {
    const probe = base.slice()
    probe[i] = 0 // mark position i with 'U'
    const result = stateToFlat(fn(flatToState(probe)))
    for (let j = 0; j < 54; j++) {
      if (result[j] === 0) { p[j] = i; break }
    }
  }
  return p
}

// Compose: apply moves in sequence → combined pull perm
function computeSeqPerm(moves: MoveName[]): Uint8Array {
  let acc = Uint8Array.from({ length: 54 }, (_, i) => i)
  for (const m of moves) {
    const mp = MOVE_PERMS[m]
    const next = new Uint8Array(54)
    for (let i = 0; i < 54; i++) next[i] = acc[mp[i]]
    acc = next
  }
  return acc
}

// ── Precomputed move permutations ─────────────────────────────────────────
const MOVE_PERMS = {} as Record<MoveName, Uint8Array>
for (const n of Object.keys(Moves) as MoveName[]) MOVE_PERMS[n] = computeMovePerm(Moves[n])

const ALL_MOVE_PERMS = ALL_MOVES.map(m => MOVE_PERMS[m])

function applyMoves(s: CubeState, moves: MoveName[]): CubeState {
  return moves.reduce((cur, m) => Moves[m](cur), s)
}

function applyMovesFlat(f: Uint8Array, moves: MoveName[]): Uint8Array {
  return moves.reduce((cur, m) => applyP(cur, MOVE_PERMS[m]), f)
}

// ── Hash functions (flat) ─────────────────────────────────────────────────
// Face offsets: U=0 R=9 F=18 D=27 L=36 B=45

// Cross: 12 edge-pair slots, marked when U(=0) sticker is present
function crossHashF(f: Uint8Array): string {
  const slots: [number, number][] = [
    [1,46],[3,37],[5,10],[7,19],
    [28,25],[30,43],[32,16],[34,52],
    [21,41],[23,12],[48,14],[50,39],
  ]
  return slots.map(([a, b]) => {
    const va = f[a], vb = f[b]
    return (va === 0 || vb === 0) ? `${a}${va}${vb}` : '__'
  }).join('')
}

// All 8 corners' stickers (for cross-safe BFS deduplication)
function cornersHashF(f: Uint8Array): string {
  const c: [number, number, number][] = [
    [0,36,47],[2,45,11],[6,18,38],[8,9,20],
    [27,44,24],[29,26,15],[33,53,42],[35,17,51],
  ]
  return c.map(([a, b, d]) => `${f[a]}${f[b]}${f[d]}`).join('')
}

// Middle edges + D-layer edges + D-layer corners (28 stickers)
function midEdgesHashF(f: Uint8Array): string {
  return [
    f[21],f[41],f[23],f[12],f[48],f[14],f[50],f[39],
    f[28],f[25],f[30],f[43],f[32],f[16],f[34],f[52],
    f[27],f[24],f[44],f[29],f[15],f[26],
    f[33],f[42],f[53],f[35],f[51],f[17],
  ].join('')
}

// 21 last-layer stickers (D face + bottom rows of F,R,B,L)
function lastLayerHashF(f: Uint8Array): string {
  return [
    f[27],f[28],f[29],f[30],f[31],f[32],f[33],f[34],f[35],
    f[24],f[25],f[26],f[15],f[16],f[17],
    f[51],f[52],f[53],f[42],f[43],f[44],
  ].join('')
}

// ── Solved-state checks (flat) ────────────────────────────────────────────
function crossSolvedF(f: Uint8Array): boolean {
  return f[1]===0&&f[3]===0&&f[5]===0&&f[7]===0 &&
    f[19]===f[22]&&f[10]===f[13]&&f[46]===f[49]&&f[37]===f[40]
}

function f2lSolvedF(f: Uint8Array): boolean {
  const cf=f[22], cr=f[13], cb=f[49], cl=f[40]
  return (
    f[1]===0&&f[3]===0&&f[5]===0&&f[7]===0 &&
    f[0]===0&&f[2]===0&&f[6]===0&&f[8]===0 &&
    f[19]===cf&&f[10]===cr&&f[46]===cb&&f[37]===cl &&
    f[18]===cf&&f[20]===cf&&f[9]===cr&&f[11]===cr &&
    f[45]===cb&&f[47]===cb&&f[36]===cl&&f[38]===cl &&
    f[21]===cf&&f[23]===cf&&f[12]===cr&&f[14]===cr &&
    f[48]===cb&&f[50]===cb&&f[39]===cl&&f[41]===cl
  )
}

function cubeSolvedF(f: Uint8Array): boolean {
  for (let fi = 0; fi < 6; fi++) {
    const c = f[fi * 9 + 4]
    for (let i = 0; i < 9; i++) if (f[fi * 9 + i] !== c) return false
  }
  return true
}

// ── Macro permutation tables ───────────────────────────────────────────────
const CROSS_SAFE_MACROS: MoveName[][] = [
  ['D'],['Dprime'],['D2'],
  ['R','D','Rprime'],['R','Dprime','Rprime'],['R','D2','Rprime'],
  ['F','D','Fprime'],['F','Dprime','Fprime'],['F','D2','Fprime'],
  ['L','D','Lprime'],['L','Dprime','Lprime'],['L','D2','Lprime'],
  ['B','D','Bprime'],['B','Dprime','Bprime'],['B','D2','Bprime'],
]
const CROSS_SAFE_PERMS = CROSS_SAFE_MACROS.map(computeSeqPerm)

const FIRST_LAYER_SAFE_MACROS: MoveName[][] = [
  ['D'],['Dprime'],['D2'],
  ['Dprime','Rprime','D','R','D','F','Dprime','Fprime'],   // FR-right
  ['F','D','Fprime','Dprime','Rprime','Dprime','R'],        // FR-left
  ['Dprime','Bprime','D','B','D','R','Dprime','Rprime'],   // BR-right
  ['R','D','Rprime','Dprime','Bprime','Dprime','B'],        // BR-left
  ['Dprime','Lprime','D','L','D','B','Dprime','Bprime'],   // BL-right
  ['B','D','Bprime','Dprime','Lprime','Dprime','L'],        // BL-left
  ['Dprime','Fprime','D','F','D','L','Dprime','Lprime'],   // FL-right
  ['L','D','Lprime','Dprime','Fprime','Dprime','F'],        // FL-left
]
const FIRST_LAYER_SAFE_PERMS = FIRST_LAYER_SAFE_MACROS.map(computeSeqPerm)

const F2L_SAFE_MACROS: MoveName[][] = [
  ['D'],['Dprime'],['D2'],
  ['R','D','Rprime','D','R','D2','Rprime'],                                                              // D-Sune
  ['Rprime','Dprime','R','Dprime','Rprime','D2','R'],                                                    // D-Anti-Sune
  ['Lprime','Dprime','L','Dprime','Lprime','D2','L'],                                                    // D-L-Sune
  ['L','D','Lprime','D','L','D2','Lprime'],                                                              // D-L-Anti-Sune
  ['B','R','D','Rprime','Dprime','Bprime'],                                                               // D-OLL edge pair
  ['B','D','R','Dprime','Rprime','Bprime'],                                                               // D-OLL edge pair (inverse)
  ['R','D','Rprime','Dprime','Rprime','B','R2','Dprime','Rprime','Dprime','R','D','Rprime','Bprime'],    // D-T-perm
]
const F2L_SAFE_PERMS = F2L_SAFE_MACROS.map(computeSeqPerm)

// ── BFS path reconstruction helper ───────────────────────────────────────
type BFSNode = { f: Uint8Array; parent: number; mi: number; depth: number }

function reconstructMacros(nodes: BFSNode[], qi: number, goalMi: number, macroTable: MoveName[][]): MoveName[] {
  const macs: number[] = [goalMi]
  let idx = qi
  while (nodes[idx].parent !== -1) { macs.push(nodes[idx].mi); idx = nodes[idx].parent }
  macs.reverse()
  return macs.flatMap(m => macroTable[m])
}

// ── Phase 1: White cross ──────────────────────────────────────────────────
export function solveWhiteCross(state: CubeState): MoveName[] {
  if (isWhiteCrossSolved(state)) return []

  const start = stateToFlat(state)
  const nodes: BFSNode[] = [{ f: start, parent: -1, mi: -1, depth: 0 }]
  const visited = new Map<string, number>([[crossHashF(start), 0]])
  let qi = 0

  while (qi < nodes.length) {
    const node = nodes[qi]
    if (node.depth >= 10) { qi++; continue }
    for (let mi = 0; mi < ALL_MOVES.length; mi++) {
      const next = applyP(node.f, ALL_MOVE_PERMS[mi])
      if (crossSolvedF(next)) {
        const mvs: MoveName[] = [ALL_MOVES[mi]]
        let idx = qi
        while (nodes[idx].parent !== -1) { mvs.push(ALL_MOVES[nodes[idx].mi]); idx = nodes[idx].parent }
        mvs.reverse()
        return mvs
      }
      const h = crossHashF(next)
      if (visited.has(h)) continue
      visited.set(h, nodes.length)
      nodes.push({ f: next, parent: qi, mi, depth: node.depth + 1 })
    }
    qi++
  }
  return []
}

// ── Phase 2: White corners ────────────────────────────────────────────────
// Per-corner goals: URF → UFL → UBL → UBR
const CORNER_GOALS: Array<(f: Uint8Array) => boolean> = [
  f => f[8]===0&&f[9]===1&&f[20]===2,  // URF: U[8], R[0], F[2]
  f => f[6]===0&&f[18]===2&&f[38]===4, // UFL: U[6], F[0], L[2]
  f => f[0]===0&&f[36]===4&&f[47]===5, // UBL: U[0], L[0], B[2]
  f => f[2]===0&&f[45]===5&&f[11]===1, // UBR: U[2], B[0], R[2]
]

function solveOneCornerF(startF: Uint8Array, targetIdx: number): MoveName[] {
  const goals = CORNER_GOALS.slice(0, targetIdx + 1)
  const allMet = (f: Uint8Array) => goals.every(g => g(f))
  if (allMet(startF)) return []

  const nodes: BFSNode[] = [{ f: startF, parent: -1, mi: -1, depth: 0 }]
  const visited = new Set<string>([cornersHashF(startF)])
  let qi = 0

  while (qi < nodes.length) {
    const { f: cur } = nodes[qi]
    for (let mi = 0; mi < CROSS_SAFE_PERMS.length; mi++) {
      const next = applyP(cur, CROSS_SAFE_PERMS[mi])
      if (allMet(next)) return reconstructMacros(nodes, qi, mi, CROSS_SAFE_MACROS)
      const h = cornersHashF(next)
      if (visited.has(h)) continue
      visited.add(h)
      nodes.push({ f: next, parent: qi, mi, depth: 0 })
    }
    qi++
  }
  return []
}

export function solveWhiteCorners(state: CubeState): MoveName[] {
  if (isFirstLayerSolved(state)) return []

  const allMoves: MoveName[] = []
  let flat = stateToFlat(state)
  for (let i = 0; i < 4; i++) {
    const mvs = solveOneCornerF(flat, i)
    allMoves.push(...mvs)
    flat = applyMovesFlat(flat, mvs)
  }
  return allMoves
}

// ── Phase 3: Middle layer ─────────────────────────────────────────────────
export function solveMiddleLayer(state: CubeState): MoveName[] {
  if (isF2LSolved(state)) return []

  const start = stateToFlat(state)
  const nodes: BFSNode[] = [{ f: start, parent: -1, mi: -1, depth: 0 }]
  const visited = new Map<string, number>([[midEdgesHashF(start), 0]])
  let qi = 0

  while (qi < nodes.length) {
    const { f: cur } = nodes[qi]
    for (let mi = 0; mi < FIRST_LAYER_SAFE_PERMS.length; mi++) {
      const next = applyP(cur, FIRST_LAYER_SAFE_PERMS[mi])
      if (f2lSolvedF(next)) return reconstructMacros(nodes, qi, mi, FIRST_LAYER_SAFE_MACROS)
      const h = midEdgesHashF(next)
      if (visited.has(h)) continue
      visited.set(h, nodes.length)
      nodes.push({ f: next, parent: qi, mi, depth: 0 })
    }
    qi++
  }
  return []
}

// ── Phase 4: Yellow side ──────────────────────────────────────────────────
export function solveYellowSide(state: CubeState): MoveName[] {
  if (isCubeSolved(state)) return []

  const start = stateToFlat(state)
  const nodes: BFSNode[] = [{ f: start, parent: -1, mi: -1, depth: 0 }]
  const visited = new Map<string, number>([[lastLayerHashF(start), 0]])
  let qi = 0

  while (qi < nodes.length) {
    const { f: cur } = nodes[qi]
    for (let mi = 0; mi < F2L_SAFE_PERMS.length; mi++) {
      const next = applyP(cur, F2L_SAFE_PERMS[mi])
      if (cubeSolvedF(next)) return reconstructMacros(nodes, qi, mi, F2L_SAFE_MACROS)
      const h = lastLayerHashF(next)
      if (visited.has(h)) continue
      visited.set(h, nodes.length)
      nodes.push({ f: next, parent: qi, mi, depth: 0 })
    }
    qi++
  }
  return []
}

export function solveLayerByLayer(state: CubeState): MoveName[] {
  const p1 = solveWhiteCross(state)
  const s1 = applyMoves(state, p1)
  const p2 = solveWhiteCorners(s1)
  const s2 = applyMoves(s1, p2)
  const p3 = solveMiddleLayer(s2)
  const s3 = applyMoves(s2, p3)
  const p4 = solveYellowSide(s3)
  return [...p1, ...p2, ...p3, ...p4]
}
