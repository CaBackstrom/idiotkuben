/// <reference types="three" />
import { useRef, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { type CubeState, type StickerColor, FACE_COLORS } from '../cube/CubeState'
import { Moves, type MoveName } from '../cube/moves'

// ── Public types ───────────────────────────────────────────────────────────

export type QueuedMove = { name: MoveName; id: number }

// ── Constants ──────────────────────────────────────────────────────────────

const ANIM_DURATION = 0.25 // seconds

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Rotation axis and total angle per move
const MOVE_ROTATION: Record<MoveName, { axis: THREE.Vector3; angle: number }> = {
  U:      { axis: new THREE.Vector3(0, 1, 0), angle: -Math.PI / 2 },
  Uprime: { axis: new THREE.Vector3(0, 1, 0), angle:  Math.PI / 2 },
  U2:     { axis: new THREE.Vector3(0, 1, 0), angle: -Math.PI },
  D:      { axis: new THREE.Vector3(0, 1, 0), angle:  Math.PI / 2 },
  Dprime: { axis: new THREE.Vector3(0, 1, 0), angle: -Math.PI / 2 },
  D2:     { axis: new THREE.Vector3(0, 1, 0), angle:  Math.PI },
  R:      { axis: new THREE.Vector3(1, 0, 0), angle: -Math.PI / 2 },
  Rprime: { axis: new THREE.Vector3(1, 0, 0), angle:  Math.PI / 2 },
  R2:     { axis: new THREE.Vector3(1, 0, 0), angle: -Math.PI },
  L:      { axis: new THREE.Vector3(1, 0, 0), angle:  Math.PI / 2 },
  Lprime: { axis: new THREE.Vector3(1, 0, 0), angle: -Math.PI / 2 },
  L2:     { axis: new THREE.Vector3(1, 0, 0), angle:  Math.PI },
  F:      { axis: new THREE.Vector3(0, 0, 1), angle: -Math.PI / 2 },
  Fprime: { axis: new THREE.Vector3(0, 0, 1), angle:  Math.PI / 2 },
  F2:     { axis: new THREE.Vector3(0, 0, 1), angle: -Math.PI },
  B:      { axis: new THREE.Vector3(0, 0, 1), angle:  Math.PI / 2 },
  Bprime: { axis: new THREE.Vector3(0, 0, 1), angle: -Math.PI / 2 },
  B2:     { axis: new THREE.Vector3(0, 0, 1), angle:  Math.PI },
}

const MOVE_LAYER: Record<MoveName, { axis: 'x' | 'y' | 'z'; value: number }> = {
  U: { axis: 'y', value:  1 }, Uprime: { axis: 'y', value:  1 }, U2: { axis: 'y', value:  1 },
  D: { axis: 'y', value: -1 }, Dprime: { axis: 'y', value: -1 }, D2: { axis: 'y', value: -1 },
  R: { axis: 'x', value:  1 }, Rprime: { axis: 'x', value:  1 }, R2: { axis: 'x', value:  1 },
  L: { axis: 'x', value: -1 }, Lprime: { axis: 'x', value: -1 }, L2: { axis: 'x', value: -1 },
  F: { axis: 'z', value:  1 }, Fprime: { axis: 'z', value:  1 }, F2: { axis: 'z', value:  1 },
  B: { axis: 'z', value: -1 }, Bprime: { axis: 'z', value: -1 }, B2: { axis: 'z', value: -1 },
}

// ── Geometry helpers ───────────────────────────────────────────────────────

// Sticker index within a face from world position.
// Coordinate system: +Y=U, -Y=D, +Z=F, -Z=B, +X=R, -X=L
function faceIndex(face: keyof CubeState, px: number, py: number, pz: number): number {
  switch (face) {
    case 'U': return (pz + 1) * 3 + (px + 1)
    case 'D': return (1 - pz) * 3 + (px + 1)
    case 'F': return (1 - py) * 3 + (px + 1)
    case 'B': return (1 - py) * 3 + (1 - px)
    case 'R': return (1 - py) * 3 + (1 - pz)
    case 'L': return (1 - py) * 3 + (pz + 1)
  }
}

// BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z (4 verts per face, 24 total)
const BOX_FACE_NORMAL_KEYS = ['1,0,0', '-1,0,0', '0,1,0', '0,-1,0', '0,0,1', '0,0,-1'] as const

function coloredCubieGeometry(faceColors: Record<string, StickerColor>): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(0.95, 0.95, 0.95)
  const count = (geo.attributes['position'] as THREE.BufferAttribute).count
  const colors = new Float32Array(count * 3)
  const black = new THREE.Color(0x111111)

  for (let f = 0; f < 6; f++) {
    const key = BOX_FACE_NORMAL_KEYS[f]
    const stickerColor = faceColors[key]
    const c = stickerColor ? new THREE.Color(FACE_COLORS[stickerColor]) : black
    for (let v = f * 4; v < (f + 1) * 4; v++) {
      colors[v * 3] = c.r; colors[v * 3 + 1] = c.g; colors[v * 3 + 2] = c.b
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

function buildFaceColors(px: number, py: number, pz: number, state: CubeState): Record<string, StickerColor> {
  const fc: Record<string, StickerColor> = {}
  if (py ===  1) fc['0,1,0']  = state.U[faceIndex('U', px, py, pz)]
  if (py === -1) fc['0,-1,0'] = state.D[faceIndex('D', px, py, pz)]
  if (pz ===  1) fc['0,0,1']  = state.F[faceIndex('F', px, py, pz)]
  if (pz === -1) fc['0,0,-1'] = state.B[faceIndex('B', px, py, pz)]
  if (px ===  1) fc['1,0,0']  = state.R[faceIndex('R', px, py, pz)]
  if (px === -1) fc['-1,0,0'] = state.L[faceIndex('L', px, py, pz)]
  return fc
}

function createCubieMesh(px: number, py: number, pz: number, state: CubeState): THREE.Mesh {
  const fc = buildFaceColors(px, py, pz, state)
  const geo = coloredCubieGeometry(fc)
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(px, py, pz)
  mesh.userData['cubie'] = true
  mesh.userData['faceColors'] = fc
  return mesh
}

// Snap a quaternion to the nearest valid cube orientation (one of 24).
// Euler-angle snapping fails under gimbal lock; snapping each column of the
// rotation matrix to the nearest cardinal direction is always correct.
function snapRotationToGrid(q: THREE.Quaternion): THREE.Quaternion {
  const m = new THREE.Matrix4().makeRotationFromQuaternion(q)
  const e = m.elements // column-major: col0=[e0,e1,e2], col1=[e4,e5,e6], col2=[e8,e9,e10]

  const snapCol = (x: number, y: number, z: number): [number, number, number] => {
    const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z)
    if (ax >= ay && ax >= az) return [Math.sign(x), 0, 0]
    if (ay >= ax && ay >= az) return [0, Math.sign(y), 0]
    return [0, 0, Math.sign(z)]
  }

  const [c0x, c0y, c0z] = snapCol(e[0], e[1], e[2])
  const [c1x, c1y, c1z] = snapCol(e[4], e[5], e[6])
  const [c2x, c2y, c2z] = snapCol(e[8], e[9], e[10])

  // THREE.Matrix4.set takes row-major args: set(m00,m01,m02,m03, m10,m11,...)
  // columns become: col0=(m00,m10,m20), col1=(m01,m11,m21), col2=(m02,m12,m22)
  const snapped = new THREE.Matrix4()
  snapped.set(
    c0x, c1x, c2x, 0,
    c0y, c1y, c2y, 0,
    c0z, c1z, c2z, 0,
    0,   0,   0,   1,
  )
  return new THREE.Quaternion().setFromRotationMatrix(snapped)
}

// ── Scene component (imperative — no JSX for cubies) ──────────────────────

type AnimState = {
  move: QueuedMove
  pivot: THREE.Group
  axis: THREE.Vector3
  totalAngle: number
  elapsed: number
}

type CubeSceneProps = {
  initialState: CubeState
  moveQueue: QueuedMove[]
  onMoveComplete: (moveId: number, newState: CubeState) => void
  groupRef: React.MutableRefObject<THREE.Group | null>
}

function CubeScene({ initialState, moveQueue, onMoveComplete, groupRef }: CubeSceneProps) {
  const { scene } = useThree()
  const groupRef3 = useRef<THREE.Group | null>(null)
  const stateRef = useRef<CubeState>(initialState)
  const animRef = useRef<AnimState | null>(null)
  const processedIds = useRef(new Set<number>())
  // Stable refs for props used inside useFrame (avoid stale closures)
  const queueRef = useRef(moveQueue)
  const onCompleteRef = useRef(onMoveComplete)
  queueRef.current = moveQueue
  onCompleteRef.current = onMoveComplete

  // Create all 27 cubies imperatively once
  useEffect(() => {
    const group = new THREE.Group()
    groupRef3.current = group
    groupRef.current = group

    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++)
        for (let x = -1; x <= 1; x++)
          group.add(createCubieMesh(x, y, z, stateRef.current))

    scene.add(group)
    return () => {
      scene.remove(group)
      group.children.forEach(c => {
        if (c instanceof THREE.Mesh) { c.geometry.dispose(); (c.material as THREE.Material).dispose() }
      })
      groupRef3.current = null
      groupRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]) // runs once per mount

  const startAnimation = useCallback((move: QueuedMove) => {
    const group = groupRef3.current
    if (!group) return

    const { axis, value } = MOVE_LAYER[move.name]
    const { axis: rotAxis, angle } = MOVE_ROTATION[move.name]

    if (REDUCED_MOTION) {
      const newState = Moves[move.name](stateRef.current)
      stateRef.current = newState
      onCompleteRef.current(move.id, newState)
      return
    }

    const layer: THREE.Mesh[] = []
    group.children.forEach(child => {
      if (!(child instanceof THREE.Mesh)) return
      const coord = axis === 'x' ? child.position.x : axis === 'y' ? child.position.y : child.position.z
      if (Math.abs(coord - value) < 0.01) layer.push(child)
    })

    const pivot = new THREE.Group()
    scene.add(pivot)
    layer.forEach(m => { group.remove(m); pivot.add(m) })

    animRef.current = { move, pivot, axis: rotAxis, totalAngle: angle, elapsed: 0 }
  }, [scene])

  useFrame((_, delta) => {
    const anim = animRef.current

    if (!anim) {
      const next = queueRef.current.find(m => !processedIds.current.has(m.id))
      if (next) { processedIds.current.add(next.id); startAnimation(next) }
      return
    }

    anim.elapsed += delta
    const t = Math.min(anim.elapsed / ANIM_DURATION, 1)
    anim.pivot.setRotationFromAxisAngle(anim.axis, anim.totalAngle * t)

    if (t < 1) return

    // Decompose pivot back into group
    const group = groupRef3.current
    if (!group) return
    anim.pivot.updateWorldMatrix(true, true)
    anim.pivot.children.slice().forEach(child => {
      child.applyMatrix4(anim.pivot.matrixWorld)
      anim.pivot.remove(child)
      group.add(child)
      child.position.set(Math.round(child.position.x), Math.round(child.position.y), Math.round(child.position.z))
      child.quaternion.copy(snapRotationToGrid(child.quaternion))
    })
    scene.remove(anim.pivot)
    animRef.current = null

    const newState = Moves[anim.move.name](stateRef.current)
    stateRef.current = newState
    onCompleteRef.current(anim.move.id, newState)
  })

  return null
}

// ── Public component ───────────────────────────────────────────────────────

type Cube3DProps = {
  initialState: CubeState
  moveQueue: QueuedMove[]
  onMoveComplete: (moveId: number, newState: CubeState) => void
  groupRef: React.MutableRefObject<THREE.Group | null>
  quality?: 'low' | 'high'
}

export default function Cube3D({ initialState, moveQueue, onMoveComplete, groupRef, quality: _quality }: Cube3DProps) {
  return (
    <Canvas camera={{ position: [3.5, 3.5, 3.5], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={0.9} />
      <CubeScene
        initialState={initialState}
        moveQueue={moveQueue}
        onMoveComplete={onMoveComplete}
        groupRef={groupRef}
      />
      <OrbitControls makeDefault />
    </Canvas>
  )
}
