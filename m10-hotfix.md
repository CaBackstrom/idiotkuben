# m10 hot-fix — Move animation on mobile, mode labeling, keyboard zoom, solved transition

**Status:** URGENT
**Goal:** Fix regressions from m10 deploy. Move animation missing on mobile, wrong algorithm label in Beginner mode, keyboard zoom conflict, missing keyboard hint, and add smooth solved-state transition.

---

## Fix 1 — Mobile: Move animation not playing

**Problem:** On mobile, after clicking "Klar — nästa drag", the camera rotates to show the next active face (auto-rotate works), but the cube itself does not animate the move. The stickers stay in place until the next move. On desktop, both camera rotation and move animation work correctly.

**Root cause:** The auto-rotate implementation (m10 B1) likely conflicts with or preempts the move animation on mobile. Possibly a timing issue where auto-rotate starts before the move completes, or the move animation is conditioned on a desktop-only flag.

**Fix:**
- Ensure move animation plays to completion BEFORE auto-rotate starts.
- On mobile, the sequence should be:
  1. User clicks "Klar — nästa drag"
  2. Cube animates the move (rotation of stickers) — 400ms
  3. Move completes
  4. Auto-rotate animates camera to next active face — 800ms
  5. Next instruction appears

**Check:**
- In `GuidedPlayer.tsx` or wherever "next move" is handled, verify that `playMove()` or equivalent is called and awaited before triggering auto-rotate.
- On mobile, the move animation should use the same logic as desktop. If there's a breakpoint condition that skips animation on mobile, remove it.

**Implementation:**
- `src/components/solve/GuidedPlayer.tsx` or `src/pages/SolvePage.tsx`.
- Possibly `src/hooks/useAutoRotate.ts` — check if auto-rotate is canceling the move animation.

---

## Fix 2 — Both mobile and desktop: Wrong algorithm label in Beginner mode

**Problem:** In Beginner/Guided mode, the info card shows `Tvåfasig algoritm (Kociemba)` / `Two-phase algorithm (Kociemba)`. This is incorrect. Beginner mode uses the custom LBL solver, not Kociemba. The Kociemba chip should only appear in Advanced/Quick mode.

**Correct behavior:**
- **Beginner mode:** No algorithm chip. Just show the phase name (White cross, First layer (F2L corners), Second layer (F2L edges), Last layer (OLL + PLL)).
- **Advanced mode:** Show `Tvåfasig algoritm (Kociemba)` / `Two-phase algorithm (Kociemba)` as a chip under the "Optimal solution" heading.

**Root cause:** The mode check that conditionally renders the Kociemba chip is broken or missing. Possibly a regression from m9 A3 where we changed phase headings.

**Fix:**
- In the component that renders the algorithm chip (likely `SolvePage.tsx` or a phase info component), wrap the Kociemba chip in a condition:
  ```typescript
  {mode === 'quick' && <KociembaChip />}
  ```
- Verify the condition uses the correct prop name (`mode`, `level`, `solverType`, etc. — check existing code).

**Implementation:**
- `src/pages/SolvePage.tsx` or `src/components/solve/PhaseInfo.tsx`.

---

## Fix 3 — Desktop keyboard: Holding arrow key zooms the cube

**Problem:** On desktop, when the user holds down the right arrow key (→) to advance through moves, OrbitControls' zoom is triggered and the cube zooms in. This is disorienting. The user wants to hold the key to step through moves quickly without zoom interference.

**Desired behavior:**
- Arrow keys (← →) step through moves.
- User can hold a key to auto-repeat stepping.
- Scroll wheel zoom still works (user explicitly wants to keep this).
- Arrow keys do NOT trigger zoom.

**Root cause:** OrbitControls listens for keyboard events (possibly for zoom or pan shortcuts). The arrow key events bubble up to OrbitControls after being handled by `useKeyboardNav`, and OrbitControls interprets them as zoom commands.

**Fix:**
- In `useKeyboardNav.ts` (or wherever keyboard handlers are bound), call `event.preventDefault()` and `event.stopPropagation()` after handling arrow keys.
- This prevents the event from reaching OrbitControls.
- Do NOT disable OrbitControls zoom entirely — scroll wheel zoom should still work.

**Implementation:**
- `src/hooks/useKeyboardNav.ts`:
  ```typescript
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      onNext();
    }
    // ... same for ArrowLeft, Space, Home, End
  };
  ```

**Tests:**
- Verify arrow keys no longer zoom.
- Verify scroll wheel zoom still works.
- Verify holding → steps through moves without zoom.

---

## Fix 4 — Missing keyboard navigation hint on solve page

**Problem:** There's a `?` keyboard shortcut hint in TopNav on desktop (from m8 B3), but no visible instruction on the solve page itself that tells users they can use arrow keys. New users don't discover the keyboard shortcuts.

**Fix:** Add a small hint line below the instruction card or near the action buttons on desktop only. Subtle, one line, muted color.

**Text:**
- SV: `Tips: använd piltangenterna ← → för att navigera, mellanslag för att spela/pausa.`
- EN: `Tip: use arrow keys ← → to navigate, spacebar to play/pause.`

**Styling:**
- `text-xs`, muted color (`var(--text-muted)`), centered or right-aligned below the instruction card.
- Hidden on mobile (`hidden md:block`) — not needed on mobile since there's no keyboard.

**Implementation:**
- `src/pages/SolvePage.tsx` or `src/components/solve/GuidedPlayer.tsx`.
- Render the hint conditionally on desktop breakpoint.

---

## Polish — Smooth transition to solved overlay

**Problem:** When the cube is solved, the celebration overlay appears instantly. It's abrupt.

**Fix:** Animate the overlay appearance.

**Spec:**
- Backdrop (dark semi-transparent overlay): fade in from `opacity: 0` to `opacity: 1` over `300ms` ease-out.
- Celebration card (white card with "Grattis!" + confetti): 
  - Scale from `0.95` to `1.0` over `400ms` with spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
  - Fade in from `opacity: 0` to `opacity: 1` over the same `400ms`.
  - Start animation `200ms` after the backdrop starts (staggered, so backdrop appears first).

**Implementation:**
- `src/components/solve/SolvedOverlay.tsx` or wherever the solved celebration is rendered.
- Use CSS transitions or Framer Motion if already in the project. If not, CSS only:
  ```css
  .overlay-backdrop {
    animation: fadeIn 300ms ease-out;
  }
  .overlay-card {
    animation: scaleIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 200ms;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  ```

---

## Acceptance criteria

Before marking hot-fix done:

1. `npm test` passes.
2. `npm run build` succeeds.
3. Manual test on real mobile device:
   - [ ] Fix 1: Move animation plays when clicking "Klar — nästa drag". Cube visibly rotates, not just the camera.
   - [ ] Fix 2: No Kociemba chip in Beginner mode. Only phase names visible.
4. Manual test on desktop:
   - [ ] Fix 2: No Kociemba chip in Beginner mode. Chip appears in Advanced mode.
   - [ ] Fix 3: Holding → arrow steps through moves without zooming. Scroll wheel zoom still works.
   - [ ] Fix 4: Keyboard hint visible below instruction card on desktop, hidden on mobile.
   - [ ] Polish: Solved overlay fades in smoothly with backdrop appearing first, then card scales in.
5. Deploy via `npx wrangler pages deploy dist --project-name idiotkuben`.
6. Test in production on `idiotkuben.pages.dev` in incognito.

---

## File checklist

```
src/
  components/
    solve/
      GuidedPlayer.tsx              (Fix 1, Fix 4 — move animation, keyboard hint)
      SolvedOverlay.tsx             (Polish — fade-in animation)
  pages/
    SolvePage.tsx                   (Fix 2, Fix 4 — Kociemba chip condition, keyboard hint)
  hooks/
    useKeyboardNav.ts               (Fix 3 — preventDefault on arrow keys)
CLAUDE.md                           (update after hot-fix)
```

---

## Handoff prompt for Claude Code

After /clear:

> Read m10-hotfix.md. Fix in order: Fix 2 (quick, just a conditional), Fix 3 (preventDefault in keyboard hook), Fix 1 (investigate move animation on mobile), Fix 4 (add hint text), Polish (CSS animation). Commit after each fix with format `m10 hotfix: <fix-number> — <summary>`. Deploy and verify Fix 1 on actual mobile device before marking complete — this is the critical one.

---

End of m10 hot-fix plan.
