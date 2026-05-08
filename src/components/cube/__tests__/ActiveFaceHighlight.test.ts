import { describe, it, expect } from 'vitest'
import { FACE_CONFIGS } from '../ActiveFaceHighlight'

// Verifies that each of the 6 face halos are placed correctly just outside the cube.
// The cube occupies roughly ±1.5 world units; halos sit at ±1.53.

describe('FACE_CONFIGS', () => {
  it('covers all 6 faces', () => {
    expect(Object.keys(FACE_CONFIGS).sort()).toEqual(['B', 'D', 'F', 'L', 'R', 'U'])
  })

  it('U halo is above the cube on the Y axis', () => {
    expect(FACE_CONFIGS.U.pos).toEqual([0, 1.53, 0])
    expect(FACE_CONFIGS.U.rot[0]).toBeCloseTo(-Math.PI / 2)
  })

  it('D halo is below the cube on the Y axis', () => {
    expect(FACE_CONFIGS.D.pos).toEqual([0, -1.53, 0])
    expect(FACE_CONFIGS.D.rot[0]).toBeCloseTo(Math.PI / 2)
  })

  it('F halo is in front of the cube on the Z axis', () => {
    expect(FACE_CONFIGS.F.pos).toEqual([0, 0, 1.53])
    expect(FACE_CONFIGS.F.rot).toEqual([0, 0, 0])
  })

  it('B halo is behind the cube on the Z axis', () => {
    expect(FACE_CONFIGS.B.pos).toEqual([0, 0, -1.53])
    expect(FACE_CONFIGS.B.rot[1]).toBeCloseTo(Math.PI)
  })

  it('R halo is to the right on the X axis', () => {
    expect(FACE_CONFIGS.R.pos).toEqual([1.53, 0, 0])
    expect(FACE_CONFIGS.R.rot[1]).toBeCloseTo(Math.PI / 2)
  })

  it('L halo is to the left on the X axis', () => {
    expect(FACE_CONFIGS.L.pos).toEqual([-1.53, 0, 0])
    expect(FACE_CONFIGS.L.rot[1]).toBeCloseTo(-Math.PI / 2)
  })
})
