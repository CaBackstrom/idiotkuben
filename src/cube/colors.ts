import { type StickerColor, FACE_COLORS } from './CubeState'

// Returns the hex color string for the center sticker of the given face.
export function getFaceCenterColor(face: StickerColor): string {
  return FACE_COLORS[face]
}
