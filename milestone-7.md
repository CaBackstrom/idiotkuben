# Milestone 7 — Bug fixes + Visual upgrade

**Status:** NEXT
**Goal:** Final polish pass before course presentation. Three bug fixes from user feedback + visual upgrade toward "Apple-känsla + spel-känsla, behåll minimalism".
**Non-goal:** New features. Anything not on this list is out of scope.

---

## Part A — Bug fixes (must do first)

### A1. Beginner instructions: color-based + move codes

**Problem:** Instructions like "Vrid bakre raden" assume a fixed cube orientation. Users can rotate the cube freely with OrbitControls, breaking the instruction.

**Fix:** Replace direction-relative instructions with **color-based primary text + move code in parentheses**.

**Format:**
- SV: `Vrid den blåa sidan medsols (B)`
- SV: `Vrid den vita sidan motsols (U')`
- SV: `Vrid den gröna sidan två varv (F2)`
- EN: `Turn the blue side clockwise (B)`
- EN: `Turn the white side counter-clockwise (U')`
- EN: `Turn the green side twice (F2)`

**Implementation:**
- Move code shown in `font-mono`, color `var(--text-muted)`, smaller than primary text.
- Mapping: `U=white, D=yellow, F=green, B=blue, L=orange, R=red` (standard western color scheme — verify against current cube state initialization in `src/cube/state.ts`).
- Add `getInstructionForMove(move: Move, lang: 'sv' | 'en'): { primary: string; code: string }` in `src/solver/instructions.ts` (new file).
- All strings go in `src/i18n/sv.ts` and `src/i18n/en.ts` using unicode escapes per project rules. No Swedish chars inline.

**Tests:**
- Unit test `instructions.test.ts`: every move (U, U', U2, D, D', D2, F, F', F2, B, B', B2, L, L', L2, R, R', R2) returns expected color name + code in both languages.

### A2. Active face indicator on cube

**Problem:** With free rotation, user doesn't always know which physical face the instruction refers to.

**Fix:** Two visual aids on the 3D cube during beginner mode:

**1. Front-orientation badge (small, top-right of cube viewport):**
```
Front: green   Top: white
```
Updates as user rotates camera. Computes which face normal is closest to camera-forward and camera-up vectors.

**2. Active-side highlight:**
- The side that should be turned next gets a **subtle pulsing outline glow** in `var(--accent)` (the red `#C8102E`).
- Animation: opacity 0.4 → 0.8 → 0.4 over 1.6s, ease-in-out, infinite.
- Implementation: a thin emissive overlay mesh on the 9 stickers of the active face, or a wireframe outline using `<Edges />` from drei with custom material.
- Stops pulsing during the animated turn itself.

**Not blinking** — pulsing is calmer and matches the editorial-modern aesthetic.

**Implementation:**
- New component `src/components/cube/ActiveFaceHighlight.tsx`.
- New hook `src/hooks/useFrontFace.ts` that returns `{ front: Face, top: Face }` based on camera orientation. Recomputes on camera change (throttle to 60ms).
- Badge component `src/components/cube/OrientationBadge.tsx` rendered as HTML overlay (not in 3D scene) using `<Html />` from drei or absolutely positioned div outside the canvas.

**Tests:**
- `useFrontFace.test.ts`: given camera position vectors, asserts correct front/top face. At least 6 cardinal positions + 2 oblique.

### A3. Advanced mode: replace LBL phase headings

**Problem:** Advanced mode shows LBL phase headings ("White cross", "White corners", "Middle layer", "Yellow side") but Kociemba doesn't think in layers. Headings don't match what the algorithm does.

**Fix:** Use neutral, mode-appropriate headings in advanced mode.

**New headings (advanced mode only):**
- Show the algorithm as a **single phase** with title `Optimal solution` / `Optimal lösning`.
- Subtitle shows move count: `18 moves` / `18 drag`.
- No fake sub-phases. Kociemba's two internal phases (G1 reduction + solve) are not pedagogically meaningful and we shouldn't surface them.

**However**, since the user asked to surface "the actual solving methodology", add a small **info chip** under the title:
- SV: `Tvåfasig algoritm (Kociemba)`
- EN: `Two-phase algorithm (Kociemba)`

This is honest: we tell the user *what* method is used without pretending it has pedagogical phases.

**For beginner mode**, keep the four LBL phase headings but use the **proper LBL terminology** so users learn the real vocabulary:

| Current heading | New heading SV | New heading EN |
|---|---|---|
| Vita korset | Vita korset | White cross |
| Vita hörn | Första lagret (F2L-hörn) | First layer (corners) |
| Mellanlager | Andra lagret (F2L-kanter) | Second layer (edges) |
| Gula sidan | Sista lagret (OLL + PLL) | Last layer (OLL + PLL) |

The terms F2L, OLL, PLL are standard speedcubing notation. Including them in parentheses teaches real vocabulary without making beginners memorize them.

**Implementation:**
- `src/solver/lbl.ts` already returns phases — update phase metadata to include both display name and acronym.
- `src/components/solve/PhaseTabs.tsx` (or wherever phase tabs render) — branch on `mode === 'advanced'` to render a single neutral phase header.
- Update i18n keys: `phase.cross`, `phase.f2l_corners`, `phase.f2l_edges`, `phase.last_layer`, `phase.optimal`.

**Tests:**
- `PhaseTabs.test.tsx`: renders 4 tabs in beginner mode, 1 tab in advanced mode.
- Snapshot test for both modes.

### A4. Beginner card mini-preview alignment

**Problem:** On the level-select page, the Beginner card preview shows a 3×3 grid with a red "R" letter and an arrow that are misaligned with the grid cells.

**Fix:** Reposition the R-marker overlay so it sits **inside** the target cell, anchored to the cell's grid position rather than absolutely positioned to the card.

**Implementation:**
- Find component (likely `src/components/level/BeginnerPreview.tsx` or similar).
- Restructure so the marker is a child of the target `<div>` cell with `position: relative` on the cell and `position: absolute` on the marker, OR use CSS Grid placement with the same grid as the squares.
- Verify on desktop and mobile breakpoints.

**Tests:**
- Visual check only — no unit test needed for layout.

---

## Part B — Visual upgrade

### B1. Mesh gradient aura behind cube (landing page only)

Soft radial gradient blob behind the hero cube. Subtle. Uses palette tokens, not "AI purple".

**Spec:**
- Two radial gradients overlapping, blurred 80px, opacity 0.35.
- Colors: `var(--accent)` (red) at 30% offset top-left, `#FFC72C` (warm yellow, sampled from cube) at 70% offset bottom-right.
- Background still `var(--bg)` (#FAFAF7).
- Z-index below cube canvas, above page background.
- **Only on landing**, not in app flow.

**Implementation:**
- New component `src/components/landing/MeshAura.tsx`.
- Pure CSS using `radial-gradient` + `filter: blur(80px)`, no JS.

### B2. Hero typography — serif/sans contrast

Current hero uses Fraunces throughout. Add contrast within the heading.

**Spec:**
- First line: Fraunces, italic, weight 400, e.g. `Lös din kub`.
- Second line: Inter, weight 600, all-caps tracking-wide, e.g. `STEG FÖR STEG`.
- Or invert depending on what reads better on the actual hero copy.

**Decision rule:** italic-serif on the *promise* word, bold-sans on the *method* word.

**Implementation:**
- Update `src/components/landing/Hero.tsx`.
- Tailwind: `font-serif italic font-normal` vs `font-sans font-semibold tracking-wider uppercase`.

### B3. Card-based layout system

Apply consistent card styling across the app.

**Spec:**
- Border radius: `24px` (new token `--radius-card: 24px` in `src/index.css`).
- Background: `#FFFFFF` (slightly whiter than page bg for separation).
- Shadow: `0 1px 2px rgba(26,26,26,0.04), 0 8px 24px rgba(26,26,26,0.06)`. Soft and diffuse.
- Padding: `2rem` desktop, `1.5rem` mobile.
- Border: `1px solid rgba(26,26,26,0.06)` for subtle definition on white-on-white.

**Apply to:**
- Level-select cards (already cards — update styling)
- Phase info card on /solve
- Color input panel on /input
- Tutor message bubbles

**Tailwind utility:** add `@layer components { .card-base { @apply ... } }` in `src/index.css`.

### B4. Glassmorphism — landing CTA only

The "Lös min kub" / "Solve my cube" button on the landing hero gets a frosted-glass treatment.

**Spec:**
- `backdrop-filter: blur(12px) saturate(150%)`.
- Background: `rgba(255,255,255,0.6)`.
- Border: `1px solid rgba(255,255,255,0.4)`.
- Sits over the mesh aura — that's where the effect actually shows.
- All other buttons in app flow stay solid (no glass).

### B5. Vertical rhythm

Increase breathing space.

**Spec:**
- Section vertical padding: `5rem` desktop, `3rem` mobile (was likely 3rem / 2rem).
- Hero min-height: `min(720px, 90vh)`.
- Gap between hero and next section: `8rem` desktop, `4rem` mobile.

### B6. Color picker — circles with inner ring

Current color picker uses square swatches. Move to circles.

**Spec:**
- Diameter: `44px`.
- Selected state: outer ring `2px solid var(--text)`, inner ring `2px solid white` (creates the "inset" feel), then color fill.
- Unselected: just the color circle, `1px solid rgba(0,0,0,0.1)`.
- Hover: scale 1.05, transition 150ms.
- White swatch needs the dark border to be visible — already implied by the rule above.

**Implementation:**
- Update `src/components/input/ColorPicker.tsx`.

### B7. Progress as thin strip under TopNav

Current progress bar may be inside the phase card. Move it up.

**Spec:**
- 2px tall strip directly below TopNav, full width.
- Background: `rgba(26,26,26,0.06)`.
- Filled portion: `var(--accent)`, animates width on phase change with 600ms ease-out.
- Visible on /solve only.

**Implementation:**
- New component `src/components/layout/ProgressStrip.tsx`.
- Lives in the TopNav layout, conditionally rendered based on route.

---

## Part C — Micro-interactions

### C1. Button press scale

All primary and secondary buttons:
- `:active` → `transform: scale(0.97)`, transition 80ms.
- Tailwind: `active:scale-[0.97] transition-transform duration-75`.

### C2. Page transitions

Refine existing transitions if needed.
- Fade duration: 200ms in, 150ms out.
- No translate (keep it minimal).
- Verify there's no flash of unstyled content on route change.

### C3. Phase completion overlay polish

The overlay shown when a phase completes:
- Fade-in: 300ms ease-out.
- Backdrop: `rgba(26,26,26,0.4)` with `backdrop-filter: blur(4px)`.
- Card: scales from 0.96 to 1.0 over 250ms with spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
- Auto-dismiss after 1.8s OR on click anywhere.

### C4. Cube hover glow

When cursor is over the 3D cube canvas:
- Subtle outer glow on the cube using a post-processing bloom pass, OR a CSS box-shadow on the canvas wrapper.
- Color: `var(--accent)` at 0.15 opacity, blur 40px.
- Fade-in 200ms on enter, fade-out 300ms on leave.
- **Skip if performance regresses.** Profile on mobile first.

---

## Acceptance criteria

Before marking milestone 7 done:

1. `npm run typecheck` passes (TypeScript strict).
2. `npm test` all pass, including new tests for A1, A2, A3.
3. `npm run build` succeeds.
4. Manual smoke test:
   - [ ] Beginner mode: instructions show color name + move code, in SV and EN.
   - [ ] Beginner mode: rotating cube updates the front/top badge.
   - [ ] Beginner mode: active face pulses with red outline.
   - [ ] Advanced mode: shows single "Optimal solution" heading with Kociemba info chip.
   - [ ] Beginner mode: shows F2L / OLL / PLL terminology in phase tabs.
   - [ ] Level-select beginner card: R marker is aligned to grid cell.
   - [ ] Landing: mesh aura visible behind cube, no AI-purple.
   - [ ] Landing CTA: glassmorphism visible.
   - [ ] All cards: 24px radius, soft shadow, consistent.
   - [ ] Color picker: circles with inner ring on selected.
   - [ ] /solve: thin progress strip under TopNav animates on phase change.
   - [ ] Buttons: subtle scale on press.
   - [ ] Mobile: all of the above works at 375px width.
5. Lighthouse on /solve: performance ≥ 85, accessibility ≥ 95.
6. Deploy preview reviewed on actual mobile device, not just devtools.

---

## Out of scope (explicit)

- Magnetic button hover effects
- Stockfoto editorial photography
- Stats / shareability features
- Camera-based cube input
- Third help level
- Dark mode
- Any new dependency (per project rules)

If any of these come up during work, stop and confirm with user before adding.

---

## File checklist (likely changes)

```
src/
  i18n/
    sv.ts                       (A1, A3 — new strings)
    en.ts                       (A1, A3 — new strings)
  solver/
    instructions.ts             (A1 — new)
    instructions.test.ts        (A1 — new)
    lbl.ts                      (A3 — phase metadata)
  hooks/
    useFrontFace.ts             (A2 — new)
    useFrontFace.test.ts        (A2 — new)
  components/
    cube/
      ActiveFaceHighlight.tsx   (A2 — new)
      OrientationBadge.tsx      (A2 — new)
      Cube3D.tsx                (A2 — integrate highlight + badge)
    level/
      BeginnerPreview.tsx       (A4 — fix alignment)
    solve/
      PhaseTabs.tsx             (A3 — branch on mode)
      PhaseTabs.test.tsx        (A3 — new test)
    landing/
      Hero.tsx                  (B2 — typography)
      MeshAura.tsx              (B1 — new)
    layout/
      ProgressStrip.tsx         (B7 — new)
      TopNav.tsx                (B7 — integrate strip)
    input/
      ColorPicker.tsx           (B6 — circles)
  index.css                     (B3 — radius token, card-base utility)
CLAUDE.md                       (update at end of milestone)
```

---

## Handoff prompt for Claude Code

After /clear, give Claude Code:

> Read milestone-7.md and CLAUDE.md. Implement Part A bug fixes first (A1 → A2 → A3 → A4), running tests after each. Then Part B visual upgrade (B1 → B7). Then Part C micro-interactions. Commit after each sub-task with message format `m7: <subtask> — <one-line summary>`. Stop and ask before adding any dependency. Don't read more than 3 files before starting to write — write skeletons first, fill in afterwards (token output limit gotcha from milestone notes).

---

End of milestone 7 plan.
