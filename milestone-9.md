# Milestone 9 — Active face redesign + Set up UX

**Status:** NEXT
**Goal:** Replace the failed dim-overlay active-face highlight with a positive halo glow. Improve the Set up page input flow with clearer instructions, keyboard shortcuts, double-click-to-fill, and live validation.
**Non-goal:** Landing page redesign, backward animation, scrub-in-progress-bar (still parked in `future-wishes.md`).

---

## Part A — Active face highlight (full rewrite)

### A1. Replace inactive-face dimming with active-face halo

**Problem:** The current implementation dims inactive faces with a black overlay. This is negative marking — five faces get worse so one looks "normal". The active face doesn't actually stand out, it just fails to be dimmed. Plus the color-matched glow on the active face disappears when the face's center color is similar to the glow color (red face, red glow).

**Fix:** Remove all overlay-dimming. Keep all six faces at full color and saturation. Add a **white halo** around the active face that pulses.

**Halo spec:**
- Halo is rendered as a billboard or 3D plane positioned just outside the active face, slightly larger than the face itself.
- Color: pure white (`#FFFFFF`), with additive blending so it lights up against the cube without occluding it.
- Initial size: 1.15× the face dimensions (extends slightly past the face edges).
- Opacity: pulses from `0.4` to `0.85` over `1.4s`, ease-in-out, infinite loop.
- Size also pulses: `1.15×` to `1.22×` synced with opacity, so the halo "breathes".
- Soft edge falloff: use a radial gradient or a soft-edged shader so the halo fades out at its edges, not a hard rectangle. Looks like a glowing aura, not a sticker.
- When the active face changes (next move on a different face), the halo fades out on the old face (`200ms`) while fading in on the new face (`200ms`). No abrupt cut.

**Why white:** works against any cube face color. White on red, white on yellow, white on white — always reads as "this is the lit one". No conflict with face colors.

**Why halo, not outline:** outlines hug the geometry and look like UI chrome. A halo extends past the edges and reads as light/glow, which is the visual metaphor we want — "this face is lit up".

**Implementation:**
- Replace contents of `src/components/cube/ActiveFaceHighlight.tsx`. Keep filename.
- Use a `<mesh>` with a `<planeGeometry>` per face, positioned at the face's outward-facing surface plus a small offset (`0.51` units from cube center for a 1-unit cube).
- Material: `MeshBasicMaterial` with `transparent: true`, `blending: AdditiveBlending`, `depthWrite: false`. Use a radial-gradient texture or a custom shader for soft edges.
- Animate opacity and scale via `useFrame` with `Math.sin(elapsedTime * 4.5)` mapped to the ranges above.
- Wire `activeFace` prop from `Cube3D.tsx` as before.

**Tests:**
- `ActiveFaceHighlight.test.tsx`: given an active face, asserts a single halo mesh is rendered at the correct position. Snapshot the mesh's position and rotation for each of the 6 faces.

### A2. Remove leftover dim-overlay code

**Problem:** The black-overlay dimming code from m8-B1 / m8-hotfix needs to be fully removed. Don't leave dead code paths.

**Fix:**
- Delete the inactive-face overlay logic.
- Delete any per-sticker emissive/material overrides added in m8 for active-face brightening (we're using halo now, not material changes).
- Delete the front/top orientation badge IF the user agrees — actually, keep it. The badge ("Front: red Top: white") still helps when the user has rotated the cube. Leave it.
- Verify cube stickers render with their plain default material in all states. No opacity changes, no emissive boosts, no saturation filters anywhere.

---

## Part B — Set up page UX improvements

### B1. Inline instruction text

**Problem:** The current instruction "Hold the cube with white on top and green facing you" tells the user how to *hold* the cube but doesn't explain how to *use the page*. New users don't know that the brush stays selected, that they need to click cells to paint, that center stickers are pre-filled, etc.

**Fix:** Add a short multi-line instruction below the existing "Hold the cube..." line. Two short sentences, no bullet list (per project tone — short, direct).

**Text (SV):**
> Välj en färg och klicka på rutorna i nätet för att fylla i din kub. Centerrutorna är redan satta — de bestämmer vilken färg varje sida ska ha.

**Text (EN):**
> Pick a color and click cells in the grid to fill in your cube. Center cells are already set — they define which color each side should have.

**Format:** Same style as the existing intro text (small, muted color, body font).

**Plus:** add a tiny hint chip line below for keyboard and double-click:

**SV:** `Tips: tryck 1–6 för färg, dubbelklicka för att fylla en hel sida.`
**EN:** `Tip: press 1–6 to switch color, double-click to fill a whole side.`

Keep this hint subtle — `text-xs`, muted color, single line. Should feel like a footnote, not a tutorial.

### B2. Keyboard color shortcuts

**Problem:** No keyboard support. Power users need to mouse to the palette every time.

**Fix:** Pressing `1`-`6` on `/input` sets the current brush color:
- `1` = white
- `2` = red
- `3` = green
- `4` = yellow
- `5` = orange
- `6` = blue

**Implementation:**
- Hook into existing `useKeyboardNav` hook OR create new `useColorShortcuts` hook in `src/hooks/`.
- Bind on `InputPage` mount, unbind on unmount.
- Don't fire when focus is in any input or textarea (use the same guard as `useKeyboardNav`).
- Visual feedback: when key is pressed, briefly scale the corresponding palette circle to 1.1× over 150ms then back. Same effect as a click.

**Tests:**
- `useColorShortcuts.test.ts`: simulate keydown 1–6, assert correct color set callback fires.
- Assert no fire when focus is in input.

### B3. Double-click to fill a whole face

**Problem:** Filling 9 cells of the same color one by one is tedious. Common case: a side that's still mostly solid (one color dominates).

**Fix:** Double-click on any cell fills **the entire face that cell belongs to** with the current brush color. The center cell stays as it was (it shouldn't be overwritten — center is locked).

**Implementation:**
- Detect double-click on a cell in `ColorInput.tsx`.
- Find which face that cell belongs to.
- For that face, set every non-center cell to the current brush color.
- If filling would push any color over 9, apply the fill anyway and let live validation handle the warning (B4).

**Don't:**
- Don't paint the center stickers (they're locked).
- Don't show a confirmation dialog. Just fill. If the user made a mistake, they can paint over it.

**Tests:**
- Test that double-click on a non-center cell fills 8 surrounding cells with brush color.
- Test that center cell is not overwritten.

### B4. Live validation with disabled Solve button

**Problem:** Today the user can input invalid color counts (e.g. 10 white stickers) and only finds out when they click Solve.

**Fix:** Validate live on every cell change. If any color appears more than 9 times across the full cube:

1. The count chip for that color (`R:10`) turns red. Use `var(--color-error)` or `#C8102E` (existing accent).
2. The `Solve my cube` button becomes disabled. Visually: opacity 0.5, cursor `not-allowed`, no hover state, no click handler fires.
3. A small validation message appears under the action buttons:
   - SV: `Varje färg ska finnas exakt 9 gånger. Du har för många: rött (10).`
   - EN: `Each color must appear exactly 9 times. You have too many: red (10).`
   - Lists all over-count colors if multiple. Same for under-count if user removes cells (won't normally happen but should still validate).

**Also:** the count chips for valid counts (exactly 9) get a subtle green checkmark or stay green text (the existing color). Already partially there.

**Don't:**
- Don't auto-remove the offending cell. User chose to place it; they should choose to fix it.
- Don't show a popup or modal. Inline validation only.

**Tests:**
- Test that count chip turns red when count > 9.
- Test that Solve button is disabled when any count != 9.
- Test that Solve button re-enables when all counts == 9.

### B5. Subtle cell border improvements

**Problem:** Empty cells are very pale gray (`#F0F0F0`-ish) on a near-white background. Hard to see exact cell boundaries when many are empty.

**Fix:**
- Empty cells: `border: 1px solid rgba(26,26,26,0.10)` (slightly more visible than now).
- Filled cells: keep current styling but add `border: 1px solid rgba(26,26,26,0.20)` — slightly darker to define the colored cell against bright fills like white and yellow.
- Center cells (locked): same border as filled, plus a subtle inner highlight to indicate "this can't be edited" — e.g. an inner `2px` ring of `rgba(255,255,255,0.6)` only visible on hover.

**Don't go overboard.** This is a small visual tightening, not a redesign.

---

## Acceptance criteria

Before marking m9 done:

1. `npm run typecheck` passes.
2. `npm test` all pass, including new tests for A, B2, B3, B4.
3. `npm run build` succeeds.
4. Manual smoke test on real mobile device + desktop:
   - [ ] A1: Active face has a clear white halo that pulses. Visible from across the room. Inactive faces are at full color, no overlay, no dimming.
   - [ ] A1: Halo transitions smoothly when active face changes between moves.
   - [ ] A2: No leftover dim or material modifications on cube stickers.
   - [ ] B1: Instruction text is clear, hint chip about keyboard + double-click is visible but subtle.
   - [ ] B2: Pressing 1–6 switches brush color. Visual flash on palette circle confirms.
   - [ ] B3: Double-click on a cell fills its face (excluding center).
   - [ ] B4: Adding a 10th red cell turns `R:10` red and disables Solve button. Validation message appears.
   - [ ] B4: Removing the 10th red cell re-enables Solve and clears the message.
   - [ ] B5: Empty cells are visibly bordered, filled cells look slightly tighter.
5. Lighthouse on /solve: performance ≥ 85, accessibility ≥ 95.
6. Test in incognito on `idiotkuben.pages.dev` after deploy completes — not localhost.

---

## File checklist (likely changes)

```
src/
  components/
    cube/
      ActiveFaceHighlight.tsx       (A1 — full rewrite, halo only)
      Cube3D.tsx                    (A2 — remove dim-overlay wiring)
    ColorInput.tsx                  (B1, B3, B4, B5 — instructions, dblclick, validation, borders)
  pages/
    InputPage.tsx                   (B1, B2 — instruction text, keyboard hook)
  hooks/
    useColorShortcuts.ts            (B2 — new)
    useColorShortcuts.test.ts       (B2 — new)
  i18n/
    sv.ts                           (B1, B4 — new strings)
    en.ts                           (B1, B4 — new strings)
CLAUDE.md                           (update at end of m9)
```

---

## Handoff prompt for Claude Code

After /clear, give Claude Code:

> Read milestone-9.md and CLAUDE.md. Implement Part A first (A1, A2 — active face halo replaces dim overlay). Verify visually on a deployed preview before moving on — m8's active face fix looked correct in code but invisible on production. Then Part B (B1 → B5). Commit after each sub-task with format `m9: <subtask> — <one-line summary>`. Push at the end with `git push` — verify `git status` shows clean working tree and ahead-by-zero before stopping. Two prior milestones forgot to push.

---

End of milestone 9 plan.
