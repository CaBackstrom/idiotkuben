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

## Milestone 5 — done

- [x] TopNav component (src/components/TopNav.tsx) — sticky 56px nav on all pages
- [x] "← Tillbaka" back navigation: /level→/, /input→/level, /solve→/input
- [x] LandingPage: wordmark-only TopNav, hero sticky offset adjusted for nav height
- [x] Sticky cube on /solve — 2-column grid, cube md:sticky md:top-20
- [x] Phase completion overlay (PhaseOverlay) — fades in/out after 1.5s
- [x] Smooth animated progress bar with brief glow pulse
- [x] Move milestone indicator every 10 moves ("Drag 10 ✓")
- [x] Final celebration: CSS confetti (15 mobile / 30 desktop), elapsed time, move count
- [x] "Lös en till" and "Tillbaka till start" buttons on celebration screen
- [x] Phase stepper redesign: completed=filled+checkmark, active=accent border, future=muted
- [x] Button polish: active:scale-[0.98], hover:shadow-sm on all interactive buttons
- [x] Typography: H1 3rem/Fraunces on LevelPage+InputPage, H2 2rem/Fraunces for phase name
- [x] Loading state on "Lös min kub" button (brief submitting state before navigate)
- [x] SolvePage TopNav shows dynamic "Fas X av 4" via onPhaseChange callback
- [x] No new dependencies
- [x] 32 unit tests passing
- [x] npm run build — clean
- [x] Deployed: idiotkuben.pages.dev

## File additions in Milestone 5

```
src/components/TopNav.tsx       — sticky top navigation bar
```

## Files modified in Milestone 5

```
src/i18n/sv.ts                  — nav, phaseComplete, solve celebration strings
src/index.css                   — confetti-fall + overlay-appear keyframes
src/components/PhaseProgress.tsx — redesigned stepper (desktop boxes + mobile dots)
src/components/SolutionPlayer.tsx — sticky layout, overlays, celebration, timer
src/pages/SolvePage.tsx         — TopNav, navigate prop, onPhaseChange callback
src/pages/LevelPage.tsx         — TopNav, typography, chooseDesc to sv.ts
src/pages/InputPage.tsx         — TopNav, submitting state
src/pages/LandingPage.tsx       — TopNav (wordmark only), hero offset fix
src/components/ColorInput.tsx   — isSubmitting prop on submit button
```

## Milestone 6 — done

- [x] Language switcher (EN/SV) in TopNav — EN default, persists to localStorage
- [x] All UI strings via t() — zero hardcoded strings in components
- [x] src/i18n/index.ts — bilingual translations (EN + SV), dot-path t() function
- [x] src/context/LanguageContext.tsx — React context + useLanguage() hook
- [x] Worker accepts language param — responds in EN or SV accordingly
- [x] Mobile cross-input — vertical stack at <640px, 44px stickers, sticky palette
- [x] Cube3D — dynamic REDUCED_MOTION check, explicit Canvas dimensions + dpr for mobile
- [x] Landing page — self-solving cube (LBL solution mapped to scroll on desktop, loop on mobile)
- [x] Sound toggle in TopNav — Web Audio API, default off, 4 sound events
- [x] Onboarding previews on level cards — inline SVG mini-previews
- [x] Proactive tutor — fires after 3 back-clicks on same move, dismissible card
- [x] Page transitions — 200ms fade-in via .page-content class
- [x] Tutor empty state and friendly error messages
- [x] 32 unit tests passing
- [x] npm run build — clean
- [x] Worker redeployed: idiotkuben-tutor.carl-backstrom.workers.dev
- [x] Frontend deployed: idiotkuben.pages.dev

## File additions in Milestone 6

```
src/i18n/index.ts               — bilingual translations (EN/SV) + t() function
src/context/LanguageContext.tsx — LanguageProvider + useLanguage() hook
src/utils/sounds.ts             — Web Audio API sound effects
```

## Files modified in Milestone 6

```
src/components/TopNav.tsx       — EN/SV language toggle + sound toggle
src/components/SolutionPlayer.tsx — useLanguage, sounds, proactive tutor
src/components/TutorPanel.tsx   — useLanguage, autoQuestion prop, sounds, empty state
src/components/ColorInput.tsx   — useLanguage, mobile vertical stack layout
src/components/PhaseProgress.tsx — useLanguage
src/components/StorageBanner.tsx — useLanguage
src/components/ContinuePrompt.tsx — useLanguage
src/components/DemoPage.tsx     — useLanguage
src/pages/LandingPage.tsx       — useLanguage, self-solving cube
src/pages/LevelPage.tsx         — useLanguage, level card SVG previews
src/pages/InputPage.tsx         — useLanguage
src/pages/SolvePage.tsx         — useLanguage
src/App.tsx                     — LanguageProvider wrap, page transitions
src/index.css                   — page-fade-in + fadeInUp keyframes
cloudflare-worker/src/index.ts  — language-aware system prompt
```

## Milestone 7 — done

- [x] A1: getInstructionForMove() — color-based instructions + move codes (EN/SV)
- [x] A2: useFrontFace + ActiveFaceHighlight + OrientationBadge — active face pulsing, front/top badge
- [x] A3: PhaseTabs — quick mode shows single "Optimal solution" + Kociemba chip; guided mode shows F2L/OLL/PLL terminology
- [x] A4: BeginnerPreview SVG — R marker and arrow aligned inside grid cell
- [x] B1: MeshAura — soft radial gradient aura behind cube on landing page
- [x] B2: Hero typography — italic Fraunces + Inter bold uppercase contrast
- [x] B3: card-base utility — 24px radius, soft shadow, consistent across cards
- [x] B4: Glassmorphism CTA — landing hero button gets backdrop-filter blur
- [x] B5: Vertical rhythm — section padding increased
- [x] B6: Color picker circles — 44px circles with inner ring on selected
- [x] B7: ProgressStrip — 2px strip below TopNav on /solve, 600ms animated
- [x] C1: Button scale — active:scale-[0.97] across all interactive buttons
- [x] C2: Page transitions — pure opacity fade-in 200ms (no translateY)
- [x] C3: Phase overlay — backdrop blur(4px), spring card animation, 1.8s auto-dismiss + click-dismiss
- [x] C4: Cube hover glow — CSS box-shadow rgba(200,16,46,0.15), 200ms in / 300ms out
- [x] 56 unit tests passing
- [x] npm run build — clean

## File additions in Milestone 7

```
src/solver/instructions.ts              — getInstructionForMove() EN/SV
src/solver/__tests__/instructions.test.ts — 8 tests, all 18 moves
src/hooks/useFrontFace.ts               — computeFrontAndTop() + useFrontFace() hook
src/hooks/__tests__/useFrontFace.test.ts — 9 tests, cardinal + oblique positions
src/components/cube/ActiveFaceHighlight.tsx — pulsing outline on active face
src/components/cube/OrientationBadge.tsx    — HTML overlay showing front/top face
src/components/solve/PhaseTabs.tsx      — mode-aware phase header component
src/components/solve/PhaseTabs.test.ts  — 7 pure function tests
src/components/landing/MeshAura.tsx     — mesh gradient aura (pure CSS)
src/components/layout/ProgressStrip.tsx — 2px progress strip below TopNav
```

## Files modified in Milestone 7

```
src/solver/instructions.ts      — new
src/hooks/useFrontFace.ts       — new
src/components/Cube3D.tsx       — ActiveFaceHighlight, FaceTracker, OrientationBadge, hover glow
src/components/SolutionPlayer.tsx — getInstructionForMove, PhaseTabs, phase overlay polish
src/components/ColorInput.tsx   — 44px circle palette with inner ring
src/pages/LevelPage.tsx         — BeginnerPreview SVG alignment fix, card-base
src/pages/LandingPage.tsx       — MeshAura, B2 typography, B4 glassmorphism, card-base
src/pages/SolvePage.tsx         — ProgressStrip
src/i18n/index.ts               — A1/A3 strings (instructions, F2L/OLL/PLL, Kociemba)
src/index.css                   — card-base utility, radius-card token, overlay spring animation
```

## Milestone 9 — done

- [x] A1: White halo replaces dim-overlay active face highlight — white additive-blended plane per face, pulses 0.4–0.85 opacity and 1.15–1.22x scale over 1.4s with soft radial gradient texture
- [x] A2: Removed all dim-overlay and per-sticker emissive code (was entirely in ActiveFaceHighlight.tsx)
- [x] B1: Inline howToUse + keyboardHint instruction text added below the holding hint
- [x] B2: Keyboard shortcuts 1–6 switch brush color; useColorShortcuts hook; brief scale flash confirms
- [x] B3: Double-click on any cell fills the entire face with current brush color (center locked)
- [x] B4: Live count validation — Solve button disabled + inline error message when any color count != 9
- [x] B5: Cell borders tightened — rgba values for empty/filled/center, more contrast against background
- [x] 77 unit tests passing
- [x] npm run build — clean

## File additions in Milestone 9

```
src/components/cube/__tests__/ActiveFaceHighlight.test.ts — face config position/rotation tests
src/hooks/useColorShortcuts.ts          — buildColorShortcutHandler + useColorShortcuts hook
src/hooks/__tests__/useColorShortcuts.test.ts — 4 pure handler tests
```

## Files modified in Milestone 9

```
src/components/cube/ActiveFaceHighlight.tsx — full rewrite: halo only, no dim overlays
src/components/ColorInput.tsx               — B1 text, B2 hook, B3 dblclick, B4 validation, B5 borders
src/i18n/index.ts                           — howToUse, keyboardHint, validationExact/TooMany/TooFew, colorNames
```
