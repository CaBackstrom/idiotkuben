# Milestone 11 — "Fastnat?"-knapp med tutor troubleshooting

**Status:** NEXT
**Goal:** Add a "stuck/lost" recovery path via AI tutor without camera input. Improve orientation clarity and polish solved-state transition.
**Non-goal:** Camera-based state detection (parked in `future-wishes.md`), "reset phase" button (doesn't work without knowing actual cube state).

---

## Part A — "Fastnat?"-knapp med tutor pre-fill

### A1. Add "Fastnat?" button to solve page

**Problem:** Users who make a mistake mid-solve don't have a clear recovery path. The "Backa" button only helps if they catch the error immediately (1-2 moves back). If they're unsure whether they made a mistake or just confused by the current state, they have no guidance.

**Solution:** Add a **"Fastnat?" / "Stuck?"** button that opens the AI tutor with pre-filled troubleshooting context.

**Placement:**
- **Mobile:** In the sticky action bar (from m10 A1), between "Backa" and "Klar — nästa drag". Three buttons total.
- **Desktop:** Below the instruction card, or as a secondary button next to "Backa".

**Button styling:**
- Not primary (don't compete with "Klar — nästa drag")
- Subtle, friendly tone — not alarming
- Icon: `?` or `🤔` (optional, test without first)

**Text:**
- SV: `Fastnat?`
- EN: `Stuck?`

**Behavior:**
When clicked:
1. Tutor panel opens (same as clicking "Ask a question" input)
2. Tutor input field is **pre-filled** with:
   - SV: `Jag tror jag gjort fel någonstans. Jag är på [fas-namn], drag [N] av [total]. Kan du hjälpa mig kolla om min kub ser rätt ut?`
   - EN: `I think I made a mistake somewhere. I'm on [phase-name], move [N] of [total]. Can you help me check if my cube looks right?`
3. User can edit or just press "Ask" / "Fråga"

**Example pre-fill:**
> Jag tror jag gjort fel någonstans. Jag är på Vita korset, drag 3 av 6. Kan du hjälpa mig kolla om min kub ser rätt ut?

**Implementation:**
- `src/components/solve/GuidedPlayer.tsx` or `SolvePage.tsx` — add button
- `src/components/TutorPanel.tsx` — add prop `preFillText?: string` that sets input value when panel opens
- Button passes current phase name + move index as pre-fill

**Tests:**
- Click "Fastnat?" → tutor opens with pre-filled text
- User can edit text before sending
- Works on both mobile and desktop

---

## Part B — Tutor orientation-awareness

### B1. Enhanced system prompt with cube orientation context

**Problem:** When the tutor helps troubleshoot cube state, it needs to reference the **expected orientation** (white on top, green in front) to avoid confusion. Currently the tutor has no awareness of this reference frame.

**Solution:** Update the tutor system prompt (in the Cloudflare Worker) to include:

**1. Expected cube orientation (always constant in this app):**
```
Standard orientation reference:
- Top (U): white
- Bottom (D): yellow
- Front (F): green
- Back (B): blue
- Right (R): red
- Left (L): orange

When discussing cube state with the user, ALWAYS use color names, not relative directions.
Correct: "Check if your white side is on top"
Incorrect: "Check if the top is white"
```

**2. Current solve context (passed from frontend):**
When user is on `/solve` page and asks a question, include:
- Current mode (Beginner / Advanced)
- Current phase name (e.g. "White cross", "First layer (F2L corners)")
- Current move number / total moves in phase
- Expected state at this point (e.g. "White cross should be complete, white corners not yet placed")

**3. Troubleshooting protocol:**
When user asks for help with cube state (detected by keywords like "fel", "wrong", "stuck", "lost", "ser inte rätt ut"), the tutor should:
1. First confirm orientation: "Håller du kuben med vit ovansida och grön framsida?"
2. Ask one verification question at a time: "Vilken färg har du i mitten på ovansidan?"
3. Guide user to check expected vs actual state piece by piece
4. If mismatch found, help user identify how many moves back to go, or suggest starting over from `/input`

**Implementation:**
- `cloudflare-worker/src/index.ts` — update system prompt
- Frontend sends current context as part of the tutor API request:
  ```typescript
  {
    message: "user question",
    context: {
      mode: "guided",
      phase: "White cross",
      moveIndex: 3,
      totalMoves: 6,
      language: "sv"
    }
  }
  ```
- Worker includes context in system prompt

**Tests:**
- Send tutor request with context → system prompt includes phase info
- Ask troubleshooting question → tutor starts with orientation check
- Language switching works (SV system prompt when `language: "sv"`)

---

## Part C — Permanent orientation badge on mobile

### C1. Make "Front: X Top: Y" badge always visible on mobile

**Problem:** The orientation badge ("Front: green Top: white") currently shows on hover/always on desktop, but may not be persistent on mobile. On mobile, where the cube is smaller and easier to lose track of orientation, users need this reference visible at all times.

**Solution:** Make the orientation badge **always visible on mobile**, positioned clearly but unobtrusively.

**Placement:**
- Top-right corner of the cube viewport (inside the canvas container or as HTML overlay)
- Small, muted styling — should not distract from the cube itself

**Styling:**
- `text-xs`, muted background (`rgba(26,26,26,0.05)`), padding `0.25rem 0.5rem`, rounded corners
- Color: `var(--text-muted)`
- Font: `font-mono` for the color names (consistent with move notation)

**Behavior:**
- Updates in real-time as cube rotates (already implemented via `useFrontFace` hook from m8 A2)
- Never hidden on mobile
- On desktop: can remain as-is (visible on hover or always visible — user's choice, not critical)

**Implementation:**
- `src/components/cube/OrientationBadge.tsx` — already exists from m8
- Ensure it's rendered with `block` (not `hidden`) on mobile breakpoint

**Tests:**
- Visual check on mobile — badge always visible, updates on rotation

---

## Part D — Solved overlay smooth transition (from m10-hotfix)

### D1. Fade-in + scale animation on solved state

**Problem:** Solved overlay appears instantly. Feels abrupt after the buildup of solving.

**Solution:** Animate the overlay appearance.

**Spec:**
- **Backdrop** (dark overlay): fade in from `opacity: 0` to `0.4` over `300ms` ease-out
- **Celebration card**: 
  - Fade in from `opacity: 0` to `1` over `400ms`
  - Scale from `0.95` to `1.0` over `400ms` with spring easing `cubic-bezier(0.34, 1.56, 0.64, 1)`
  - Start `200ms` after backdrop (staggered for polish)

**Implementation:**
- `src/components/solve/SolvedOverlay.tsx` — add CSS transitions or use existing animation library if present
- If using CSS:
  ```css
  .solved-backdrop {
    animation: fadeIn 300ms ease-out;
  }
  .solved-card {
    animation: scaleIn 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 200ms;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  ```

**Tests:**
- Visual check — overlay fades in smoothly, card scales with slight bounce

---

## Acceptance criteria

Before marking m11 done:

1. `npm run typecheck` passes
2. `npm test` all pass
3. `npm run build` succeeds
4. Manual test on mobile:
   - [ ] A1: "Fastnat?" button visible in sticky action bar, opens tutor with pre-filled troubleshooting text
   - [ ] C1: Orientation badge always visible, updates on cube rotation
   - [ ] D1: Solved overlay fades in smoothly with staggered backdrop + card
5. Manual test on desktop:
   - [ ] A1: "Fastnat?" button present, tutor pre-fill works
   - [ ] B1: Tutor responses reference orientation ("håll kuben med vit ovansida"), ask verification questions one at a time
   - [ ] D1: Solved overlay animation works
6. Deploy via `npx wrangler pages deploy dist --project-name idiotkuben`
7. Test in production on real mobile device

---

## File checklist

```
src/
  components/
    solve/
      GuidedPlayer.tsx              (A1 — add Fastnat button)
      SolvedOverlay.tsx             (D1 — fade-in animation)
    cube/
      OrientationBadge.tsx          (C1 — always visible on mobile)
    TutorPanel.tsx                  (A1 — preFillText prop)
  pages/
    SolvePage.tsx                   (A1 — pass context to tutor)
cloudflare-worker/
  src/
    index.ts                        (B1 — enhanced system prompt with orientation + context)
  i18n/
    sv.ts                           (A1 — new strings)
    en.ts                           (A1 — new strings)
CLAUDE.md                           (update at end of m11)
```

---

## Handoff prompt for Claude Code

After /clear:

> Read milestone-11.md and CLAUDE.md. Implement in order: C1 (orientation badge — quick CSS change), D1 (solved fade — CSS animation), A1 (Fastnat button + tutor pre-fill), B1 (worker system prompt update). Deploy and test on mobile after A1 to verify pre-fill works correctly before moving to B1. The tutor troubleshooting flow is the critical new feature — make sure the pre-fill text is natural and helpful in both SV and EN.

---

End of milestone 11 plan.
