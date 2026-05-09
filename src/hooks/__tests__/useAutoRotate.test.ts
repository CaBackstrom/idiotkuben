import { describe, it, expect } from 'vitest'
import { CAMERA_POSITIONS, easeInOutQuad, shouldAutoRotate } from '../useAutoRotate'

describe('easeInOutQuad', () => {
  it('returns 0 at t=0', () => { expect(easeInOutQuad(0)).toBe(0) })
  it('returns 1 at t=1', () => { expect(easeInOutQuad(1)).toBe(1) })
  it('returns 0.5 at t=0.5', () => { expect(easeInOutQuad(0.5)).toBe(0.5) })
  it('is monotonically increasing', () => {
    for (let i = 0; i < 9; i++) {
      expect(easeInOutQuad((i + 1) / 10)).toBeGreaterThan(easeInOutQuad(i / 10))
    }
  })
  it('is symmetric around 0.5', () => {
    expect(easeInOutQuad(0.25)).toBeCloseTo(1 - easeInOutQuad(0.75), 10)
    expect(easeInOutQuad(0.1)).toBeCloseTo(1 - easeInOutQuad(0.9), 10)
  })
})

describe('shouldAutoRotate', () => {
  it('returns true when idle > threshold', () => {
    expect(shouldAutoRotate(0, 6000)).toBe(true)
  })
  it('returns false when recently interacted', () => {
    expect(shouldAutoRotate(5000, 9000, 5000)).toBe(false)
  })
  it('returns false at exactly the threshold', () => {
    expect(shouldAutoRotate(0, 5000, 5000)).toBe(false)
  })
  it('returns true just above threshold', () => {
    expect(shouldAutoRotate(0, 5001, 5000)).toBe(true)
  })
  it('uses 5000ms as default threshold', () => {
    expect(shouldAutoRotate(0, 5001)).toBe(true)
    expect(shouldAutoRotate(0, 5000)).toBe(false)
  })
})

describe('CAMERA_POSITIONS', () => {
  it('has entries for all six faces', () => {
    for (const face of ['U', 'D', 'F', 'B', 'R', 'L'] as const) {
      expect(CAMERA_POSITIONS[face]).toHaveLength(3)
    }
  })
  it('all positions are approximately at distance 6 from origin', () => {
    for (const face of ['U', 'D', 'F', 'B', 'R', 'L'] as const) {
      const [x, y, z] = CAMERA_POSITIONS[face]
      const dist = Math.sqrt(x * x + y * y + z * z)
      expect(dist).toBeCloseTo(6.16, 1)
    }
  })
  it('F face camera is in front (+Z)', () => {
    const [, , z] = CAMERA_POSITIONS.F
    expect(z).toBeGreaterThan(0)
  })
  it('B face camera is behind (-Z)', () => {
    const [, , z] = CAMERA_POSITIONS.B
    expect(z).toBeLessThan(0)
  })
  it('R face camera is to the right (+X)', () => {
    const [x] = CAMERA_POSITIONS.R
    expect(x).toBeGreaterThan(0)
  })
  it('L face camera is to the left (-X)', () => {
    const [x] = CAMERA_POSITIONS.L
    expect(x).toBeLessThan(0)
  })
  it('U face camera is above (+Y dominant)', () => {
    const [, y] = CAMERA_POSITIONS.U
    expect(y).toBeGreaterThan(0)
  })
  it('D face camera is below (-Y dominant)', () => {
    const [, y] = CAMERA_POSITIONS.D
    expect(y).toBeLessThan(0)
  })
})
