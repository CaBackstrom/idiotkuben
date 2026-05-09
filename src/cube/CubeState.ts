/**
 * Sticker indexing per face (viewed from outside the cube):
 *
 *         U face
 *         0 1 2
 *         3 4 5
 *         6 7 8  (row 6-7-8 borders F)
 *
 *  L face   F face   R face   B face
 *  0 1 2    0 1 2    0 1 2    0 1 2
 *  3 4 5    3 4 5    3 4 5    3 4 5
 *  6 7 8    6 7 8    6 7 8    6 7 8
 *  All four side faces: row 0-1-2 borders U, row 6-7-8 borders D.
 *  L's column 2-5-8 borders F. R's column 0-3-6 borders F.
 *  B's column 0-3-6 borders R. B's column 2-5-8 borders L.
 *
 *         D face
 *         0 1 2  (row 0-1-2 borders F)
 *         3 4 5
 *         6 7 8
 *
 * Color mapping:
 *   U = white, D = yellow
 *   F = green, B = blue
 *   R = red,   L = orange
 */

export type StickerColor = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'
export type Face = [
  StickerColor, StickerColor, StickerColor,
  StickerColor, StickerColor, StickerColor,
  StickerColor, StickerColor, StickerColor,
]
export type CubeState = {
  U: Face
  R: Face
  F: Face
  D: Face
  L: Face
  B: Face
}

export function solvedState(): CubeState {
  const face = (c: StickerColor): Face => [c, c, c, c, c, c, c, c, c]
  return {
    U: face('U'),
    R: face('R'),
    F: face('F'),
    D: face('D'),
    L: face('L'),
    B: face('B'),
  }
}

export function cloneState(state: CubeState): CubeState {
  return {
    U: [...state.U] as Face,
    R: [...state.R] as Face,
    F: [...state.F] as Face,
    D: [...state.D] as Face,
    L: [...state.L] as Face,
    B: [...state.B] as Face,
  }
}

export const FACE_COLORS: Record<StickerColor, string> = {
  U: '#FFFFFF', // white
  D: '#FFEB00', // yellow +15%
  F: '#00B253', // green +15%
  B: '#0051C7', // blue +15%
  R: '#E61235', // red +15%
  L: '#FF6500', // orange +15%
}
