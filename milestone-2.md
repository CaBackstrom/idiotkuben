# Milestone 2 — End-to-end solving (skeleton)

**Read `idiotkuben-plan.md` first.** This document only covers milestone 2 specifics.

**Goal:** A user can manually input a scrambled cube state, get a solution, and watch it play out move-by-move in 3D. No design polish — this milestone is about a working end-to-end flow. The demo page from milestone 1 remains unchanged; we add new pages alongside it.

Milestone 1 gave us a verified cube engine. Milestone 2 plugs a solver into it and adds the first real user flow: input → solve → play.

---

## Skills to apply

- `fullstack-engineer` (in `skills/`) — solver wrapper patterns, error handling, TypeScript
- `testing-qa` (in `skills/`) — tests for solver phases and validation
- `api-design` (in `skills/`) — not for an API yet, but the solver interface should be designed as cleanly as one

---

## What already exists (do not rebuild)

From milestone 1:
- `src/cube/CubeState.ts` — types, solved state, clone
- `src/cube/moves.ts` — all 18 moves, verified correct
- `src/cube/notation.ts` — string → MoveName[]
- `src/cube/queries.ts` — isWhiteCrossSolved, isFirstLayerSolved, isF2LSolved, isCubeSolved, findEdge, findCorner
- `src/cube/validate.ts` — isValidCubeState (checks 1-3 implemented, 4-5 stubbed)
- `src/components/Cube3D.tsx` — 3D rendering, quality prop
- `src/components/MoveQueue.tsx` — FIFO queue, owns cube state
- `src/i18n/sv.ts` — Swedish strings

Build on top of these. Do not refactor them unless a bug is found.

---

## New file structure

```
src/
├── solver/
│   ├── solve.ts               // cubejs wrapper → Move[]
│   ├── phases.ts              // slice solution into 4 L-by-L phases
│   └── __tests__/
│       └── solver.test.ts
├── persistence/
│   └── session.ts             // localStorage save/load
├── components/
│   ├── ColorInput.tsx         // 2D unfolded cross layout
│   ├── SolutionPlayer.tsx     // plays moves, phase display
│   ├── PhaseProgress.tsx      // "Phase 2 of 4: White corners"
│   └── ContinuePrompt.tsx     // "Continue where you left off?"
└── pages/
    ├── InputPage.tsx
    └── SolvePage.tsx
```

App.tsx gets simple client-side routing: `/` = DemoPage (milestone 1), `/input` = InputPage, `/solve` = SolvePage. Use a minimal router — React Router or just `useState` with a path string. Do not install a heavy router library without asking.

---

## Solver (`src/solver/`)

### solve.ts

Install and wrap `cubejs`:

```bash
npm install cubejs
```

`cubejs` takes a cube string in a specific format. Write a converter from our `CubeState` to cubejs format, and a converter from cubejs solution string back to `MoveName[]`.

```typescript
export function solveFromState(state: CubeState): MoveName[] {
  // 1. Convert CubeState → cubejs string format
  // 2. Call cubejs solver (it returns a space-separated move string)
  // 3. Convert the result back to MoveName[]
  // 4. Return the moves
}
```

**cubejs string format:** 54 characters, one per sticker, face order URFDLB, reading order 0-8 per face. The color encoding cubejs expects: U=U, R=R, F=F, D=D, L=L, B=B (same as ours — the mapping is direct).

**Important:** cubejs may take 1-3 seconds to initialize its lookup tables on first call. This is expected. Show a loading state in the UI ("Finding solution...") while it runs. Do not run it on the main thread without a loading indicator.

**Error handling:** If the cube state is unsolvable (shouldn't happen if validate.ts works, but be defensive), cubejs throws. Catch it, return a user-friendly error: "This cube state can't be solved. Check your color input."

### phases.ts

The solver returns an optimal solution (20 moves or fewer). This is not pedagogically useful — a user learning layer-by-layer expects to solve the white cross first, then corners, then middle layer, then yellow side.

The pedagogical translator works like this:

```typescript
export type Phase = {
  id: 1 | 2 | 3 | 4;
  nameKey: string;         // key into sv.ts for Swedish name
  moves: MoveName[];       // moves that complete this phase
  stateAfter: CubeState;   // cube state after this phase's moves
};

export function sliceIntoPhases(
  initialState: CubeState,
  solution: MoveName[]
): Phase[]
```

**Slicing algorithm:**

Apply moves one by one from the solution, checking after each move:

1. **Phase 1 ends** when `isWhiteCrossSolved(state)` returns true
2. **Phase 2 ends** when `isFirstLayerSolved(state)` returns true
3. **Phase 3 ends** when `isF2LSolved(state)` returns true
4. **Phase 4** = everything remaining (ends when `isCubeSolved(state)`)

If a phase-end condition is never met (edge case: the scramble is already partially solved), the phase gets 0 moves. That's fine — show it as "already done" in the UI.

**Important:** The Kociemba solver doesn't care about layers. Its solution may technically solve the white cross and then "un-solve" it while working on something else. If `isWhiteCrossSolved` never becomes true before `isFirstLayerSolved`, collapse phases 1 and 2 together with a note. Don't crash.

### solver.test.ts

```typescript
describe('solve', () => {
  test('solving a solved cube returns empty move list', () => { ... });
  test('solution for a known scramble solves the cube', () => {
    // scramble with seed 29810, solve, apply moves, check isCubeSolved
  });
  test('applying solution to scrambled state produces solved state', () => {
    // property test: scramble N moves, solve, apply solution, must be solved
  });
});

describe('phases', () => {
  test('phases sum to full solution length', () => { ... });
  test('stateAfter phase 4 is solved', () => { ... });
  test('phase ids are 1,2,3,4 in order', () => { ... });
});
```

---

## Validation completion (`src/cube/validate.ts`)

Complete the parity checks that were stubbed in milestone 1.

**Corner parity (check 4):** The 8 corners each have an orientation (0, 1, or 2). The sum of all corner orientations must be divisible by 3. A corner's orientation is determined by which direction its U/D sticker faces.

**Edge parity (check 5):** The 12 edges each have an orientation (0 or 1). The sum must be even.

Reference: https://kociemba.org/cube.htm — "Coordinate Representation" section explains the formal definition. If the implementation is unclear, ask the user before guessing. A wrong parity check is worse than a stubbed one.

Also add **permutation parity**: the total number of swaps required to sort all pieces must be even. (Corner permutation parity + edge permutation parity must have the same sign.)

Add tests for parity checks:
```typescript
test('detects impossible corner orientation', () => { ... });
test('detects impossible edge orientation', () => { ... });
test('detects impossible permutation parity', () => { ... });
```

---

## Color input (`src/components/ColorInput.tsx`)

2D unfolded cross layout:

```
         +-------+
         |  U U U|
         |  U U U|
         |  U U U|
+-------++-------++-------++-------+
|L L L  ||F F F  ||R R R  ||B B B  |
|L L L  ||F F F  ||R R R  ||B B B  |
|L L L  ||F F F  ||R R R  ||B B B  |
+-------++-------++-------++-------+
         |  D D D|
         |  D D D|
         |  D D D|
         +-------+
```

**Interaction model:**
- A color palette is shown alongside the cross (6 colored squares, one per face color)
- User clicks a color in the palette to select it as "active color"
- User clicks any sticker square to paint it with the active color
- Center stickers (index 4 of each face) are locked — they show their face color and cannot be changed
- Each sticker square shows its current color as background
- The currently selected palette color has a visible highlight/ring

**Initial state:** All stickers show their face's solved color (U=white, R=red, etc.). This means a user with a solved cube can just click Submit immediately.

**Submit button behavior:**
1. Run `isValidCubeState(state)` (with full parity checks from above)
2. If invalid: show specific error message inline, do not navigate
3. If valid: save state to session (localStorage), navigate to `/solve`

**Important UX detail:** Label each face clearly (U, F, R, L, B, D) so the user knows which face to look at. Add a small orientation hint: "Hold your cube with white on top and green facing you."

---

## Session persistence (`src/persistence/session.ts`)

```typescript
type SavedSession = {
  version: 1;
  level: 'guided' | 'quick';
  cubeState: CubeState;
  solution: MoveName[];
  currentStepIndex: number;
  phase: 1 | 2 | 3 | 4;
  startedAt: string;
  frustrationCount: { phase1: number; phase2: number; phase3: number; phase4: number };
};

const SESSION_KEY = 'idiotkuben:session';

export function saveSession(session: SavedSession): void
export function loadSession(): SavedSession | null
export function clearSession(): void
export function updateStep(stepIndex: number): void  // partial update
```

`updateStep` reads the current session, updates `currentStepIndex`, writes back. This is called after every "Next" click in the solution player so progress is always saved.

---

## ContinuePrompt (`src/components/ContinuePrompt.tsx`)

Shown on app load if `loadSession()` returns a non-null session.

```
+------------------------------------------+
|  You have an unfinished solve.           |
|  Started: [date/time]                    |
|  Progress: Phase 2 of 4, step 7 of 24   |
|                                          |
|  [Continue]          [Start fresh]       |
+------------------------------------------+
```

"Continue" navigates to `/solve` with the saved session restored.
"Start fresh" calls `clearSession()` and shows the normal landing/input flow.

No design polish — functional layout only.

---

## SolutionPlayer (`src/components/SolutionPlayer.tsx`)

This milestone builds the **Quick mode** only. Guided mode (move-by-move with arrows) comes in milestone 3.

**Quick mode layout:**

```
+------------------------------------------+
|  [3D cube — draggable]                   |
|                                          |
|  Phase 2 of 4: White corners             |
|  ████████░░░░░░░░ 2/4 phases             |
|                                          |
|  Algorithm: R U R' U' R U2 R'           |
|  Moves in phase: 7                       |
|                                          |
|  [▶ Play phase]  [⏭ Skip to end]        |
|  [← Previous phase]  [Next phase →]     |
+------------------------------------------+
```

**Play phase:** Enqueues all moves in the current phase into MoveQueue. The 3D cube animates them in sequence. Button disabled while animating.

**Skip to end:** Applies all moves in the phase instantly (no animation) — calls `Moves[name](state)` for each move without going through MoveQueue. Updates the 3D cube to the final state directly.

**Previous/Next phase:** Navigates between phases. Applying "Previous phase" means undo-ing the moves from the current phase (apply their inverses in reverse order).

**Progress saved:** After each phase completion, call `updateStep` with the new step index.

---

## PhaseProgress (`src/components/PhaseProgress.tsx`)

Simple progress indicator:

```typescript
type Props = {
  currentPhase: 1 | 2 | 3 | 4;
  phases: Phase[];
};
```

Shows 4 steps, labels them (Vita korset / Vita hörnen / Mellanlager / Gula sidan), highlights current. Can be a simple horizontal stepper — no design ambition yet.

---

## Swedish strings to add to `src/i18n/sv.ts`

```typescript
export const sv = {
  // ... existing demo strings ...
  phases: {
    1: 'Vita korset',
    2: 'Vita h\u00f6rnen',
    3: 'Mellanlager',
    4: 'Gula sidan',
  },
  input: {
    title: 'St\u00e4ll in din kub',
    hint: 'H\u00e5ll kuben med vitt uppf\u00f6r och gr\u00f6nt mot dig.',
    submit: 'L\u00f6s min kub',
    invalid: 'Ogiltigt kubst\u00e4llning',
    solving: 'Hittar l\u00f6sning\u2026',
  },
  solve: {
    phase: 'Fas',
    of: 'av',
    play: 'Spela fas',
    skip: 'Hoppa till slut',
    prev: 'F\u00f6reg\u00e5ende fas',
    next: 'N\u00e4sta fas',
    done: 'Kuben \u00e4r l\u00f6st!',
    moves: 'drag',
  },
  continue: {
    title: 'Du har en p\u00e5g\u00e5ende l\u00f6sning',
    started: 'Startad',
    progress: 'Framsteg',
    continueBtn: 'Forts\u00e4tt',
    freshBtn: 'B\u00f6rja om',
  },
  banner: {
    storage: 'Vi sparar ditt framsteg lokalt i din webbl\u00e4sare. Inget skickas till oss.',
    ok: 'OK',
  },
};
```

---

## Cookie/storage info banner

The plan requires a minimal info banner for localStorage usage. Build it now since we're introducing localStorage.

Simple component `StorageBanner.tsx`:
- Shown once, dismissed with "OK" button
- Dismissal stored in localStorage key `idiotkuben:banner-dismissed`
- If the key exists, banner is not shown
- Fixed position, bottom of screen, unobtrusive

---

## Routing

Add minimal routing to `App.tsx`:

```typescript
type Route = '/' | '/input' | '/solve';
const [route, setRoute] = useState<Route>('/');
```

Pass `navigate` (a `(route: Route) => void` function) down as a prop. No URL changes in this milestone — that comes in milestone 3 when we add a real landing page. The demo page at `/` just gets a "Try the solver →" link added to it.

---

## Definition of done

- [ ] `npm install && npm run dev` starts cleanly
- [ ] `npm run build` produces dist/ without warnings
- [ ] `npm test` passes all tests (existing 13 + new solver + parity tests)
- [ ] Manual flow: go to `/input`, paint a scrambled cube, submit, watch solution play in phases
- [ ] Validation catches wrong color count, duplicate centers, and at least one parity error
- [ ] Validation error messages are specific, not "invalid cube"
- [ ] ContinuePrompt appears on reload if a session exists
- [ ] Continue restores correct phase and step index
- [ ] "Start fresh" clears session
- [ ] Skip to end works correctly (cube visually matches phase end state)
- [ ] Previous phase correctly undoes moves
- [ ] Storage banner shown once, dismissed, not shown again
- [ ] No Swedish characters in any .tsx file
- [ ] CLAUDE.md updated: mark M2 done, describe what M3 will be
- [ ] git commit: "Milestone 2: solver, color input, solution player"

---

## Known issues from milestone 1 to keep in mind

- The F/B move indices were swapped and fixed. If any new code touches move logic, re-run the full test suite.
- `queries.ts` functions were written in M1 but not tested. Milestone 2 tests them implicitly through `phases.ts`. If phase slicing produces wrong results, check `isWhiteCrossSolved` and `isF2LSolved` first.
- The `prefers-reduced-motion` path in Cube3D snaps to final position. Make sure SolutionPlayer's "Skip to end" uses the same snap path, not the animation path.

---

## When milestone 2 is done

Tell the user. Do not start milestone 3 until the user reviews and approves.

The user should manually test: paint a known scramble, submit, watch all 4 phases complete, reload and continue. If any of those fail, the milestone is not done.
