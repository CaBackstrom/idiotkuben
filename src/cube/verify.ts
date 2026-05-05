import * as THREE from 'three'
import { type CubeState, type StickerColor } from './CubeState'

export type VerifyMismatch = {
  face: keyof CubeState
  index: number
  expected: StickerColor
  actual: StickerColor
}

export type VerifyResult = {
  ok: boolean
  mismatches: VerifyMismatch[]
}

type WorldFace = keyof CubeState

// ── Coordinate mappings ────────────────────────────────────────────────────
//
// Coordinate system: +Y = U, -Y = D, +Z = F, -Z = B, +X = R, -X = L
// Cubies sit at integer positions -1, 0, +1 on each axis.
//
// Sticker index within a face:
//   row 0 = "top" edge of that face (closest to U or B depending on face)
//   col 0 = "left" edge when viewed from outside
//
//   U: row = pz+1 (F-edge = row 2), col = px+1
//   D: row = 1-pz (F-edge = row 0), col = px+1
//   F: row = 1-py (U-edge = row 0), col = px+1
//   B: row = 1-py (U-edge = row 0), col = 1-px  (mirrored, viewed from behind)
//   R: row = 1-py (U-edge = row 0), col = 1-pz  (F-edge = col 0)
//   L: row = 1-py (U-edge = row 0), col = pz+1  (F-edge = col 2)

function worldFaceToStateIndex(face: WorldFace, px: number, py: number, pz: number): number {
  switch (face) {
    case 'U': return (pz + 1) * 3 + (px + 1)
    case 'D': return (1 - pz) * 3 + (px + 1)
    case 'F': return (1 - py) * 3 + (px + 1)
    case 'B': return (1 - py) * 3 + (1 - px)
    case 'R': return (1 - py) * 3 + (1 - pz)
    case 'L': return (1 - py) * 3 + (pz + 1)
  }
}

// A sticker is only visible when the cubie is on the exterior layer for that face.
function isExterior(face: WorldFace, px: number, py: number, pz: number): boolean {
  switch (face) {
    case 'U': return py ===  1
    case 'D': return py === -1
    case 'F': return pz ===  1
    case 'B': return pz === -1
    case 'R': return px ===  1
    case 'L': return px === -1
  }
}

// ── Rotation helpers ───────────────────────────────────────────────────────

// Map a (roughly axis-aligned) world-space vector to the nearest face.
// Uses argmax of absolute components — correct for any cube orientation.
function nearestFace(v: THREE.Vector3): WorldFace {
  const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z)
  if (ax >= ay && ax >= az) return v.x > 0 ? 'R' : 'L'
  if (ay >= ax && ay >= az) return v.y > 0 ? 'U' : 'D'
  return v.z > 0 ? 'F' : 'B'
}

// ── Main verify ────────────────────────────────────────────────────────────

const LOCAL_NORMALS = [
  new THREE.Vector3( 1,  0,  0),
  new THREE.Vector3(-1,  0,  0),
  new THREE.Vector3( 0,  1,  0),
  new THREE.Vector3( 0, -1,  0),
  new THREE.Vector3( 0,  0,  1),
  new THREE.Vector3( 0,  0, -1),
]

/**
 * Verify that the visual scene matches the logical state.
 *
 * For each cubie mesh (userData.cubie = true):
 *   1. Read world position, snap to integer.
 *   2. Read world quaternion — NO Euler snap, use raw.
 *   3. For each of the 6 local face normals:
 *      a. Apply raw quaternion → world direction.
 *      b. Snap world direction to nearest cardinal axis (argmax) → WorldFace.
 *      c. Skip if cubie is not on the exterior layer for that face.
 *      d. Compute state index from world pos + face.
 *      e. Compare userData.faceColors[localNormalKey] with state[face][index].
 *
 * Key invariant: faceColors[localNormalKey] stores the sticker painted on that
 * local face at creation time. It never changes; the cubie rotates around it.
 * The raw quaternion (not Euler-decomposed) applied to the local normal gives
 * the correct world direction even after many compound moves.
 */
export function verifyScene(state: CubeState, root: THREE.Object3D): VerifyResult {
  const mismatches: VerifyMismatch[] = []
  const worldPos = new THREE.Vector3()
  const rawQ = new THREE.Quaternion()

  root.traverse(obj => {
    if (!(obj instanceof THREE.Mesh)) return
    if (!obj.userData['cubie']) return

    obj.getWorldPosition(worldPos)
    const px = Math.round(worldPos.x)
    const py = Math.round(worldPos.y)
    const pz = Math.round(worldPos.z)

    // Use raw world quaternion — no Euler decomposition.
    obj.getWorldQuaternion(rawQ)

    const faceColors = obj.userData['faceColors'] as Record<string, StickerColor> | undefined
    if (!faceColors) return

    for (const ln of LOCAL_NORMALS) {
      // Apply quaternion to local normal, snap result to nearest world face.
      const wn = ln.clone().applyQuaternion(rawQ)
      const face = nearestFace(wn)

      if (!isExterior(face, px, py, pz)) continue

      const key = `${ln.x},${ln.y},${ln.z}`
      const visualColor = faceColors[key]
      if (!visualColor) continue  // interior face

      const index = worldFaceToStateIndex(face, px, py, pz)
      const expected = state[face][index]

      if (visualColor !== expected) {
        mismatches.push({ face, index, expected, actual: visualColor })
      }
    }
  })

  return { ok: mismatches.length === 0, mismatches }
}
