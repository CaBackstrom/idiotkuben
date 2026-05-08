# Milestone 5 — UX Polish & Gamification

**Read `idiotkuben-plan.md` and `skills/README.md` first.**

**Goal:** Take Idiotkuben from "functional and deployed" to "feels like a polished product." Focus on three things: navigation flow, sticky cube visibility during solving, and gamification cues that make progress feel earned.

This is the last milestone. After this, Idiotkuben is presentation-ready.

---

## Skills to apply

- `frontend-design` (in your Claude Code installation) — visual hierarchy, micro-interactions, polish
- `ui-ux-pro-max` (in your Claude Code installation) — UX flows, navigation patterns, gamification psychology
- `fullstack-engineer` (in `skills/`) — sticky positioning, scroll behaviors

---

## Part 1: Navigation — back buttons everywhere

Currently the user gets stuck in deeper pages with no way back except the browser back button. Fix this consistently across all pages.

**Add a top navigation bar component:** `src/components/TopNav.tsx`

```
+-----------------------------------------------------+
| ← Tillbaka      Idiotkuben       [Steg 2 av 4]      |
+-----------------------------------------------------+
```

- Left: "← Tillbaka" link, navigates to previous logical page (NOT browser history)
- Center: "Idiotkuben" wordmark (Fraunces, clickable, navigates to `/`)
- Right: contextual info — phase indicator on /solve, page name on others, hidden on `/`

**Logical back navigation per page:**
- `/level` → `/`
- `/input` → `/level`
- `/solve` → `/input`
- `/demo` → `/`

**Visual style:**
- Sticky top, height 56px on desktop, 48px on mobile
- Background: white with 1px bottom border in `--border` color
- Tillbaka link uses `--muted` color, hover changes to `--fg`
- Wordmark uses `--fg` color, font-display

**On `/` (landing) the nav bar shows only the centered wordmark.**

---

## Part 2: Sticky cube during solving (CRITICAL UX FIX)

Currently on `/solve`, when scrolling to read the move/explanation, the 3D cube scrolls off-screen. The user can't see the cube while reading what to do. This is the single biggest UX problem in the app.

**Fix in SolvePage.tsx:**

Make the 3D cube container `position: sticky` on desktop so it stays visible while the instruction panel scrolls.

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
  <div className="md:sticky md:top-20 md:h-[calc(100vh-6rem)]">
    <Cube3D ... />
  </div>
  <div className="space-y-4">
    {/* phase stepper, instruction, buttons */}
  </div>
</div>
```

On mobile, cube stays at the top (not sticky — sticky on tall mobile pages causes weird behavior). On desktop, the cube panel sticks to the top while content scrolls.

**Cube animation must remain visible during transitions** — when the user clicks "Klar — nästa drag" the cube animates, and the user must see that animation. The sticky positioning ensures this happens regardless of scroll position.

**Also: smooth scroll to instruction panel** when a new move is shown so the user's focus follows the new content. Use `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on the move display element.

---

## Part 3: Gamification cues

Subtle gamification that respects the editorial design language. No confetti, no badges, no XP — just well-designed feedback that makes progress feel earned.

### 3.1 Phase completion celebration

When the user completes a phase (transitions from phase N to N+1), show a brief overlay:

```
+----------------------------+
|                            |
|         ✓ Fas 1 klar       |
|         Vita korset löst   |
|                            |
+----------------------------+
```

- Appears for ~1.5 seconds, fades out
- Uses accent red color for the checkmark
- Centered on screen with subtle backdrop blur
- Does NOT block interaction — user can keep clicking through

### 3.2 Animated progress bar

The current progress bar (`68/83 totalt`) is static. Add a subtle animation when progress increases:
- Bar fill transitions smoothly (CSS transition on width)
- A faint pulse/glow on the bar when a new move is completed
- Use accent color, never neon or rainbow

### 3.3 Move counter momentum

Show the move count more prominently. When the user has done 10 moves: 

```
Drag 10  ✓
```

with a small animated checkmark. Same at every multiple of 10. Subtle, not disruptive.

### 3.4 Final solve celebration

When `Kuben är löst!` is reached:
- Brief confetti effect using existing accent color (no rainbow) — small, tasteful
- Move count summary: "Du klarade det på 83 drag och 4 minuter"
- Time tracking: start a timer when /solve loads, show elapsed time at the end
- Two buttons: "Lös en till" (returns to /input with cleared state) and "Tillbaka till start" (returns to /)

For the confetti, write a simple CSS-only solution — small squares in accent color falling from the top with random horizontal offset and rotation. ~30 particles for 2 seconds. Do NOT install a confetti library.

---

## Part 4: Visual polish

### 4.1 Buttons

Currently buttons are flat rectangles. Add:
- Subtle shadow on hover
- Slight scale transform (`transform: scale(0.98)`) on active/click
- Smooth transitions (150ms)
- Accent button (red): white text, hover slightly darker red
- Outline button: 1.5px border, hover fills with `--fg` color subtly

### 4.2 Cube reflections / depth

The 3D cube currently has flat black borders between stickers. Add:
- Slight rounded corners on stickers (CSS not Three.js — use the cube material)
- A subtle directional light to give the cube depth shading
- Keep it editorial — no neon, no rainbow reflections

### 4.3 Phase stepper

Currently the phase stepper shows all 4 phases as equal-weight boxes. Improve:
- Completed phases: filled background, light checkmark
- Current phase: accent border, bold text
- Future phases: muted, no border
- On desktop: connecting line between phases
- On mobile: simpler — just dots with current highlighted

### 4.4 Typography rhythm

Audit all text on `/solve` and `/input`. Make sure there's a clear hierarchy:
- H1: Fraunces 48px (page title)
- H2: Fraunces 32px (phase name)
- Body: Inter 16px
- Mono: JetBrains Mono 14px (algorithm notation, move letters)
- Muted: Inter 14px in `--muted` color (helper text)

Ensure consistent spacing — multiples of 8px (8, 16, 24, 32, 48, 64).

### 4.5 Loading states

Currently when "Lös min kub" is clicked there's no loading feedback. Add:
- Brief loading spinner OR pulsing "Hittar lösning..." text
- Disable the button during loading
- Smooth transition to `/solve` after solution is computed

---

## Part 5: Mobile-specific gamification

On mobile, vertical space is precious. Adjust:
- Phase stepper compresses to 4 dots with current highlighted
- Move counter and progress bar combine into one compact row
- Phase completion overlay scales down
- Confetti uses fewer particles (15 instead of 30) for performance

---

## What NOT to do

- No emoji-based feedback — "🎉 Awesome job!" violates the brand
- No neon colors or gradients
- No bouncing animations
- No "you earned X points" mechanics
- No badges or achievements
- No sound effects (yet — could be milestone 6 if desired)
- No dark mode (out of scope)
- Don't break the existing flow — every change must preserve current functionality

---

## Definition of done

- [ ] TopNav component on every page except `/`
- [ ] "← Tillbaka" navigates correctly per page
- [ ] On `/solve`, the cube stays visible while scrolling on desktop (sticky positioning)
- [ ] Cube animation visible during "Klar — nästa drag" transitions
- [ ] Phase completion overlay appears briefly between phases
- [ ] Progress bar animates smoothly
- [ ] Move counter shows checkmark every 10 moves
- [ ] Final celebration with confetti, time, move count
- [ ] "Lös en till" and "Tillbaka till start" buttons after solve
- [ ] Buttons have hover/active states
- [ ] Phase stepper shows visual hierarchy (completed/current/future)
- [ ] Typography hierarchy applied consistently
- [ ] Loading state on "Lös min kub" button
- [ ] Mobile layout still works at 375px
- [ ] No new dependencies installed
- [ ] `npm run build` clean
- [ ] Deployed: `npx wrangler pages deploy dist --project-name=idiotkuben`

---

## When milestone 5 is done

Final test: Go through entire flow on desktop AND mobile. Confirm:
- Can navigate back from any page
- Can see cube while reading instructions
- Phase transitions feel rewarding without being childish
- Final solve feels celebratory without being cringe
- The app feels polished, not janky

This is the last milestone. After approval, Idiotkuben is presentation-ready.
