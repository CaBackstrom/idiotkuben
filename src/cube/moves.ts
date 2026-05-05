import { type CubeState, cloneState } from './CubeState'

export type MoveName =
  | 'U' | 'Uprime' | 'U2'
  | 'R' | 'Rprime' | 'R2'
  | 'F' | 'Fprime' | 'F2'
  | 'D' | 'Dprime' | 'D2'
  | 'L' | 'Lprime' | 'L2'
  | 'B' | 'Bprime' | 'B2'

// Rotate 9 stickers on a face clockwise.
function rotateFaceCW(s: CubeState, face: keyof CubeState): CubeState {
  const f = s[face]
  s[face] = [f[6], f[3], f[0], f[7], f[4], f[1], f[8], f[5], f[2]]
  return s
}

// Rotate face counter-clockwise = 3x CW.
function rotateFaceCCW(s: CubeState, face: keyof CubeState): CubeState {
  const f = s[face]
  s[face] = [f[2], f[5], f[8], f[1], f[4], f[7], f[0], f[3], f[6]]
  return s
}

// ── U ────────────────────────────────────────────────────────────────────────
// U CW: F[0,1,2] → R[0,1,2] → B[0,1,2] → L[0,1,2]
function U(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCW(s, 'U')
  const [f0, f1, f2] = [s.F[0], s.F[1], s.F[2]]
  s.F[0] = s.R[0]; s.F[1] = s.R[1]; s.F[2] = s.R[2]
  s.R[0] = s.B[0]; s.R[1] = s.B[1]; s.R[2] = s.B[2]
  s.B[0] = s.L[0]; s.B[1] = s.L[1]; s.B[2] = s.L[2]
  s.L[0] = f0;     s.L[1] = f1;     s.L[2] = f2
  return s
}

function Uprime(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCCW(s, 'U')
  const [f0, f1, f2] = [s.F[0], s.F[1], s.F[2]]
  s.F[0] = s.L[0]; s.F[1] = s.L[1]; s.F[2] = s.L[2]
  s.L[0] = s.B[0]; s.L[1] = s.B[1]; s.L[2] = s.B[2]
  s.B[0] = s.R[0]; s.B[1] = s.R[1]; s.B[2] = s.R[2]
  s.R[0] = f0;     s.R[1] = f1;     s.R[2] = f2
  return s
}

function U2(state: CubeState): CubeState {
  return U(U(state))
}

// ── D ────────────────────────────────────────────────────────────────────────
// D CW (viewed from below): F[6,7,8] → L[6,7,8] → B[6,7,8] → R[6,7,8]
function D(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCW(s, 'D')
  const [f6, f7, f8] = [s.F[6], s.F[7], s.F[8]]
  s.F[6] = s.L[6]; s.F[7] = s.L[7]; s.F[8] = s.L[8]
  s.L[6] = s.B[6]; s.L[7] = s.B[7]; s.L[8] = s.B[8]
  s.B[6] = s.R[6]; s.B[7] = s.R[7]; s.B[8] = s.R[8]
  s.R[6] = f6;     s.R[7] = f7;     s.R[8] = f8
  return s
}

function Dprime(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCCW(s, 'D')
  const [f6, f7, f8] = [s.F[6], s.F[7], s.F[8]]
  s.F[6] = s.R[6]; s.F[7] = s.R[7]; s.F[8] = s.R[8]
  s.R[6] = s.B[6]; s.R[7] = s.B[7]; s.R[8] = s.B[8]
  s.B[6] = s.L[6]; s.B[7] = s.L[7]; s.B[8] = s.L[8]
  s.L[6] = f6;     s.L[7] = f7;     s.L[8] = f8
  return s
}

function D2(state: CubeState): CubeState {
  return D(D(state))
}

// ── R ────────────────────────────────────────────────────────────────────────
// R CW (viewed from right): F col 2 → U col 2 → B col 0 (reversed) → D col 2
// F[2,5,8] → U[2,5,8] → B[6,3,0] → D[2,5,8]
function R(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCW(s, 'R')
  const [f2, f5, f8] = [s.F[2], s.F[5], s.F[8]]
  s.F[2] = s.D[2]; s.F[5] = s.D[5]; s.F[8] = s.D[8]
  s.D[2] = s.B[6]; s.D[5] = s.B[3]; s.D[8] = s.B[0]
  s.B[6] = s.U[2]; s.B[3] = s.U[5]; s.B[0] = s.U[8]
  s.U[2] = f2;     s.U[5] = f5;     s.U[8] = f8
  return s
}

function Rprime(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCCW(s, 'R')
  const [f2, f5, f8] = [s.F[2], s.F[5], s.F[8]]
  s.F[2] = s.U[2]; s.F[5] = s.U[5]; s.F[8] = s.U[8]
  s.U[2] = s.B[6]; s.U[5] = s.B[3]; s.U[8] = s.B[0]
  s.B[6] = s.D[2]; s.B[3] = s.D[5]; s.B[0] = s.D[8]
  s.D[2] = f2;     s.D[5] = f5;     s.D[8] = f8
  return s
}

function R2(state: CubeState): CubeState {
  return R(R(state))
}

// ── L ────────────────────────────────────────────────────────────────────────
// L CW (viewed from left): F col 0 → D col 0 → B col 2 (reversed) → U col 0
// F[0,3,6] → D[0,3,6] → B[8,5,2] → U[0,3,6]
function L(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCW(s, 'L')
  const [f0, f3, f6] = [s.F[0], s.F[3], s.F[6]]
  s.F[0] = s.U[0]; s.F[3] = s.U[3]; s.F[6] = s.U[6]
  s.U[0] = s.B[8]; s.U[3] = s.B[5]; s.U[6] = s.B[2]
  s.B[8] = s.D[0]; s.B[5] = s.D[3]; s.B[2] = s.D[6]
  s.D[0] = f0;     s.D[3] = f3;     s.D[6] = f6
  return s
}

function Lprime(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCCW(s, 'L')
  const [f0, f3, f6] = [s.F[0], s.F[3], s.F[6]]
  s.F[0] = s.D[0]; s.F[3] = s.D[3]; s.F[6] = s.D[6]
  s.D[0] = s.B[8]; s.D[3] = s.B[5]; s.D[6] = s.B[2]
  s.B[8] = s.U[0]; s.B[5] = s.U[3]; s.B[2] = s.U[6]
  s.U[0] = f0;     s.U[3] = f3;     s.U[6] = f6
  return s
}

function L2(state: CubeState): CubeState {
  return L(L(state))
}

// ── F ────────────────────────────────────────────────────────────────────────
// F CW (viewed from front):
// U[6,7,8] → R[0,3,6] → D[2,1,0] → L[8,5,2]
// Animation: R_z(-π/2): (x,y,z)→(y,-x,z). UFL→UFR→DFR→DFL→UFL.
function F(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCW(s, 'F')
  const [u6, u7, u8] = [s.U[6], s.U[7], s.U[8]]
  s.U[6] = s.L[8]; s.U[7] = s.L[5]; s.U[8] = s.L[2]
  s.L[8] = s.D[2]; s.L[5] = s.D[1]; s.L[2] = s.D[0]
  s.D[2] = s.R[0]; s.D[1] = s.R[3]; s.D[0] = s.R[6]
  s.R[0] = u6;     s.R[3] = u7;     s.R[6] = u8
  return s
}

function Fprime(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCCW(s, 'F')
  const [u6, u7, u8] = [s.U[6], s.U[7], s.U[8]]
  s.U[6] = s.R[0]; s.U[7] = s.R[3]; s.U[8] = s.R[6]
  s.R[0] = s.D[2]; s.R[3] = s.D[1]; s.R[6] = s.D[0]
  s.D[0] = s.L[2]; s.D[1] = s.L[5]; s.D[2] = s.L[8]
  s.L[2] = u8;     s.L[5] = u7;     s.L[8] = u6
  return s
}

function F2(state: CubeState): CubeState {
  return F(F(state))
}

// ── B ────────────────────────────────────────────────────────────────────────
// B CW (viewed from back):
// U[2,1,0] → L[0,3,6] → D[6,7,8] → R[2,5,8]
// Animation: R_z(+π/2): (x,y,z)→(-y,x,z). UBR→UBL→DBL→DBR→UBR.
function B(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCW(s, 'B')
  const [u0, u1, u2] = [s.U[0], s.U[1], s.U[2]]
  s.U[0] = s.R[2]; s.U[1] = s.R[5]; s.U[2] = s.R[8]
  s.R[2] = s.D[8]; s.R[5] = s.D[7]; s.R[8] = s.D[6]
  s.D[6] = s.L[0]; s.D[7] = s.L[3]; s.D[8] = s.L[6]
  s.L[0] = u2;     s.L[3] = u1;     s.L[6] = u0
  return s
}

function Bprime(state: CubeState): CubeState {
  const s = cloneState(state)
  rotateFaceCCW(s, 'B')
  const [u0, u1, u2] = [s.U[0], s.U[1], s.U[2]]
  s.U[0] = s.L[6]; s.U[1] = s.L[3]; s.U[2] = s.L[0]
  s.L[6] = s.D[8]; s.L[3] = s.D[7]; s.L[0] = s.D[6]
  s.D[6] = s.R[8]; s.D[7] = s.R[5]; s.D[8] = s.R[2]
  s.R[8] = u2;     s.R[5] = u1;     s.R[2] = u0
  return s
}

function B2(state: CubeState): CubeState {
  return B(B(state))
}

export const Moves: Record<MoveName, (state: CubeState) => CubeState> = {
  U, Uprime, U2,
  R, Rprime, R2,
  F, Fprime, F2,
  D, Dprime, D2,
  L, Lprime, L2,
  B, Bprime, B2,
}

export const INVERSE: Record<MoveName, MoveName> = {
  U: 'Uprime', Uprime: 'U', U2: 'U2',
  R: 'Rprime', Rprime: 'R', R2: 'R2',
  F: 'Fprime', Fprime: 'F', F2: 'F2',
  D: 'Dprime', Dprime: 'D', D2: 'D2',
  L: 'Lprime', Lprime: 'L', L2: 'L2',
  B: 'Bprime', Bprime: 'B', B2: 'B2',
}

export const ALL_MOVES: MoveName[] = Object.keys(Moves) as MoveName[]
