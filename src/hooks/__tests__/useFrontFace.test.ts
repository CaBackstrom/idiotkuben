import { describe, it, expect } from 'vitest'
import { computeFrontAndTop } from '../useFrontFace'

describe('computeFrontAndTop', () => {
  // Six cardinal horizontal positions
  it('camera at +Z axis → front=F, top=U', () => {
    const { front, top } = computeFrontAndTop(0, 0, 10)
    expect(front).toBe('F')
    expect(top).toBe('U')
  })

  it('camera at -Z axis → front=B, top=U', () => {
    const { front, top } = computeFrontAndTop(0, 0, -10)
    expect(front).toBe('B')
    expect(top).toBe('U')
  })

  it('camera at +X axis → front=R, top=U', () => {
    const { front, top } = computeFrontAndTop(10, 0, 0)
    expect(front).toBe('R')
    expect(top).toBe('U')
  })

  it('camera at -X axis → front=L, top=U', () => {
    const { front, top } = computeFrontAndTop(-10, 0, 0)
    expect(front).toBe('L')
    expect(top).toBe('U')
  })

  it('camera above (+Y dominant) → front=U', () => {
    const { front } = computeFrontAndTop(0.01, 10, 0)
    expect(front).toBe('U')
  })

  it('camera below (-Y dominant) → front=D', () => {
    const { front } = computeFrontAndTop(0.01, -10, 0)
    expect(front).toBe('D')
  })

  // Two oblique positions
  it('camera at [3,0,5] → front=F (more Z than X)', () => {
    const { front, top } = computeFrontAndTop(3, 0, 5)
    expect(front).toBe('F')
    expect(top).toBe('U')
  })

  it('camera at [5,3,0] → front=R (more X), top=U', () => {
    const { front, top } = computeFrontAndTop(5, 3, 0)
    expect(front).toBe('R')
    expect(top).toBe('U')
  })

  // Symmetric: distance should not affect result
  it('result is scale-invariant', () => {
    const a = computeFrontAndTop(0, 0, 1)
    const b = computeFrontAndTop(0, 0, 100)
    expect(a).toEqual(b)
  })
})
