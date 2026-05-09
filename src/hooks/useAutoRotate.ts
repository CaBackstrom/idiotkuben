import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { StickerColor } from '../cube/CubeState'
import { CAMERA_POSITIONS } from '../cube/cameraPositions'

export { CAMERA_POSITIONS } from '../cube/cameraPositions'

const TWEEN_DURATION = 0.8 // seconds
const IDLE_THRESHOLD_MS = 5000

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function shouldAutoRotate(
  lastInteractionMs: number,
  nowMs: number,
  thresholdMs = IDLE_THRESHOLD_MS,
): boolean {
  return nowMs - lastInteractionMs > thresholdMs
}

export function useAutoRotate(activeFace: StickerColor | undefined, isAnimating: boolean): void {
  const { camera, controls } = useThree()
  const lastInteractionRef = useRef(0)
  const startPosRef = useRef<THREE.Vector3 | null>(null)
  const targetPosRef = useRef<THREE.Vector3 | null>(null)
  const progressRef = useRef(1) // 1 = idle / done
  const prevFaceRef = useRef<StickerColor | undefined>(undefined)

  // Cancel tween and record timestamp on user interaction
  useEffect(() => {
    if (!controls) return
    const handleStart = () => {
      lastInteractionRef.current = Date.now()
      progressRef.current = 1
    }
    type Listenable = { addEventListener(t: string, fn: () => void): void; removeEventListener(t: string, fn: () => void): void }
    const ed = controls as unknown as Listenable
    ed.addEventListener('start', handleStart)
    return () => ed.removeEventListener('start', handleStart)
  }, [controls])

  // Start new tween when active face changes — but only after move animation finishes
  useEffect(() => {
    if (!activeFace || activeFace === prevFaceRef.current) return
    if (isAnimating) return // wait for move animation to complete before rotating camera
    prevFaceRef.current = activeFace
    if (!shouldAutoRotate(lastInteractionRef.current, Date.now())) return
    const [tx, ty, tz] = CAMERA_POSITIONS[activeFace]
    startPosRef.current = camera.position.clone()
    targetPosRef.current = new THREE.Vector3(tx, ty, tz)
    progressRef.current = 0
  }, [activeFace, camera, isAnimating])

  useFrame((_, delta) => {
    if (progressRef.current >= 1 || !startPosRef.current || !targetPosRef.current) return
    progressRef.current = Math.min(progressRef.current + delta / TWEEN_DURATION, 1)
    const t = easeInOutQuad(progressRef.current)
    camera.position.lerpVectors(startPosRef.current, targetPosRef.current, t)
    camera.lookAt(0, 0, 0)
    ;(controls as { update?: () => void } | null)?.update?.()
  })
}
