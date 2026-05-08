import type { Language } from '../i18n/index'

export type MoveName =
  | 'U' | 'Uprime' | 'U2'
  | 'D' | 'Dprime' | 'D2'
  | 'R' | 'Rprime' | 'R2'
  | 'L' | 'Lprime' | 'L2'
  | 'F' | 'Fprime' | 'F2'
  | 'B' | 'Bprime' | 'B2'

type FaceLetter = 'U' | 'D' | 'R' | 'L' | 'F' | 'B'
type Dir = 'cw' | 'ccw' | 'half'

const FACE_COLOR_EN: Record<FaceLetter, string> = {
  U: 'white', D: 'yellow', F: 'green', B: 'blue', R: 'red', L: 'orange',
}

// Swedish adjective forms used with "den ... sidan"
const FACE_COLOR_SV: Record<FaceLetter, string> = {
  U: 'vita', D: 'gula', F: 'gröna', B: 'blåa', R: 'röda', L: 'orange',
}

const DIR_EN: Record<Dir, string> = {
  cw: 'clockwise',
  ccw: 'counter-clockwise',
  half: 'twice',
}

const DIR_SV: Record<Dir, string> = {
  cw: 'medsols',
  ccw: 'moturs',
  half: 'två varv',
}

function parseFaceAndDir(move: MoveName): { face: FaceLetter; dir: Dir; code: string } {
  if (move.endsWith('prime')) {
    const face = move[0] as FaceLetter
    return { face, dir: 'ccw', code: `${face}'` }
  }
  if (move.endsWith('2')) {
    const face = move[0] as FaceLetter
    return { face, dir: 'half', code: `${face}2` }
  }
  return { face: move as FaceLetter, dir: 'cw', code: move }
}

export function getInstructionForMove(
  move: MoveName,
  lang: Language
): { primary: string; code: string } {
  const { face, dir, code } = parseFaceAndDir(move)
  let primary: string
  if (lang === 'sv') {
    primary = `Vrid den ${FACE_COLOR_SV[face]} sidan ${DIR_SV[dir]}`
  } else {
    primary = `Turn the ${FACE_COLOR_EN[face]} side ${DIR_EN[dir]}`
  }
  return { primary, code }
}
