import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export type FaceName = 'U' | 'D' | 'F' | 'B' | 'R' | 'L'

const FACE_NORMALS: [FaceName, number, number, number][] = [
  ['U', 0, 1, 0], ['D', 0, -1, 0],
  ['F', 0, 0, 1], ['B', 0, 0, -1],
  ['R', 1, 0, 0], ['L', -1, 0, 0],
]

function dot3(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  return ax * bx + ay * by + az * bz
}

function normalize3(x: number, y: number, z: number): [number, number, number] {
  const len = Math.sqrt(x * x + y * y + z * z)
  if (len < 1e-10) return [0, 0, 0]
  return [x / len, y / len, z / len]
}

function cross3(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
): [number, number, number] {
  return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]
}

// Pure function — testable without a canvas context.
// Given camera world position (looking at origin), returns which cube face
// is most visible (front) and which is at screen-top (top).
export function computeFrontAndTop(
  cx: number, cy: number, cz: number,
): { front: FaceName; top: FaceName } {
  const [dx, dy, dz] = normalize3(cx, cy, cz) // origin-to-camera unit vector

  // Front: face whose outward normal is most aligned with origin-to-camera
  let front: FaceName = 'F'
  let maxFrontDot = -Infinity
  for (const [face, nx, ny, nz] of FACE_NORMALS) {
    const d = dot3(nx, ny, nz, dx, dy, dz)
    if (d > maxFrontDot) { maxFrontDot = d; front = face }
  }

  // Camera forward (into scene)
  const [fx, fy, fz] = [-dx, -dy, -dz]

  // Camera right = forward × world_up; fallback to world_Z at poles
  let [rx, ry, rz] = cross3(fx, fy, fz, 0, 1, 0)
  if (Math.abs(rx) < 1e-6 && Math.abs(ry) < 1e-6 && Math.abs(rz) < 1e-6) {
    ;[rx, ry, rz] = cross3(fx, fy, fz, 0, 0, 1)
  }
  ;[rx, ry, rz] = normalize3(rx, ry, rz)

  // Screen up = right × forward
  let [ux, uy, uz] = cross3(rx, ry, rz, fx, fy, fz)
  ;[ux, uy, uz] = normalize3(ux, uy, uz)

  // Top: face whose outward normal is most aligned with screen-up
  let top: FaceName = 'U'
  let maxTopDot = -Infinity
  for (const [face, nx, ny, nz] of FACE_NORMALS) {
    const d = dot3(nx, ny, nz, ux, uy, uz)
    if (d > maxTopDot) { maxTopDot = d; top = face }
  }

  return { front, top }
}

// R3F hook — must be called inside a <Canvas> context.
// Throttled to 60 ms; updates face state only when it actually changes.
export function useFrontFace(): { front: FaceName; top: FaceName } {
  const { camera } = useThree()
  const [faces, setFaces] = useState<{ front: FaceName; top: FaceName }>(() =>
    computeFrontAndTop(camera.position.x, camera.position.y, camera.position.z),
  )
  const lastUpdateRef = useRef(0)
  const facesRef = useRef(faces)
  facesRef.current = faces

  useFrame(() => {
    const now = Date.now()
    if (now - lastUpdateRef.current < 60) return
    lastUpdateRef.current = now
    const next = computeFrontAndTop(camera.position.x, camera.position.y, camera.position.z)
    const cur = facesRef.current
    if (next.front !== cur.front || next.top !== cur.top) {
      setFaces(next)
    }
  })

  return faces
}
