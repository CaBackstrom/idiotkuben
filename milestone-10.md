# Milestone 10 — UX polish: mobile sticky actions, auto-rotate, lighting fix

**Status:** NEXT
**Goal:** Final UX polish based on mobile testing feedback. Sticky action bar on mobile, auto-rotate cube to active face, tighter solved-state layout, and fix dark cube colors on desktop Chrome.
**Non-goal:** Landing page redesign (still in `future-wishes.md`).

---

## Part A — Mobile sticky action bar

### A1. Fixed action buttons at bottom of viewport on mobile

**Problem:** On mobile `/solve` page, the "Backa" and "Klar — nästa drag" buttons are at the bottom of the instruction card. User has to scroll down after reading the instruction/looking at the cube to reach the button. This happens on every single move — tedious.

**Fix:** On mobile breakpoint (`< 768px`), detach the action buttons from the card and place them in a **fixed sticky bar** at the bottom of the viewport.

**Spec:**
- Bar spans full width, `position: fixed`, `bottom: 0`, `z-index: 50`.
- Background: `var(--bg)` with a subtle top border `1px solid rgba(26,26,26,0.06)` to separate from scrolling content.
- Padding: `1rem` vertical, `1.5rem` horizontal.
- Contains "Backa" (left) and "Klar — nästa drag" (right) in a flex row with `justify-between`.
- The card content scrolls freely behind it, but buttons are always thumb-reachable.

**Desktop:** No change. Keep buttons inside the card where they are now (works fine on desktop per user feedback).

**Implementation:**
- Conditional rendering in `GuidedPlayer.tsx` or `SolvePage.tsx` based on `useMediaQuery('(max-width: 767px)')` or Tailwind breakpoint classes.
- Buttons rendered twice (one set inside card for desktop, one set in sticky bar for mobile) OR moved dynamically via CSS `@media` + positioning. Prefer the former for clarity.

**Tests:**
- Visual check only — no unit test needed for layout.

---

## Part B — Auto-rotate cube to active face

### B1. Smooth camera rotation to face active side after each move

**Problem:** When the user rotates the cube manually to inspect it, the next move instruction might reference a side that's now facing away from the camera. User has to re-orient manually.

**Fix:** After each move completes, if the user has NOT manually interacted with OrbitControls in the last 5 seconds, auto-rotate the camera so the next active face is closest to the camera — but maintain a 3/4 perspective view (not flat frontal).

**Spec:**

**Camera target positions per face:**
- Each face has an ideal camera position that shows that face prominently while keeping a 3D angle.
- Use a spherical coordinate approach: place camera at distance `6` from cube center, at angles that put the active face ~30° off direct frontal.
- Example for front face (green): camera at `[2, 3, 5]`. For right face (red): `[5, 3, 2]`. Etc.
- Pre-calculate six camera positions (one per face) in a lookup table.

**Animation:**
- When active face changes, tween camera position from current to target over `800ms` with `easeInOut`.
- Use Three.js `Vector3.lerp` in a `useFrame` loop, or GSAP if already available.
- OrbitControls should animate its target to `[0, 0, 0]` (cube center) in sync.

**User override:**
- Track last user interaction time on OrbitControls (`controls.addEventListener('change', ...)` → update timestamp).
- Only trigger auto-rotate if `Date.now() - lastInteractionTime > 5000`.
- If user manually rotates during the auto-animation, cancel the tween immediately and respect their input.

**Visual indicator:**
- Optional: a small compass icon in the corner that pulses when auto-rotate is about to happen. Not critical, can skip if time is tight.

**Implementation:**
- New hook `src/hooks/useAutoRotate.ts` that takes `activeFace`, `controls`, and returns nothing (side effect only).
- Called from `Cube3D.tsx` with the current active face from props.
- Camera position lookup in `src/cube/cameraPositions.ts` (new file).

**Tests:**
- `useAutoRotate.test.ts`: given an active face and mock controls, asserts camera position changes over time. Mock Date.now for the 5-second guard.

---

## Part C — Tighter solved-state layout on desktop

### C1. Reduce cube card size on solved screen

**Problem:** On `/solve` when the cube is solved, the white card containing the cube is very large (takes up most of the viewport height). The celebration message and action buttons ("Lös en till", etc.) are below the fold — user has to scroll to see them.

**Fix:** Make the solved-state cube rendering smaller and the card more compact so everything fits on one screen.

**Spec:**
- Solved-state cube canvas: max height `400px` desktop (down from ~600px current), `300px` mobile.
- Card padding: `2rem` desktop (down from 3rem), `1.5rem` mobile.
- Celebration overlay text ("Grattis! Kuben är löst!") renders **on top of the cube** as an absolute-positioned overlay, not below it.
- Buttons ("Lös en till", "Välj annan nivå") stack horizontally below the card on desktop, vertically on mobile.
- Phase progress tabs (the completed checkmarked tabs) can be hidden on solved state — they're not actionable anymore. Frees up vertical space.

**Implementation:**
- `SolvePage.tsx` or `SolvedOverlay.tsx` — apply conditional classes when `isSolved === true`.
- Cube canvas size controlled via `<Canvas style={{ height: '400px' }}>` or responsive class.

**Tests:**
- Visual check only.

---

## Part D — Fix dark cube colors on desktop

### D1. Brighten cube sticker materials

**Problem:** On desktop Chrome, the cube looks too dark. All sticker colors (red, yellow, green, blue, white, orange) render darker than intended. The active face halo is visible but the cube itself is dim. Likely due to Three.js lighting or color space mismatch.

**Four fixes (apply all):**

**Fix 1 — Increase ambient light:**
- Current ambient light intensity is likely `0.6` or `0.8`. Raise it to `1.2`.
- This lifts the base brightness on all materials without washing out shadows.

**Fix 2 — Add directional light:**
- Add a `DirectionalLight` pointing at the cube from the camera's direction.
- Intensity: `0.4`.
- Position: same as camera or slightly above-right (`[4, 5, 4]`).
- This gives colors more "pop" and creates subtle shading for depth.

**Fix 3 — Boost sticker color intensity:**
- Cube sticker colors are defined as hex strings (e.g. `#C8102E` for red, `#009E60` for green).
- When applied to Three.js materials, they render ~15% darker than the hex implies due to lighting calculations.
- Solution: either define the colors 15% brighter in `src/cube/colors.ts`, OR apply `material.color.multiplyScalar(1.15)` after setting the color.
- Prefer the former (define brighter) — cleaner and works in all lighting conditions.

**Fix 4 — Set sRGB output color space:**
- Three.js defaults to Linear color space in recent versions, which makes sRGB colors (standard hex codes) appear darker.
- In `Cube3D.tsx` or wherever the WebGL renderer is created, explicitly set:
  ```typescript
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  ```
- This ensures colors render as intended on standard monitors.

**Expected result:** Cube looks vibrant and clear on all screens. The halo-highlighted active face should be noticeably brighter than inactive faces, and all colors should match the palette defined in the design system.

**Implementation:**
- `src/components/cube/Cube3D.tsx` — lighting setup and renderer config.
- `src/cube/colors.ts` — adjust hex color definitions if going the "define brighter" route.

**Tests:**
- Visual check on desktop Chrome and Safari. Compare side-by-side with mobile Safari to verify parity.
- No automated test — this is a rendering/color-space issue that's hard to unit test.

---

## Acceptance criteria

Before marking m10 done:

1. `npm run typecheck` passes.
2. `npm test` all pass, including new tests for B1.
3. `npm run build` succeeds.
4. Manual smoke test on real mobile device + desktop Chrome + desktop Safari:
   - [ ] A1: Mobile sticky action bar — buttons always visible at bottom, no scroll needed to reach "Klar — nästa drag".
   - [ ] B1: Auto-rotate — after a move completes, cube rotates to show next active face in 3/4 view over 800ms. If user manually rotates within 5s, auto-rotate pauses.
   - [ ] C1: Solved state on desktop — cube + celebration + buttons all fit on screen without scrolling.
   - [ ] D1: Cube colors bright and clear on desktop Chrome. No dim/muddy appearance. Active face halo noticeably brighter.
5. Lighthouse on /solve: performance ≥ 85, accessibility ≥ 95.
6. Test in incognito on `idiotkuben.pages.dev` after deploy — not localhost.

---

## File checklist (likely changes)

```
src/
  components/
    cube/
      Cube3D.tsx                    (B1, D1 — auto-rotate hook, lighting, color space)
    solve/
      GuidedPlayer.tsx              (A1 — sticky bar on mobile)
      SolvedOverlay.tsx             (C1 — compact layout)
  pages/
    SolvePage.tsx                   (A1, C1 — conditional rendering)
  hooks/
    useAutoRotate.ts                (B1 — new)
    useAutoRotate.test.ts           (B1 — new)
  cube/
    colors.ts                       (D1 — optionally brighten hex values)
    cameraPositions.ts              (B1 — new, six camera positions)
CLAUDE.md                           (update at end of m10)
```

---

## Handoff prompt for Claude Code

After /clear, give Claude Code:

> Read milestone-10.md and CLAUDE.md. Implement in order: D1 (lighting fix — do this first so we can verify colors before animating anything), then B1 (auto-rotate), then A1 (sticky bar mobile), then C1 (solved-state compactness). Commit after each part with format `m10: <part> — <one-line summary>`. Deploy via `npx wrangler pages deploy dist --project-name idiotkuben` after all parts done. Verify in production before marking complete — last two milestones had issues that only showed up on deployed site, not localhost.

---

End of milestone 10 plan.
