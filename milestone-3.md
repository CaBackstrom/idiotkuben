# Milestone 3 — Pedagogical Solver + Design

**Read `idiotkuben-plan.md` and `skills/README.md` first.**

**Goal:** Two things in this milestone:

1. A real layer-by-layer solver that produces a pedagogically correct solution — white cross first, then white corners, then middle layer, then yellow side. Each phase actually completes before the next begins.

2. The app starts looking like a real product — design tokens applied everywhere, landing page with scroll-driven 3D cube, level selector, and the guided mode where the user confirms each move before proceeding.

This is the heaviest milestone. The LBL solver alone is 3-4 days of work. Do not rush it. A wrong solver is worse than a slow solver.

---

## Context from previous milestones

- Milestone 1: cube engine, all 18 moves verified correct (F/B bug fixed), verify utility
- Milestone 2: Kociemba solver (cubejs) for the "Optimal/Advanced" mode, color input, solution player, localStorage persistence
- The Kociemba solver stays. It becomes the "Advanced" level. The new LBL solver is the "Beginner" level.
- The phase slicing in `phases.ts` was a hack — the Kociemba solution was split arbitrarily. That hack is replaced by the real LBL solver in this milestone for beginner mode.

---

## Part 1: Layer-by-Layer Solver

### New file: `src/solver/lbl.ts`

This is the core of this milestone. A complete layer-by-layer solver that produces a sequence of moves where each phase is genuinely complete before the next starts.

```typescript
export type LBLSolution = {
  phases: LBLPhase[];
  totalMoves: number;
};

export type LBLPhase = {
  id: 1 | 2 | 3 | 4;
  name: string;           // 'white-cross' | 'white-corners' | 'middle-layer' | 'yellow-side'
  moves: MoveName[];      // moves that complete this phase
  stateAfter: CubeState;  // verified: phase condition is true on this state
};

export function solveLayerByLayer(initialState: CubeState): LBLSolution
```

**Phase 1: White Cross**

Goal: U[1], U[3], U[5], U[7] are all 'U' (white), AND the adjacent edge stickers match their center colors.

Specifically:
- U[1] = 'U', F[1] = 'F' (white-green edge in correct position)
- U[3] = 'U', L[1] = 'L' (white-orange edge)
- U[5] = 'U', R[1] = 'R' (white-red edge)
- U[7] = 'U', B[1] = 'B' (white-blue edge)

Algorithm: For each of the 4 white edge pieces, find where it is and apply moves to place it correctly without disturbing already-placed edges.

Standard approach: First bring all white edges to the D face (or U face if already there), then rotate them into position.

**Phase 2: White Corners**

Goal: The entire U face is 'U' AND U[0], U[2], U[6], U[8] corners have all three correct colors.

Specifically check: U[0] corner = U/L/B colors correct, U[2] = U/R/B, U[6] = U/L/F, U[8] = U/R/F.

Standard algorithm: Sexy move loop — R U R' U' repeated until corner is correct (max 5 times). For each corner, first bring it to DFR position, then apply.

**Phase 3: Middle Layer**

Goal: F[3], F[5], R[3], R[5], B[3], B[5], L[3], L[5] are all correct (middle layer edges placed).

Standard algorithms:
- Right insert: U R U' R' U' F' U F
- Left insert: U' L' U L U F U' F'

For each middle layer edge: find it in the U layer (or on middle layer but wrong), apply correct insert.

**Phase 4: Yellow Side**

Goal: isCubeSolved(state) = true.

Sub-phases (do in order):
1. Yellow cross on D: F R U R' U' F' or F U R U' R' F'
2. Orient yellow corners (OLL): R U R' U R U2 R'
3. Permute yellow corners (PLL corner): U R U' L' U R' U' L
4. Permute yellow edges (PLL edge): R2 U R U R' U' R' U' R' U R'

Each sub-phase: check if already done, skip if so. Apply algorithm, re-check, repeat if needed (max 4 iterations per sub-phase before giving up — if exceeded, something is wrong in earlier phases).

### Implementation guidance

Write each phase as a separate function:
```typescript
function solveWhiteCross(state: CubeState): MoveName[]
function solveWhiteCorners(state: CubeState): MoveName[]
function solveMiddleLayer(state: CubeState): MoveName[]
function solveYellowSide(state: CubeState): MoveName[]
```

Each function:
1. Takes the current state
2. Returns the moves to complete that phase
3. Must guarantee: applying the returned moves to the input state produces a state where the phase condition is met
4. Must not assume previous phases — check the actual state

**Helper: applyMoves(state, moves[]): CubeState**
Already exists from milestone 1 — use it to simulate move sequences and check results.

**Helper: rotateFaceToTop(targetFace): MoveName[]**
Whole-cube rotation to bring a face to U position. Useful for reusing phase algorithms in different orientations.

**CRITICAL: After implementing each phase function, test it:**
```typescript
// In solver.test.ts, add:
test('white cross is solved after phase 1', () => {
  const scrambled = applyMoves(solvedState(), parseNotation('R U R\' U\' F B L D'));
  const moves = solveWhiteCross(scrambled);
  const result = applyMoves(scrambled, moves);
  expect(isWhiteCrossSolved(result)).toBe(true);
});
// Same pattern for each phase
```

Do not proceed to the next phase until the current phase test passes.

### New file: `src/solver/lblSteps.ts`

Breaks each phase into individual moves with explanations for guided mode:

```typescript
export type MoveStep = {
  move: MoveName;
  explanation: string;    // key into sv.ts, e.g. 'move.R.explanation'
  phase: 1 | 2 | 3 | 4;
  phaseStep: number;      // which step within the phase
};

export function expandToSteps(solution: LBLSolution): MoveStep[]
```

Explanations are per-move-type, not per-position. "R" always says "Vrid höger sida medsols". The context (why) comes from the phase name shown above.

### Updates to `src/solver/solve.ts`

Add a level parameter:
```typescript
export type SolverLevel = 'beginner' | 'advanced';

export function solve(state: CubeState, level: SolverLevel): {
  phases: Phase[];  // for advanced: existing Kociemba phases
  steps: MoveStep[]; // for beginner: LBL steps
  totalMoves: number;
}
```

---

## Part 2: Guided Mode

The beginner level uses guided mode. Each move is shown one at a time. The user clicks "Klar — nästa drag" to advance.

### Updates to `src/components/SolutionPlayer.tsx`

Add a `mode: 'guided' | 'quick'` prop.

**Guided mode UI:**
```
+------------------------------------------+
|  [3D cube — draggable, shows current     |
|   state, arrow overlay on moving face]   |
|                                          |
|  Fas 1: Vita korset  (drag 3 av 19)     |
|  ████░░░░░░░░░░░░░  3/19               |
|                                          |
|  Drag: R                                 |
|  "Vrid höger sida medsols"              |
|                                          |
|  [← Backa]        [Klar — nästa drag →] |
+------------------------------------------+
```

**Arrow overlay on 3D cube:**
A colored arrow or highlight on the face that is about to move. For R move: highlight the right face with a semi-transparent overlay and an arrow. This is a visual cue, not a perfect animation — an `<Html>` element from drei overlaid on the face center is fine.

The user clicks "Klar — nästa drag" when they have performed the move on their physical cube. The 3D cube on screen then animates the move (same animation as milestone 1). Then the next move is shown.

**Back button:** Undo the last move (apply inverse). Update step counter. Same undo logic from milestone 1.

**Progress is saved** to localStorage after each step (existing `updateStep` from milestone 2).

### Updates to `src/pages/SolvePage.tsx`

Read level from localStorage session. Render `SolutionPlayer` in correct mode.

---

## Part 3: Level Selector

### New page: `src/pages/LevelPage.tsx`

Route: `/level`

Two cards side by side (stacked on mobile):

```
+------------------+  +------------------+
|  Nybörjare       |  |  Avancerad       |
|                  |  |                  |
|  Varje drag      |  |  Optimal         |
|  visas med       |  |  lösning.        |
|  förklaring.     |  |  Du gör allt     |
|  Du bekräftar    |  |  i din takt.     |
|  varje steg.     |  |                  |
|                  |  |  ~20 drag        |
|  ~80-120 drag    |  |                  |
|                  |  |                  |
|  [Välj]          |  |  [Välj]          |
+------------------+  +------------------+
```

No "easy/hard" labels. Concrete descriptions of what each level does. The move count estimate is honest — LBL takes more moves.

Save chosen level to localStorage session before navigating to `/input`.

### Update routing in `App.tsx`

Add `/level` route between `/` and `/input`.

Flow: `/` (demo) → `/level` → `/input` → `/solve`

The "Lös min kub →" button on demo page goes to `/level`, not `/input` directly.

---

## Part 4: Design

Apply the editorial-modern design system from `idiotkuben-plan.md`. This milestone is where the app starts looking finished.

### Design tokens (already defined in plan, now enforce everywhere)

```css
:root {
  --bg: #FAFAF7;
  --fg: #1A1A1A;
  --accent: #C8102E;       /* cube-red — final choice */
  --muted: #6B6B6B;
  --border: #E5E5E0;
  --font-display: 'Fraunces', serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

Load Google Fonts in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,300&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
```

Hardcoded colors anywhere in components = bug. Use CSS variables or Tailwind config mapped to these variables.

### Apply design to existing pages

**InputPage (`/input`):**
- Page title in Fraunces display font, large
- Palette and cross laid out with proper spacing
- "Blanda kub" button: outlined style (border, transparent bg)
- "Lös min kub" button: filled accent color (#C8102E)
- Color counter row: clean monospace font
- Validation error: red left-border card, not a full red background

**SolvePage (`/solve`):**
- Phase stepper: clean horizontal steps, completed phases muted, active phase bold
- Algorithm notation in JetBrains Mono
- "Spela fas" / "Hoppa till slut" buttons: clear visual hierarchy
- Guided mode: move name large (48px), explanation smaller, progress subtle

**LevelPage (`/level`):**
- Two cards with clear borders, generous padding
- Move count estimates in muted color
- Active hover state on cards before clicking

### Landing page (`/`)

For this milestone: apply design tokens to the demo page. The real landing page with scroll-driven 3D cube is milestone 4. The demo page should at minimum have the correct typography and colors.

Add a proper header:
```
Idiotkuben
Lär dig lösa en Rubiks kub — ett drag i taget.
[Lös min kub →]
```

---

## Skills to apply

- `frontend-design` (in your Claude Code installation) — mandatory for all design work
- `fullstack-engineer` (in `skills/`) — LBL solver architecture
- `testing-qa` (in `skills/`) — phase-by-phase solver tests are critical

For the LBL algorithm specifics, reference:
- https://ruwix.com/the-rubiks-cube/how-to-solve-the-rubiks-cube-beginners-method/
- https://jperm.net/3x3/cfop (for algorithm notation reference)

---

## Tests to add

```typescript
// src/solver/__tests__/lbl.test.ts

describe('LBL solver', () => {
  test('white cross solved after phase 1', () => { ... });
  test('white corners solved after phase 2', () => { ... });
  test('middle layer solved after phase 3', () => { ... });
  test('cube solved after phase 4', () => { ... });
  
  test('solves 10 different scrambles completely', () => {
    const seeds = [29810, 88158, 30517, 12345, 99999, 11111, 55555, 77777, 42042, 13579];
    for (const seed of seeds) {
      const scrambled = generateScramble(seed, 20);
      const solution = solveLayerByLayer(scrambled);
      const result = applyAllMoves(scrambled, solution);
      expect(isCubeSolved(result)).toBe(true);
    }
  });
  
  test('phase order is always 1,2,3,4', () => { ... });
  test('stateAfter each phase satisfies that phase condition', () => { ... });
  test('already solved cube returns empty solution', () => { ... });
});
```

The 10-scramble test is the most important. If any of those fail, the solver has a bug.

---

## Definition of done

- [ ] `npm test` passes all tests including new LBL tests
- [ ] `npm run build` clean
- [ ] LBL solver solves 10 known scrambles correctly
- [ ] Guided mode shows one move at a time with explanation
- [ ] Back button undoes correctly in guided mode
- [ ] Advanced mode still works (Kociemba, existing flow)
- [ ] Level selector at `/level` — both levels navigate to `/input` correctly
- [ ] Design tokens applied everywhere — no hardcoded colors in components
- [ ] Google Fonts loaded and rendering correctly
- [ ] Phase stepper shows correct phase highlighting
- [ ] Arrow overlay on 3D cube in guided mode (even if basic)
- [ ] Progress saved to localStorage after each guided step
- [ ] No Swedish characters in any .tsx file
- [ ] CLAUDE.md updated
- [ ] Deployed to Cloudflare Pages:
  `npm run build && npx wrangler pages deploy dist --project-name=idiotkuben`

---

## Important warnings

**The LBL solver will be the hardest code in this project.** Each phase has edge cases:
- What if the piece is already in the right position but oriented wrong?
- What if applying the algorithm disturbs a previously solved piece?
- What if the cube is already partially solved when the user inputs it?

Test each phase function in isolation before combining. Use `console.log` liberally during development, remove before deploy.

**Do not start on design before the solver tests pass.** A beautiful app with a broken solver is worthless for a user trying to learn.

**If the LBL solver takes more than 300 moves for any scramble, something is looping.** Add a move-count safety limit of 300 and throw an error if exceeded — better to fail loudly than loop forever.

---

## When milestone 3 is done

Tell the user. Deploy and share the Cloudflare URL.

The user should test: scramble with "Blanda kub", choose Nybörjare, go through all 4 phases in guided mode, confirm each move, reach "Kuben är löst!". If any phase doesn't actually complete its condition, the milestone is not done.

Do not start milestone 4 until the user approves.
