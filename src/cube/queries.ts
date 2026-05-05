import { type CubeState, type StickerColor } from './CubeState'

export function isCubeSolved(state: CubeState): boolean {
  const faces: (keyof CubeState)[] = ['U', 'R', 'F', 'D', 'L', 'B']
  return faces.every(face => state[face].every(s => s === state[face][4]))
}

export function isWhiteCrossSolved(state: CubeState): boolean {
  // White cross on U face: U[1], U[3], U[5], U[7] are 'U'
  if (state.U[1] !== 'U' || state.U[3] !== 'U' || state.U[5] !== 'U' || state.U[7] !== 'U') return false
  // Adjacent edges must match their face centers
  return (
    state.F[1] === state.F[4] &&
    state.R[1] === state.R[4] &&
    state.B[1] === state.B[4] &&
    state.L[1] === state.L[4]
  )
}

export function isFirstLayerSolved(state: CubeState): boolean {
  if (!isWhiteCrossSolved(state)) return false
  // U corners: U[0], U[2], U[6], U[8] are white
  if (![0, 2, 6, 8].every(i => state.U[i] === 'U')) return false
  // First row of F, R, B, L must match their centers
  const sides: (keyof CubeState)[] = ['F', 'R', 'B', 'L']
  return sides.every(face => state[face][0] === state[face][4] && state[face][1] === state[face][4] && state[face][2] === state[face][4])
}

export function isF2LSolved(state: CubeState): boolean {
  if (!isFirstLayerSolved(state)) return false
  const sides: (keyof CubeState)[] = ['F', 'R', 'B', 'L']
  return sides.every(face =>
    [0, 1, 2, 3, 4, 5].every(i => state[face][i] === state[face][4])
  )
}

type FaceIndex = { face: keyof CubeState; index: number }

export function findEdge(
  state: CubeState,
  color1: StickerColor,
  color2: StickerColor,
): FaceIndex | null {
  // All edge positions: [face, index, adjacent face, adjacent index]
  const edges: [keyof CubeState, number, keyof CubeState, number][] = [
    ['U', 1, 'B', 1], ['U', 3, 'L', 1], ['U', 5, 'R', 1], ['U', 7, 'F', 1],
    ['D', 1, 'F', 7], ['D', 3, 'L', 7], ['D', 5, 'R', 7], ['D', 7, 'B', 7],
    ['F', 3, 'L', 5], ['F', 5, 'R', 3], ['B', 3, 'R', 5], ['B', 5, 'L', 3],
  ]
  for (const [f1, i1, f2, i2] of edges) {
    const a = state[f1][i1]
    const b = state[f2][i2]
    if ((a === color1 && b === color2) || (a === color2 && b === color1)) {
      return { face: f1, index: i1 }
    }
  }
  return null
}

export function findCorner(
  state: CubeState,
  color1: StickerColor,
  color2: StickerColor,
  color3: StickerColor,
): FaceIndex | null {
  // All corner positions
  const corners: [keyof CubeState, number, keyof CubeState, number, keyof CubeState, number][] = [
    ['U', 0, 'L', 0, 'B', 2], ['U', 2, 'B', 0, 'R', 2],
    ['U', 6, 'F', 0, 'L', 2], ['U', 8, 'R', 0, 'F', 2],
    ['D', 0, 'L', 8, 'F', 6], ['D', 2, 'F', 8, 'R', 6],
    ['D', 6, 'B', 8, 'L', 6], ['D', 8, 'R', 8, 'B', 6],
  ]
  const target = new Set([color1, color2, color3])
  for (const [f1, i1, f2, i2, f3, i3] of corners) {
    const colors = new Set([state[f1][i1], state[f2][i2], state[f3][i3]])
    if (target.size === colors.size && [...target].every(c => colors.has(c))) {
      return { face: f1, index: i1 }
    }
  }
  return null
}
