import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { StickerColor } from '../../cube/CubeState'

type Props = {
  face: StickerColor
  animating: boolean
}

type FaceConfig = { pos: [number, number, number]; rot: [number, number, number] }

export const FACE_CONFIGS: Record<StickerColor, FaceConfig> = {
  U: { pos: [0, 1.53, 0],  rot: [-Math.PI / 2, 0, 0] },
  D: { pos: [0, -1.53, 0], rot: [Math.PI / 2, 0, 0] },
  F: { pos: [0, 0, 1.53],  rot: [0, 0, 0] },
  B: { pos: [0, 0, -1.53], rot: [0, Math.PI, 0] },
  R: { pos: [1.53, 0, 0],  rot: [0, Math.PI / 2, 0] },
  L: { pos: [-1.53, 0, 0], rot: [0, -Math.PI / 2, 0] },
}

const BASE_SCALE = 1.15
const MAX_SCALE = 1.22
const MIN_OPACITY = 0.4
const MAX_OPACITY = 0.85
const PULSE_PERIOD = 1.4
const FADE_STEP = 0.2 // lerp denominator in seconds

let _haloTexture: THREE.Texture | null = null

function getHaloTexture(): THREE.Texture {
  if (_haloTexture) return _haloTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const c = size / 2
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c)
  grad.addColorStop(0.0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.65)')
  grad.addColorStop(0.75, 'rgba(255,255,255,0.25)')
  grad.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  _haloTexture = new THREE.CanvasTexture(canvas)
  return _haloTexture
}

export default function ActiveFaceHighlight({ face, animating }: Props) {
  const { scene } = useThree()
  const meshesRef = useRef<Map<StickerColor, THREE.Mesh>>(new Map())
  const faceRef = useRef<StickerColor>(face)
  const elapsedRef = useRef(0)

  faceRef.current = face

  useEffect(() => {
    const faces = Object.keys(FACE_CONFIGS) as StickerColor[]
    const meshes = new Map<StickerColor, THREE.Mesh>()
    const tex = getHaloTexture()

    for (const f of faces) {
      const { pos, rot } = FACE_CONFIGS[f]
      const geo = new THREE.PlaneGeometry(3.1, 3.1)
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: new THREE.Color(0xffffff),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(...pos)
      mesh.rotation.set(...rot)
      mesh.scale.setScalar(BASE_SCALE)
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
    const lerpFactor = Math.min(delta / FADE_STEP, 1)

    meshesRef.current.forEach((mesh, f) => {
      const mat = mesh.material as THREE.MeshBasicMaterial

      if (f === activeFace) {
        const pulse = (Math.sin((elapsedRef.current * Math.PI * 2) / PULSE_PERIOD) + 1) / 2
        const targetOpacity = MIN_OPACITY + pulse * (MAX_OPACITY - MIN_OPACITY)
        const targetScale = BASE_SCALE + pulse * (MAX_SCALE - BASE_SCALE)
        mat.opacity += (targetOpacity - mat.opacity) * lerpFactor
        const s = mesh.scale.x
        mesh.scale.setScalar(s + (targetScale - s) * lerpFactor)
      } else {
        mat.opacity += (0 - mat.opacity) * lerpFactor
        const s = mesh.scale.x
        mesh.scale.setScalar(s + (BASE_SCALE - s) * lerpFactor)
      }
    })
  })

  return null
}
