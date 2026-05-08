# Milestone 8 — Bug fixes + Polish iteration

**Status:** NEXT
**Goal:** Fix m7 deployment bugs and iterate on a few polish items based on user feedback. Defer landing page redesign and large feature work to milestone 9.
**Non-goal:** New features, landing page redesign, backward animation playback, scrub-in-progress-bar (all parked in `future-wishes.md`).

---

## Part A — Bug fixes (must do)

### A1. Set up page — mobile layout broken

**Problem:** On mobile (375px), the heading "Set up your cube" wraps in an ugly way (only "cube" visible at top). The cube net (U / L / F / R / B faces) renders as separate stacks instead of a connected unfolded net. Numbers under color circles (`U:9 R:9 F:9 D:9 L:9 B:9`) are no longer aligned to their circles after the m7 circle migration.

**Fix:**
- Heading: ensure `Set up your cube` doesn't wrap to two lines on 375px. Reduce font-size on mobile breakpoint or use `text-balance` / `hyphens: none` + `overflow-wrap: break-word: false`.
- Cube net: render as a proper unfolded T-shape on all viewports. On mobile it can scale down but must stay connected (U on top center, L F R B in a row, D below F). Currently it appears to be stacking faces vertically — that's wrong.
- Color circle labels: use a flex/grid layout where each `circle + label` is its own column with `align-items: center` and `text-align: center`. Don't position labels independently.

**Files likely changed:**
- `src/components/ColorInput.tsx`
- `src/pages/InputPage.tsx`

### A2. Set up page — desktop layout unbalanced

**Problem:** On desktop, all content is left-aligned, leaving the right half of the page blank.

**Fix:** Use a two-column layout on desktop:
- Left column (60%): heading, instructions, scramble/solve buttons, color picker, count chips.
- Right column (40%): the unfolded cube net, centered vertically.
- Mobile breakpoint (`< 768px`): stack vertically as it should already be — just fix A1.
- On desktop, the cube net becomes the visual anchor on the right, balancing the typography on the left.

**Implementation:**
- Tailwind: `grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-12`.
- Wrap left content in one div, cube net in another.

### A3. Advanced mode — Kociemba info chip on every phase

**Problem:** Advanced mode shows the chip `Two-phase algorithm (Kociemba)` even on phase 2, 3, 4. We decided in m7 advanced is a single phase, but the chip is duplicated because of the per-phase rendering loop.

**Fix:** Render the Kociemba chip **only once**, at the top of the solution card. It belongs to the whole solution, not to a phase.

**Also fix:** the `Phase 1 of 4` / `Phase 2 of 4` indicator in the TopNav still shows for advanced mode. It should not. Advanced mode has a single phase — the indicator should either show `Optimal solution` as static text, or be hidden entirely on advanced.

**Decision:** Hide the phase indicator entirely in advanced mode. Show `Optimal solution` as a static label in the same slot instead.

**Files likely changed:**
- `src/components/TopNav.tsx`
- `src/pages/SolvePage.tsx`
- `src/components/PhaseProgress.tsx`

### A4. Advanced mode — Play button broken on mobile

**Problem:** "Play phase" button doesn't trigger on mobile (touch).

**Fix:** Likely a `pointer-events`, `touch-action`, or event handler issue. Check:
- Is the button inside a container with `pointer-events: none`?
- Is there an invisible overlay (mesh aura? glassmorphism layer?) intercepting the touch on mobile?
- Is the handler bound to `onClick` only, or does it need `onTouchEnd` for some reason? (`onClick` should work on mobile — if it doesn't, something is intercepting.)

**Diagnostic step:** Open Chrome devtools on mobile device, tap the button, check if the click handler logs anything. If not → something above is eating the event. If yes → state isn't updating.

**Files likely involved:**
- `src/components/cube/Cube3D.tsx` (mesh aura overlay?)
- `src/pages/SolvePage.tsx`

### A5. Advanced mode — phase info hidden on mobile

**Problem:** On mobile in advanced mode, the user can't see what phase they're on (related to A3 — but also a layout issue, info card may be off-screen or collapsed).

**Fix:** After A3 is done (single phase, no fake "Phase X of 4"), ensure the `Optimal solution` card with move count and Kociemba chip is visible above the cube on mobile. Stack order on mobile: heading → info card → cube → buttons.

### A6. Solve page — initial cube framing

**Problem:** When the solve page loads, the cube isn't centered in its viewport. User has to manually adjust to see the whole cube.

**Fix:** Set the camera position and target so the cube is centered and fully visible by default. The `<OrbitControls>` should reset to this position on page load (and on a future "reset view" button if we add one).

**Camera spec:**
- Position: `[4, 4, 4]` (slightly above and to the side, classic isometric-ish angle).
- Target: `[0, 0, 0]` (cube center).
- FOV: 45.
- Verify on viewport widths 375, 768, 1280, 1920.

**Files likely changed:**
- `src/components/cube/Cube3D.tsx` or wherever the canvas + camera is set up.

---

## Part B — Polish iteration

### B1. Active face highlight — invert the metaphor

**Problem:** Current red outline on the active face works but feels heavy. User wants the inverse: dim inactive faces, keep active face at full intensity, with subtle pulse.

**Fix (option B from chat):**

Remove the red outline. Instead:
- **Inactive faces:** fade to `opacity: 0.45` and slight desaturation (`filter: saturate(0.7)`). Implemented as a per-sticker material override or a transparent dark overlay mesh.
- **Active face:** stays at full opacity and saturation. Gets a subtle warm glow (not red outline). Glow color matches the **center sticker color** of that face (so blue face glows blue, white face glows white, etc.). This ties into B2 below.
- **Pulse:** the active face pulses by varying its emissive intensity from `0.0` to `0.15` over `1.6s`, ease-in-out. Subtle — should feel like a soft heartbeat, not a strobe.
- **Transition:** when active face changes (next move on a different face), the dim/lit transition takes `400ms` ease-out. No sudden swaps.

**Implementation:**
- Replace `ActiveFaceHighlight.tsx` content. Keep filename.
- New helper `getFaceCenterColor(face: Face): string` in `src/cube/colors.ts`.
- Use Three.js material `emissive` + `emissiveIntensity` on active face stickers, animated via `useFrame`.
- For dimming inactive: either material `opacity` with `transparent: true`, or overlay a translucent black mesh on inactive faces.

**Tests:**
- `ActiveFaceHighlight.test.tsx`: given an active face prop, asserts inactive faces have dim styling applied. Snapshot or DOM-attribute check.

### B2. Soft celebration on cube solved — Rubik color theme

**Problem:** Current celebration feels hacky. User wants "softer transition to the solved state" + "confetti with Rubik theme".

**Fix:**

**Sub-fix 1 — Solved state transition:**
When the final move plays and the cube reaches solved state:
- All six face glows fade in simultaneously over `1.2s` ease-out.
- Each face glows in **its own center color** (white face glows white, red face glows red, etc.) — using the same emissive technique as B1, but on all faces, at higher intensity (`emissiveIntensity: 0.25`).
- Like "the cube lighting up from within after being solved".
- The glow stays on for `2s`, then fades over `800ms` ease-in.
- During the glow, the cube does one slow 360° rotation on the Y-axis over `4s` (auto-orbit).

**Sub-fix 2 — Rubik-themed confetti:**
- Replace generic confetti colors with the six Rubik face colors: `#FFFFFF, #C8102E, #009E60, #FFD500, #FF5800, #0051BA`.
- Confetti pieces are **squares**, not circles or strips (sticker shape).
- Sizes: 8px, 12px, 16px (mixed for depth).
- Each piece has a slow Y-axis rotation as it falls (mimics tumbling stickers).
- Fewer pieces than before — `~40` total instead of whatever the default is. Calmer.
- Timing: starts at `0.4s` after solved state begins (lets the glow establish first), runs for `3s`.
- Easing: not pure gravity. Use a slight horizontal drift sine wave for more grace.

**Sub-fix 3 — Sound:**
- Replace any abrupt celebration sound with a soft chord (existing `useSound` system in `src/utils/sounds.ts`).
- Suggested sound: low-mid major chord, `~600ms` duration, gentle attack and decay.
- Skip if the sound system doesn't easily support this; not worth blocking on.

**Files likely changed:**
- `src/components/cube/SolvedCelebration.tsx` (or wherever confetti lives)
- `src/components/cube/Cube3D.tsx` (auto-orbit + face glow on solved)
- `src/utils/sounds.ts` (new chord sound, if easy)

### B3. Keyboard navigation

**Problem:** No keyboard support for stepping through moves.

**Fix:** Add keyboard handlers on `/solve` page:
- `→` (Right Arrow): next move (same as "Done — next move" button).
- `←` (Left Arrow): previous move (same as "Back" button).
- `Space`: toggle play/pause of phase auto-play.
- `Home`: jump to first move of current phase.
- `End`: jump to last move of current phase.

**Implementation:**
- New hook `src/hooks/useKeyboardNav.ts` that takes `onNext`, `onPrev`, `onTogglePlay`, etc. as callbacks.
- Bind on `SolvePage` mount, unbind on unmount.
- Don't bind if focus is in a text input (so the tutor question field still works normally). Check `event.target.tagName === 'INPUT' || 'TEXTAREA'`.
- Show a small `?` keyboard-shortcuts hint in TopNav on desktop only (skip on mobile).

**Tests:**
- `useKeyboardNav.test.ts`: simulate keydown events, assert correct callbacks fire.
- Verify no fire when typing in tutor input.

---

## Acceptance criteria

Before marking m8 done:

1. `npm run typecheck` passes.
2. `npm test` all pass, including new tests for B1 and B3.
3. `npm run build` succeeds.
4. Manual smoke test on **real mobile device** + desktop:
   - [ ] A1: Set up page heading doesn't wrap on mobile. Cube net is connected T-shape. Color labels aligned.
   - [ ] A2: Set up page on desktop has balanced two-column layout.
   - [ ] A3: Advanced mode shows Kociemba chip once. TopNav shows "Optimal solution" in advanced, hides phase counter.
   - [ ] A4: Play phase button works on mobile.
   - [ ] A5: Advanced mode info visible on mobile.
   - [ ] A6: Cube centered and fully visible on solve page load, all viewports.
   - [ ] B1: Active face is bright, inactive faces are dimmed, active face glows in its center color, pulse is subtle.
   - [ ] B2: Solved cube glows in all 6 colors, slow 360° rotation, calm confetti in Rubik colors as squares.
   - [ ] B3: Arrow keys step moves on desktop. Spacebar toggles auto-play. No interference with tutor input.
5. Lighthouse on /solve: performance ≥ 85, accessibility ≥ 95.
6. Deploy preview tested on actual phone (not just devtools mobile mode).

---

## File checklist (likely changes)

```
src/
  components/
    ColorInput.tsx                  (A1 — net layout, label alignment)
    TopNav.tsx                      (A3 — phase indicator branch)
    PhaseProgress.tsx               (A3 — hide on advanced)
    cube/
      Cube3D.tsx                    (A4, A6, B1, B2 — camera, events, glow)
      ActiveFaceHighlight.tsx       (B1 — full rewrite)
      SolvedCelebration.tsx         (B2 — confetti + glow)
  cube/
    colors.ts                       (B1, B2 — getFaceCenterColor helper)
  pages/
    InputPage.tsx                   (A1, A2 — two-column layout)
    SolvePage.tsx                   (A3, A5, B3 — keyboard nav, mobile order)
  hooks/
    useKeyboardNav.ts               (B3 — new)
    useKeyboardNav.test.ts          (B3 — new)
  utils/
    sounds.ts                       (B2 — soft chord, optional)
CLAUDE.md                           (update at end of m8)
future-wishes.md                    (already exists — ensure backward animation + scrub are documented there)
```

---

## Handoff prompt for Claude Code

After /clear, give Claude Code:

> Read milestone-8.md and CLAUDE.md. Implement Part A bug fixes first (A1 → A6, in order), running `npm test` after each. Then Part B polish (B1 → B3). Commit after each sub-task with format `m8: <subtask> — <one-line summary>`. Stop and ask before adding any dependency. After A4, manually verify on actual mobile device by deploying a preview — touch event bugs don't always reproduce in devtools.

---

End of milestone 8 plan.
