# CLAUDE.md — Idiotkuben

A web app that teaches Rubik's cube solving using the layer-by-layer method.
Swedish UI, English code. Client-side only. Cloudflare Pages deploy.

Read `idiotkuben-plan.md` before writing any code. Read `skills/README.md` for skills.

---

## Stack

- Vite 8 + React 19 + TypeScript (strict mode)
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin — no config file needed)
- three.js + @react-three/fiber + @react-three/drei
- Vitest 4 for unit tests (`npm test`)

---

## File structure

```
src/
  i18n/sv.ts          — all Swedish UI strings (no Swedish chars in .tsx)
  cube/
    CubeState.ts      — types, solvedState(), cloneState(), FACE_COLORS
    moves.ts          — 18 pure move functions, Moves dispatch, INVERSE map
    notation.ts       — parseNotation("R U R' U2") → MoveName[]
    prng.ts           — mulberry32 seedable PRNG
    queries.ts        — isCubeSolved, isWhiteCrossSolved, findEdge, findCorner, …
    validate.ts       — isValidCubeState (all 6 checks incl. parity)
    verify.ts         — verifyScene(state, THREE.Object3D) → mismatches
    __tests__/
      moves.test.ts   — 13 tests covering moves, notation, validate
      validate.test.ts — parity / orientation / permutation tests
  solver/
    cubejs.d.ts       — TS declaration for cubejs npm package
    solve.ts          — solveFromState() wrapping cubejs Kociemba solver
    phases.ts         — sliceIntoPhases() → Phase[4] (LBL phase boundaries)
    __tests__/
      solver.test.ts  — solve + phase tests (15s timeout for cubejs init)
  persistence/
    session.ts        — SavedSession v1, saveSession/loadSession/clearSession
  pages/
    routes.ts         — Route type, Navigate type
    InputPage.tsx     — color input form → validate → save → /solve
    SolvePage.tsx     — load session, solve, render SolutionPlayer
  components/
    Cube3D.tsx        — imperative THREE.js cube, r3f Canvas wrapper
    MoveQueue.tsx     — useMoveQueue() hook (queue, enqueue, onMoveComplete, clear)
    DemoPage.tsx      — milestone 1 demo page
    ColorInput.tsx    — 2D unfolded cross color picker, locked centers
    SolutionPlayer.tsx — phase-by-phase move player with Cube3D re-mount on phase change
    PhaseProgress.tsx  — 4-step stepper (active/done/pending)
    ContinuePrompt.tsx — resume or start-fresh prompt when session exists
    StorageBanner.tsx  — dismissible localStorage notice
  main.tsx / App.tsx / index.css
```

---

## Key conventions

- Cube coordinate system: +Y=U, -Y=D, +Z=F, -Z=B, +X=R, -X=L
- Sticker indexing: see `cube/CubeState.ts` top-of-file docstring
- Move primes: `Rprime` (not `R'`) — apostrophes invalid in identifiers
- Swedish UI strings: `src/i18n/sv.ts` only; `.tsx` files stay ASCII
- No console.log except `[state]` hash after each completed move

## Critical architecture notes

- `Cube3D.tsx` creates THREE.js meshes **imperatively** in `useEffect` (not as JSX).
  This prevents React's reconciler from resetting cubie positions on re-render.
- Cubie vertex colors are permanent stickers — they rotate with the cubie.
  `verifyScene` reads local face normals, transforms them to world space, then
  maps to state indices. No color update needed after animations.
- `CubeScene.stateRef` tracks logical state across frames (avoids stale closures in useFrame).

---

## Commands

```bash
npm run dev    # dev server at localhost:5173
npm run build  # production build to dist/
npm test       # vitest (28 tests, all passing)
```

---

## Milestone 1 — done

- [x] All 18 move functions (pure, each applied 4× = identity)
- [x] notation.ts — parses "R U R' U2" strings
- [x] prng.ts — mulberry32 deterministic PRNG
- [x] validate.ts — color count + center uniqueness checks
- [x] queries.ts — layer-solved helpers for milestone 2
- [x] verify.ts — verifyScene scene-graph traversal
- [x] Cube3D — 3D rendering with animation (250ms), OrbitControls, reduced-motion support
- [x] useMoveQueue — FIFO queue hook
- [x] DemoPage — move buttons, reset, scramble (seeded), undo, verify, JSON display
- [x] 13 unit tests passing
- [x] TypeScript strict mode — clean
- [x] npm run build — clean (chunk size warning is expected; three.js is large)

## Milestone 2 — done

- [x] validate.ts — full parity checks (corner orientation, edge orientation, permutation parity)
- [x] cubejs integration — solveFromState() with Kociemba two-phase solver
- [x] phases.ts — sliceIntoPhases() splitting solution into 4 LBL phases
- [x] persistence/session.ts — SavedSession v1 in localStorage
- [x] InputPage — 2D unfolded color picker with live validation
- [x] SolvePage — async solve (setTimeout 50ms), phase slicing, SolutionPlayer
- [x] SolutionPlayer — per-phase Cube3D playback, skip/back/next
- [x] PhaseProgress, ContinuePrompt, StorageBanner components
- [x] Routing (App.tsx) — /, /input, /solve via useState
- [x] 28 unit tests passing
- [x] TypeScript strict mode — clean
- [x] npm run build — clean

## Milestone 3 — done

- [x] LBL solver (solver/lbl.ts) — layer-by-layer phase generation
- [x] Guided mode in SolutionPlayer — step-by-step with move explanations
- [x] LevelPage — level selector (Nybörjare / Avancerad)
- [x] Design tokens — Fraunces, Inter, JetBrains Mono, CSS variables in index.css
- [x] Full routing: /, /level, /input, /solve
- [x] Deployed at idiotkuben.pages.dev

## Milestone 4 — done

- [x] LandingPage (src/pages/LandingPage.tsx) — scroll-driven 3D cube on desktop, auto-rotate on mobile
- [x] DemoPage moved to /demo route (kept for debugging)
- [x] Cloudflare Worker (cloudflare-worker/) — AI tutor proxying to Llama 3.1 8B Instruct
- [x] TutorPanel component — shown in guided mode; 3 interaction types; rate limiting (3/min); error/loading states
- [x] VITE_TUTOR_URL env var gating — app works without the Worker
- [x] Mobile polish — cube 300px/450px responsive, Next button min-h 56px, phase stepper text hidden on mobile, stickers 32px/36px, buttons full-width on mobile
- [x] Telemetry — src/utils/telemetry.ts, track() on level_selected, solve_started, solve_completed, phase_completed, tutor_asked
- [x] Cloudflare Web Analytics script placeholder in index.html
- [x] .env added to .gitignore
- [x] 32 unit tests passing
- [x] TypeScript strict mode — clean
- [x] npm run build — clean

## File additions in Milestone 4

```
src/pages/LandingPage.tsx       — landing page with scroll-driven cube
src/components/TutorPanel.tsx   — AI tutor UI panel
src/utils/telemetry.ts          — track() helper for CF Web Analytics
cloudflare-worker/
  src/index.ts                  — Worker: POST /ask → Llama 3.1 8B → JSON
  wrangler.toml                 — Worker config with AI binding
  package.json                  — Worker package (wrangler dev dependency)
```
