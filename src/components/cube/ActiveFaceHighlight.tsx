import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { StickerColor } from '../../cube/CubeState'

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

export default function ActiveFaceHighlight({ face, animating }: Props) {
  const { scene } = useThree()
  const linesRef = useRef<THREE.LineSegments | null>(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    const { pos, rot } = FACE_CONFIGS[face]
    const planeGeo = new THREE.PlaneGeometry(3.08, 3.08)
    const edgesGeo = new THREE.EdgesGeometry(planeGeo)
    planeGeo.dispose()
    const mat = new THREE.LineBasicMaterial({ color: 0xC8102E, transparent: true, opacity: 0.4 })
    const lines = new THREE.LineSegments(edgesGeo, mat)
    lines.position.set(...pos)
    lines.rotation.set(...rot)
    scene.add(lines)
    linesRef.current = lines
    return () => {
      scene.remove(lines)
      edgesGeo.dispose()
      mat.dispose()
      linesRef.current = null
    }
  }, [scene, face])

  useFrame((_, delta) => {
    const lines = linesRef.current
    if (!lines) return
    const mat = lines.material as THREE.LineBasicMaterial
    if (animating) { mat.opacity = 0; return }
    elapsedRef.current += delta
    // 0.4 → 0.8 → 0.4 over 1.6s
    const t = (Math.sin((elapsedRef.current * Math.PI * 2) / 1.6) + 1) / 2
    mat.opacity = 0.4 + t * 0.4
  })

  return null
}
