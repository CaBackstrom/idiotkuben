# Milestone 1 — Foundation

**Read `idiotkuben-plan.md` first.** This document only covers milestone 1's specifics. The plan covers tone, stack decisions, state model, hard rules.

**Goal:** Verified working cube state, all 18 moves, 3D rendering synchronized with state, demo page for manual verification. No design ambition — this milestone is purely about getting the foundation correct so milestone 2 can build on it without surprises.

The hidden risk in this milestone is **state ↔ visual desync**. After many moves, floating-point drift accumulates and the visual representation of the cube can disagree with the state array. If this isn't caught here, it surfaces in milestone 2 when the solver reads from state and produces a solution that doesn't match what the user sees. The verify utility is the gate against this.

---

## Skills to apply

Read `skills/README.md` and apply these skills during this milestone:
- `frontend-design` (already in your skills folder) — for the demo page layout
- `fullstack-engineer` (in `skills/`) — TypeScript patterns, component structure
- `testing-qa` (in `skills/`) — Vitest setup and test strategy

For three.js / react-three-fiber specifics not covered by skills, search current documentation at:
- https://r3f.docs.pmnd.rs/
- https://drei.docs.pmnd.rs/
- https://threejs.org/docs/

---

## File structure

```
idiotkuben/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── i18n/
    │   └── sv.ts              // all Swedish UI strings live here
    ├── cube/
    │   ├── CubeState.ts       // types, solved state, cloning, ASCII docs
    │   ├── moves.ts           // all 18 moves as pure functions
    │   ├── notation.ts        // parse "R U R' U2" → Move[]
    │   ├── queries.ts         // isWhiteCrossSolved, findEdge, etc.
    │   ├── validate.ts        // isValidCubeState
    │   ├── verify.ts          // state ↔ visual comparison utility
    │   ├── prng.ts            // deterministic seedable PRNG (mulberry32)
    │   └── __tests__/
    │       └── moves.test.ts
    └── components/
        ├── Cube3D.tsx         // 3D rendering with r3f
        ├── MoveQueue.tsx      // FIFO queue for pending moves
        └── DemoPage.tsx       // milestone 1 demo
```

---

## Cube state implementation (`src/cube/`)

### CubeState.ts

Define types from the plan. Add solved-state factory. Add deep-clone helper. Include the full ASCII orientation diagram from the plan as a top-of-file docstring — this is where future contributors (or future Claude Code sessions) will look.

```typescript
/**
 * Sticker indexing per face (viewed from outside the cube):
 *
 *         U face                      
 *         0 1 2                       
 *         3 4 5                       
 *         6 7 8  (row 6-7-8 borders F)
 *
 *  L face   F face   R face   B face  
 *  0 1 2    0 1 2    0 1 2    0 1 2   
 *  3 4 5    3 4 5    3 4 5    3 4 5   
 *  6 7 8    6 7 8    6 7 8    6 7 8   
 *  All four side faces: row 0-1-2 borders U, row 6-7-8 borders D.
 *  L's column 2-5-8 borders F. R's column 0-3-6 borders F.
 *  B's column 0-3-6 borders R. B's column 2-5-8 borders L.
 *
 *         D face
 *         0 1 2  (row 0-1-2 borders F)
 *         3 4 5
 *         6 7 8
 */
```

### moves.ts

All 18 moves as pure functions: `(state: CubeState) => CubeState`. Naming: `U`, `Uprime`, `U2`, `R`, `Rprime`, `R2`, etc. (apostrophes don't work in identifier names).

Implementation strategy: each move rotates 8 stickers on its own face (corners and edges) plus cycles 12 stickers across the four adjacent faces. Write each move so the logic is obvious from reading it — explicit array index assignments, not clever loops. Reading the function should make it visually clear which stickers go where.

Export a dispatch object:
```typescript
export const Moves: Record<MoveName, (state: CubeState) => CubeState> = { U, Uprime, U2, ... };
```

### notation.ts

Parse strings like `"R U R' U2"` into `MoveName[]`. Whitespace-separated. Reject anything that isn't a valid move name with a thrown error including the offending token. For milestone 1, only the 18 standard moves are valid — no wide moves, no slice moves, no rotations.

### queries.ts

Helper functions that milestone 2's solver-translator will need. Build them now so milestone 2 doesn't have to retrofit them. Required functions:
- `isWhiteCrossSolved(state): boolean`
- `isFirstLayerSolved(state): boolean`
- `isF2LSolved(state): boolean`  // first two layers
- `isCubeSolved(state): boolean`
- `findEdge(state, color1, color2): { face: Face, index: number }`
- `findCorner(state, color1, color2, color3): { face: Face, index: number }`

These are pure functions reading state. No tests required in milestone 1 (added in milestone 2 when they're used) but they must compile and have correct types.

### validate.ts

`isValidCubeState(state): { valid: boolean, reason?: string }`

Check:
1. Each face has exactly 9 stickers
2. Each color appears exactly 9 times across all 54 stickers
3. All 6 centers are unique colors (state.U[4] !== state.D[4] etc.)
4. Corner parity is valid (sum of corner orientations divisible by 3)
5. Edge parity is valid (sum of edge orientations even)

The parity checks (4 and 5) are the tricky ones. If you don't know how to compute them, this is a legitimate place to ask the user before guessing — or look up the formal definition in the Kociemba paper (https://kociemba.org/cube.htm).

For milestone 1, only checks 1-3 are required. Stub checks 4-5 to always return valid; mark with `// TODO milestone 2`.

Error messages must be concrete:
- ❌ "Invalid cube"
- ✅ "You have 10 red and 8 orange — check that you didn't mix them up."

### verify.ts

`verifyStateMatchesVisual(state, scene): { ok: boolean, mismatches: Array<{face, index, expected, actual}> }`

The verify utility is the cornerstone of this milestone. It:
1. Iterates the 27 cubies in the scene
2. Reads each cubie's world position and rotation
3. Determines which faces of the cubie point in which world directions
4. From that, derives which sticker is currently visible on each cube face
5. Compares to the state array

**Critical implementation details:**
- Use **epsilon comparison** against axis directions, not strict equality. Epsilon = 0.001.
- Snap cubie rotations to nearest 90° before comparison (positions to integers).
- The 6 world directions to test against are `[+X, -X, +Y, -Y, +Z, -Z]`.
- For each cubie, transform its 6 local face normals by its world rotation, then for each transformed normal find the closest world direction within epsilon.

If you're not confident in this geometry, ask the user before guessing. A wrong verify utility is worse than no verify utility — it gives false confidence.

### prng.ts

Mulberry32 implementation, ~6 lines. Seedable, deterministic. Used for scramble generation. Display the seed in the UI so bugs are reproducible.

```typescript
export function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

---

## 3D rendering (`src/components/Cube3D.tsx`)

**Approach:** Render 27 cubies (3×3×3 grid). Each cubie is a mesh with 6 colored faces based on state.

**Move animation:**
1. When a move arrives from the queue, identify the 9 cubies in the rotating layer
2. Group them temporarily under a pivot Group3D
3. Animate the group's rotation 90° (or 180° for double moves) over 250ms using simple lerp inside `useFrame` — no animation library
4. When the animation completes:
   - Decompose the group's world matrix into each child's local transform
   - Snap rotations to nearest 90° and positions to integers
   - Remove cubies from the pivot group, return them to the scene root
   - Update the state array via the move function from `cube/moves.ts`
   - Mark queue position as complete, process next queued move

**Camera:** PerspectiveCamera. Drei's `OrbitControls` for inspection. No autorotation in this milestone.

**Lighting:** Ambient + one directional. No shadows.

**Reduced motion:** If `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, skip animation — just snap cubies to final positions and update state immediately.

**Quality prop (defined now, used in milestone 3):** Accept `quality: 'low' | 'high' | undefined`. In milestone 1, both behave identically. Milestone 3 will differentiate (segments, shadows, framerate cap).

---

## MoveQueue (`src/components/MoveQueue.tsx`)

A simple FIFO queue. Public API:
```typescript
type MoveQueueAPI = {
  enqueue(move: MoveName): void;
  isAnimating: boolean;
  pendingCount: number;
  clear(): void;
};
```

When the cube is idle and a move is enqueued, start animating it. When animation completes, check the queue — if there's another move, animate it. If not, idle.

This component owns the cube state. The state lives here in a `useState`, moves are applied via `Moves[name](state)`, and the resulting state is passed to `Cube3D` as a prop.

---

## Demo page (`src/components/DemoPage.tsx`)

Layout (bare-bones — design comes in milestone 3):

```
+----------------------------------------------------------+
|  Idiotkuben — Milestone 1 Demo                           |
|                                                          |
|  +----------------+    +-----------------------------+   |
|  |                |    | Move buttons:               |   |
|  |   3D cube      |    | [U][U'][U2] [R][R'][R2]    |   |
|  |   (drag to     |    | [F][F'][F2] [L][L'][L2]    |   |
|  |    rotate)     |    | [D][D'][D2] [B][B'][B2]    |   |
|  |                |    |                             |   |
|  +----------------+    | [Reset] [Scramble seed=____] |   |
|                        | [Verify] [Undo]             |   |
|                        +-----------------------------+   |
|                                                          |
|  Last moves: R U R' U'                                   |
|  Queue: 0 pending                                        |
|                                                          |
|  State (live JSON, collapsible):                         |
|  { U: [...], R: [...], ... }                             |
|                                                          |
|  Verify result: ✓ OK  (or ✗ FAIL with mismatches)       |
+----------------------------------------------------------+
```

**Behavior:**
- Move buttons enqueue the move. Buttons remain enabled during animation.
- Reset clears state to solved + clears the queue + clears history.
- Scramble button shows a text input for seed (default: random number on page load), generates 20 moves, enqueues them all.
- Verify button runs `verifyStateMatchesVisual` and displays result. On fail, list mismatches.
- Undo applies the inverse of the last move. (R → R', R' → R, R2 → R2.)
- State JSON is collapsible (`<details>` element is fine).
- After each completed move, log state hash to console: `console.log('[state]', hash)`. Use a simple hash like `JSON.stringify(state).split('').reduce(...)` — doesn't need to be cryptographic.

**Swedish strings** go in `src/i18n/sv.ts`:
```typescript
export const sv = {
  demo: {
    title: 'Idiotkuben \u2014 Milstolpe 1 Demo',
    moves: 'Drag',
    reset: '\u00c5terst\u00e4ll',
    scramble: 'Slumpa',
    verify: 'Verifiera',
    undo: '\u00c5ngra',
    lastMoves: 'Senaste drag',
    queue: 'I k\u00f6',
    state: 'State (JSON)',
    verifyOk: 'OK \u2014 state och visual st\u00e4mmer',
    verifyFail: 'FEL \u2014 state och visual matchar inte',
  },
};
```

(Use `\u00e5` for å, `\u00e4` for ä, `\u00f6` for ö to keep TSX files ASCII-clean.)

---

## Tests (`src/cube/__tests__/moves.test.ts`)

Required tests using Vitest:

```typescript
describe('moves', () => {
  test('R applied 4 times returns identity', () => { ... });
  test('R prime applied 4 times returns identity', () => { ... });
  test('U2 equals U U', () => { ... });
  test('all 18 moves applied 4 times return identity for each', () => { ... });
  test('six-move cycle (R U R\' U\') 6 times returns identity', () => { ... });
  test('a move and its inverse cancel', () => { ... });
});

describe('notation', () => {
  test('parses "R U R\' U2" into 4 moves', () => { ... });
  test('throws on invalid token', () => { ... });
});

describe('validate', () => {
  test('solved state is valid', () => { ... });
  test('detects wrong color count', () => { ... });
  test('detects duplicate centers', () => { ... });
});
```

Run with `npm test`. All must pass before milestone is considered done.

---

## Definition of done

Every checkbox must be green before declaring milestone 1 complete:

- [ ] `npm install && npm run dev` starts cleanly without warnings
- [ ] `npm run build` produces `dist/` without warnings
- [ ] `npm test` passes all tests
- [ ] All 18 move buttons in the demo work correctly (verify each manually after tests pass)
- [ ] Drag-to-rotate works on the 3D cube
- [ ] Reset returns to solved state
- [ ] Scramble with a given seed produces the same sequence on reload
- [ ] After 100 random moves, Verify button returns OK
- [ ] Undo backs out exactly one move (test with: R, undo, verify state is solved)
- [ ] State hash is logged to console after each move
- [ ] `prefers-reduced-motion` works (test by enabling it in browser dev tools)
- [ ] No Swedish characters in any .tsx file (grep check)
- [ ] CLAUDE.md created in project root with: project overview, stack, file structure, conventions, what's done in M1, what M2 will be

---

## Setup commands (assume Vite scaffold already exists)

The user has already run `npm create vite@latest . -- --template react-ts` and `npm install`. The Vite default template is in place. Your job is to:

1. Add the dependencies needed for this milestone:
```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three vitest
```

2. Configure Tailwind:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

3. Configure Vitest in `vite.config.ts`.

4. Replace the default Vite content with the milestone 1 implementation.

5. Verify everything works: `npm run dev`, manually test, then `npm test`, then `npm run build`.

---

## When milestone 1 is done

Update CLAUDE.md, commit, and tell the user. Do not start milestone 2 until the user reviews and approves.

The user will manually run a long scramble (50+ moves) and click Verify before approving. If it fails, the milestone is not done — fix the desync before declaring victory.
