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
    validate.ts       — isValidCubeState (checks 1-3; parity stubs for M2)
    verify.ts         — verifyScene(state, THREE.Object3D) → mismatches
    __tests__/
      moves.test.ts   — 13 tests covering moves, notation, validate
  components/
    Cube3D.tsx        — imperative THREE.js cube, r3f Canvas wrapper
    MoveQueue.tsx     — useMoveQueue() hook (queue, enqueue, onMoveComplete, clear)
    DemoPage.tsx      — milestone 1 demo page
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
npm test       # vitest (13 tests, all passing)
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

## Milestone 2 — next

Color input page, cubejs solver integration, phase slicing (4-phase L×L),
solution playback, localStorage persistence. Parity checks in validate.ts.
