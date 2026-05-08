import { solveLayerByLayer } from '../lbl'
import { isCubeSolved } from '../../cube/queries'
import { mulberry32 } from '../../cube/prng'
import { ALL_MOVES, Moves } from '../../cube/moves'
import { solvedState } from '../../cube/CubeState'

test('solves 10 different scrambles end-to-end', () => {
  const seeds = [29810, 88158, 30517, 12345, 99999,
                 11111, 55555, 77777, 42042, 13579];
  for (const seed of seeds) {
    const rng = mulberry32(seed);
    let state = solvedState();
    for (let i = 0; i < 20; i++) {
      const move = ALL_MOVES[Math.floor(rng() * ALL_MOVES.length)];
      state = Moves[move](state);
    }
    const solution = solveLayerByLayer(state);
    const result = solution.reduce((s, m) => Moves[m](s), state);
    expect(isCubeSolved(result)).toBe(true);
  }
}, 60000);
