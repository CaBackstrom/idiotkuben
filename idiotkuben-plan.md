# Idiotkuben — Project Plan

A web app that teaches users how to solve a Rubik's cube using the layer-by-layer method. Built as a course project for an AI course. Swedish-language UI, English code and comments. Client-side only, deployed on Cloudflare Pages with one thin Cloudflare Worker for the AI tutor.

This document is the source of truth. Read it in full before writing any code. Read `milestone-1.md` for the current milestone's specifics. Read `skills/README.md` for which skills to apply.

---

## Identity and tone

**Name:** Idiotkuben.

**Tonality (Swedish UI text):** Self-deprecating name, professional execution. Direct, short, slightly dry. "This is move 7 of 24. You've done six. Good. Next." Not "Wow, amazing job! 🎉". No emojis in UI copy. No empty pep phrases. The contrast between the silly name and the polished delivery is the brand.

**Design language:** Editorial-modern. Off-white background (#FAFAF7), near-black text (#1A1A1A), one strong accent color (cube-red #C8102E or cube-yellow #FFCC00 — final choice locked in Milestone 3). Display serif (Fraunces or Instrument Serif from Google Fonts), body sans (Inter or Geist), monospace for algorithm notation (JetBrains Mono). No gradients. No "AI purple". Generous whitespace. Asymmetric layouts allowed on the landing page.

---

## Tech stack

**Frontend:**
- Vite + React 18 + TypeScript (strict mode)
- Tailwind CSS
- three.js + @react-three/fiber + @react-three/drei (3D rendering)
- gsap (scroll-driven animation on landing page)
- framer-motion (UI transitions, page transitions — Milestone 3+)
- cubejs (Kociemba solver as black box)
- vitest (unit tests, ships with Vite)

**Backend (minimal):**
- One Cloudflare Worker proxying requests to Cloudflare Workers AI (Llama 3.1 8B Instruct, free tier)
- No database, no auth, no server state

**Deploy:**
- Cloudflare Pages for frontend
- Wrangler CLI for the Worker
- Same workflow used for the user's other project Planvra

**Persistence:**
- `localStorage` only. No IP-based identification. No tracking cookies.
- A minimal info banner ("We save your progress locally in your browser. Nothing is sent to us.") with an OK button. No accept/reject flow. This is informational, not consent-based.

**No other dependencies without explicit user approval.**

---

## Architectural decisions — locked

**Solver:** `cubejs` npm package (Kociemba algorithm) used as a black box. We do NOT write our own solver. We write a "pedagogical translator" that takes the solver's optimal output and slices it into four layer-by-layer phases for display. The user perceives a layer-by-layer solution; the solver doesn't actually care.

**Cube state model:** 54-element structure, face order URFDLB (Singmaster), explicit sticker indexing per face (see "State model" below).

**Move queue policy:** FIFO queue. Buttons remain clickable during animation; clicks queue silently. Animation duration: 250ms per move. With `prefers-reduced-motion: reduce`, animations are skipped — state snaps directly to final position.

**Rotation snapping:** After each completed move, cubie rotations are snapped to the nearest 90° multiple and positions to integer coordinates. Protects against floating-point drift.

**Help levels:** Two in MVP — "Guided" and "Quick". A third level may be added post-MVP if time allows. Do not build it now.

**Color input:** Manual entry on a 2D unfolded cross layout. No camera input. Validated on submit.

**AI tutor:** Cloudflare Workers AI / Llama 3.1 8B Instruct via our own Worker. Three features:
1. "Explain simpler" — reformulates current step explanation
2. "Why this move?" — pedagogical reasoning
3. Free-text question field with current-step context

Plus stretch goal: frustration detector (after 3 "Back" or "Explain simpler" clicks on same phase, proactively offer alternative explanation).

One-shot requests, no conversation memory. Token budget: 200 per request. Llama 3.1 8B is OK at Swedish but can drift to English — the system prompt locks it firmly to Swedish.

**Validation:** `isValidCubeState(state)` checks 9 of each color, 6 unique centers, corner parity, edge parity. Run after every color input before solver is invoked. Errors are specific, not generic.

**Persistence (localStorage schema):**
```typescript
type SavedSession = {
  version: 1;
  level: 'guided' | 'quick';
  cubeState: CubeState;
  solution: Move[];
  currentStepIndex: number;
  phase: 1 | 2 | 3 | 4;
  startedAt: string;  // ISO timestamp
  frustrationCount: { phase1: number; phase2: number; phase3: number; phase4: number };
};
```
Key: `idiotkuben:session`. On app load, check for saved session. If present, show "Continue where you left off?" prompt with "Start fresh" alternative.

---

## State model (LOCKED)

```typescript
type StickerColor = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
type Face = StickerColor[];   // exactly 9 elements
type CubeState = {
  U: Face; R: Face; F: Face; D: Face; L: Face; B: Face;
};
```

**Color mapping:**
- U = white, D = yellow
- F = green, B = blue
- R = red, L = orange

**Sticker indexing per face — CRITICAL:**

Each face has 9 stickers indexed 0-8:
```
0 1 2
3 4 5
6 7 8
```

Index 4 is always the center.

**Face orientation (viewed from outside the cube):**
- **U:** viewed from above, F-edge at the bottom (row 6-7-8 borders F)
- **D:** viewed from below, F-edge at the top (row 0-1-2 borders F)
- **F:** viewed from the front, U-edge at the top (row 0-1-2 borders U)
- **B:** viewed from the back, U-edge at the top (row 0-1-2 borders U)
- **R:** viewed from the right, U-edge at the top, F-edge on the left (column 0-3-6 borders F)
- **L:** viewed from the left, U-edge at the top, F-edge on the right (column 2-5-8 borders F)

Document this with ASCII diagrams in `cube/CubeState.ts` as a docstring. This is the single most common source of bugs in homemade Rubik's implementations.

---

## Milestones

Four milestones. Each has its own detailed file (`milestone-1.md`, `milestone-2.md`, etc.). Milestone files are written one at a time — when milestone N is approved, milestone N+1 is written.

**Milestone 1 — Foundation**
Cube state, all 18 moves, 3D rendering synced to state, demo page for verification. See `milestone-1.md`.

**Milestone 2 — End-to-end solving (skeleton)**
Color input, solver integration, phase slicing, basic solution playback, localStorage persistence. No design polish.

**Milestone 3 — Design and Guided mode**
Landing page with scroll-driven 3D cube. Level selector. Designed input page. Designed solve view. Guided mode (move-by-move with arrows and explanations). Design tokens defined and used everywhere.

**Milestone 4 — AI tutor, polish, deploy**
Cloudflare Worker with Workers AI. Three tutor features + stretch goal frustration detector. Mobile polish. Cookie info banner. Telemetry. Live deploy.

---

## Hard rules — apply throughout the project

1. Read all relevant files before writing code. Understand the structure.
2. No new dependencies without asking the user first.
3. No Swedish characters (å/ä/ö) inline in JSX/TSX. Put any Swedish UI text in a separate constants file (e.g. `src/i18n/sv.ts`).
4. TypeScript strict mode always on.
5. Use UTF-8 without BOM on Windows. Never use PowerShell `-replace` regex on .tsx files.
6. Cube logic is pure — no side effects, no DOM access, no timers in `cube/*.ts`.
7. Each milestone has unit tests for what was added. No exceptions.
8. No code is committed that doesn't build locally without warnings.
9. CLAUDE.md is updated at the end of each milestone with what was done and what's next.
10. If you discover a locked architectural decision needs to be reconsidered — stop, ask the user. Do not change unilaterally.
11. All code, comments, identifiers in English. Only UI-facing strings are Swedish (and live in `src/i18n/sv.ts`).
12. Read `skills/README.md` and apply the listed skills throughout the project. They are not optional.

---

## What you do now

1. Read this file in full.
2. Read `skills/README.md` and the linked skill files.
3. Read `milestone-1.md`.
4. Execute milestone 1. Ask before installing any dependency not listed.
5. When milestone 1's Definition of Done is fully green, tell the user. Do not start milestone 2 unprompted.
