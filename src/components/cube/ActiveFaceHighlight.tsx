import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { StickerColor } from '../../cube/CubeState'
import { FACE_COLORS } from '../../cube/CubeState'

type Props = {
  face: StickerColor
  animating: boolean
}

type FaceConfig = { pos: [number, number, number]; rot: [number, number, number] }

const FACE_CONFIGS: Record<StickerColor, FaceConfig> = {
  U: { pos: [0, 1.53, 0],  rot: [-Math.PI / 2, 0, 0] },
  D: { pos: [0, -1.53, 0], rot: [Math.PI / 2, 0, 0] },
  F: { pos: [0, 0, 1.53],  rot: [0, 0, 0] },
  B: { pos: [0, 0, -1.53], rot: [0, Math.PI, 0] },
  R: { pos: [1.53, 0, 0],  rot: [0, Math.PI / 2, 0] },
  L: { pos: [-1.53, 0, 0], rot: [0, -Math.PI / 2, 0] },
}

// Pre-computed THREE.Color per face for glow (derived from FACE_COLORS)
const FACE_THREE_COLORS: Record<StickerColor, THREE.Color> = Object.fromEntries(
  (Object.keys(FACE_CONFIGS) as StickerColor[]).map(f => [f, new THREE.Color(FACE_COLORS[f])])
) as Record<StickerColor, THREE.Color>

// Dim overlay opacity for inactive faces (semi-transparent black)
const DIM_OPACITY = 0.38

export default function ActiveFaceHighlight({ face, animating }: Props) {
  const { scene } = useThree()
  const meshesRef = useRef<Map<StickerColor, THREE.Mesh>>(new Map())
  const faceRef = useRef<StickerColor>(face)
  const elapsedRef = useRef(0)

  // Keep faceRef in sync on every render without re-running the effect
  faceRef.current = face

  // Create 6 overlay planes once on mount
  useEffect(() => {
    const faces = Object.keys(FACE_CONFIGS) as StickerColor[]
    const meshes = new Map<StickerColor, THREE.Mesh>()

    for (const f of faces) {
      const { pos, rot } = FACE_CONFIGS[f]
      const geo = new THREE.PlaneGeometry(3.1, 3.1)
      const mat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.FrontSide,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(...pos)
      mesh.rotation.set(...rot)
      scene.add(mesh)
      meshes.set(f, mesh)
    }

    meshesRef.current = meshes

    return () => {
      meshes.forEach(mesh => {
        scene.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      })
      meshesRef.current = new Map()
    }
  }, [scene])

  useFrame((_, delta) => {
    if (animating) {
      meshesRef.current.forEach(mesh => {
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0
      })
      return
    }

    elapsedRef.current += delta
    const activeFace = faceRef.current
    const lerpFactor = Math.min(delta / 0.4, 1) // 400ms transition

    meshesRef.current.forEach((mesh, f) => {
      const mat = mesh.material as THREE.MeshBasicMaterial

      if (f === activeFace) {
        // Glow: active face center color, pulse opacity 0.05 → 0.15 over 1.6s
        mat.color.copy(FACE_THREE_COLORS[f])
        const pulse = (Math.sin((elapsedRef.current * Math.PI * 2) / 1.6) + 1) / 2
        const target = 0.05 + pulse * 0.10
        mat.opacity += (target - mat.opacity) * lerpFactor
      } else {
        // Dim: black overlay fades in to DIM_OPACITY over 400ms
        mat.color.set(0x000000)
        mat.opacity += (DIM_OPACITY - mat.opacity) * lerpFactor
      }
    })
  })

  return null
}
