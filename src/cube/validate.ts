import { type CubeState, type StickerColor } from './CubeState'

const ALL_COLORS: StickerColor[] = ['U', 'R', 'F', 'D', 'L', 'B']

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

  // Checks 4-5: parity — TODO milestone 2
  return { valid: true }
}

const COLOR_NAMES: Record<StickerColor, string> = {
  U: 'vita', R: 'röda', F: 'gröna', D: 'gula', L: 'orange', B: 'blåa',
}
