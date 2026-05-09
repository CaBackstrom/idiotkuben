import type { StickerColor } from './CubeState'

// Ideal camera positions per active face — 3/4 perspective, distance ~sqrt(38)≈6.16
export const CAMERA_POSITIONS: Record<StickerColor, readonly [number, number, number]> = {
  F: [2, 3, 5],
  B: [-2, 3, -5],
  R: [5, 3, 2],
  L: [-5, 3, 2],
  U: [2, 5, 3],
  D: [2, -5, 3],
}
