# Milestone 6 — The Wow Pass

**Read `idiotkuben-plan.md` and `skills/README.md` first.**

**Goal:** Take Idiotkuben from "polished" to "memorable." This milestone is about details that make users notice — language switching, mobile fixes, the cube solving itself on the landing page, subtle audio, onboarding hints, and a proactive AI tutor.

This is the final milestone. After this, Idiotkuben is presentation-ready.

---

## Skills to apply

- `frontend-design` (in your Claude Code installation) — micro-interactions, mobile UX
- `ui-ux-pro-max` (in your Claude Code installation) — onboarding patterns, language UX
- `ai-ml-integration` (in `skills/`) — proactive AI behavioral triggers

---

## Part 1: Language switcher (English default, Swedish optional)

The site is currently Swedish-only. Switch to **English as the default**, with Swedish available via a language toggle.

### Translation infrastructure

Rename `src/i18n/sv.ts` to `src/i18n/index.ts` and restructure:

```typescript
export type Language = 'en' | 'sv';

const translations = {
  en: {
    landing: { title: 'Idiotkuben', subtitle: 'Learn to solve a cube.', ... },
    level: { beginner: 'Beginner', advanced: 'Advanced', ... },
    input: { title: 'Set up your cube', hint: 'Hold the cube with white on top and green facing you.', ... },
    solve: { phase: 'Phase', of: 'of', play: 'Play phase', skip: 'Skip to end', ... },
    phases: { 1: 'White cross', 2: 'White corners', 3: 'Middle layer', 4: 'Yellow side' },
    moves: { 
      R: 'Turn right side clockwise',
      Rprime: 'Turn right side counter-clockwise',
      // etc for all 18 moves
    },
    tutor: { askEasier: 'Explain simpler', askWhy: 'Why this move?', placeholder: 'Ask your own question', ... },
    nav: { back: 'Back' },
    banner: { storage: 'We save your progress locally in your browser. Nothing is sent to us.', ok: 'OK' },
    completion: { phase1Done: 'White cross complete', solved: 'Cube solved!', moves: 'moves', time: 'time', restart: 'Solve another', home: 'Back to start' },
  },
  sv: {
    // Existing Swedish strings, restructured to match
  },
};

export function t(key: string, lang: Language): string {
  // Dot-path lookup, e.g. t('phases.1', 'sv')
  // Returns the key itself if missing — never crash
}
```

**Important:** The "Idiotkuben" name itself is NOT translated. It's a proper noun. Stays "Idiotkuben" in both languages — that's the joke. The subtitle is the only thing that explains what it does.

### Language state

Create `src/hooks/useLanguage.ts`:
```typescript
export function useLanguage() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('idiotkuben:lang');
    if (saved === 'en' || saved === 'sv') return saved;
    // Auto-detect: default to English
    return 'en';
  });

  function changeLang(newLang: Language) {
    setLang(newLang);
    localStorage.setItem('idiotkuben:lang', newLang);
  }

  return { lang, changeLang, t: (key: string) => t(key, lang) };
}
```

Use `useLanguage()` in every component that displays text. Replace all hardcoded Swedish strings with `t('key.path')` calls.

### Language toggle UI

Add a small toggle to TopNav, next to the wordmark:

```
EN | SV
```

Active language is bold, inactive is muted. Click switches and persists.

On mobile: same toggle, slightly smaller.

### AI tutor language

The Cloudflare Worker's system prompt is currently hardcoded Swedish. Pass the language as a context parameter:

```typescript
// In TutorPanel.tsx, when calling the worker:
body: JSON.stringify({
  question,
  context: { ...existingContext, language: lang }
})

// In cloudflare-worker/src/index.ts, branch the system prompt:
const systemPrompt = context.language === 'sv'
  ? `Du är en hjälpsam Rubiks kub-tutor. Svara på svenska...`
  : `You are a helpful Rubik's cube tutor. Reply in English...`;
```

Redeploy the worker after this change.

---

## Part 2: Mobile cross-layout fix

Currently the cross-input on mobile (375px) is too wide — the L+F+R+B row has 12 sticker squares which don't fit. Fix it.

### Approach: vertical stack on mobile

On screens < 640px, switch from cross layout to vertical stack:

```
   U
   ■■■
   ■■■
   ■■■

   L              F              R              B
   ■■■            ■■■            ■■■            ■■■
   ■■■            ■■■            ■■■            ■■■
   ■■■            ■■■            ■■■            ■■■

   D
   ■■■
   ■■■
   ■■■
```

Each face is its own 3×3 grid, labeled, stacked vertically. The face label is above each grid. Adjacent face hints (small colored arrow indicators) help orientation.

On desktop (≥ 640px), keep the current cross layout — it works there.

### Larger sticker squares on mobile

Current stickers are 32px on mobile. Bump to 44px since we have vertical space now. Touch targets matter.

### Color palette stays at top

The palette (with active color highlighting) sticks to the top of the input page when scrolling on mobile, so the user always has it accessible. Use `position: sticky; top: 56px` (below the TopNav).

---

## Part 3: Mobile animation fix

The 3D cube animation runs on desktop but not mobile (per user feedback). Investigate and fix.

Likely causes:
- WebGL context lost on mobile during scroll
- `useFrame` not running due to canvas unmount
- Cube3D component unmounting and remounting on mobile when the page layout changes

**Debug steps:**
1. Add `console.log` in Cube3D's `useFrame` callback. On mobile, check if it logs.
2. If not logging: animation loop isn't running. Check Canvas mounting.
3. If logging but no visual update: check that meshRef is correctly referenced.
4. If WebGL context lost: handle context loss/restoration with `<Canvas onContextLost>` callback.

Fix the actual cause. Do not just disable animation on mobile — that loses the feature.

**Test:** Solve a cube in beginner mode on mobile (use Chrome DevTools device simulation). Each "Klar — nästa drag" must visibly animate the cube.

---

## Part 4: Self-solving landing page cube

Currently the landing cube rotates mechanically on scroll. Replace with a more meaningful animation: **the cube starts scrambled and solves itself as the user scrolls.**

### How

1. On page load, generate a scrambled cube state (apply 20 random moves to a solved state)
2. Compute its solution using `solveLayerByLayer()` from `lbl.ts`
3. The solution has N moves
4. Map scroll position (0–1) to move progress (0 to N)
5. As the user scrolls, the cube animates through the solution moves
6. At the bottom of the scroll area, the cube is fully solved

### Implementation in LandingPage.tsx

```tsx
const scrambledState = useMemo(() => {
  // Use seed for reproducibility
  const rng = mulberry32(12345);
  let s = solvedState();
  for (let i = 0; i < 20; i++) {
    const move = ALL_MOVES[Math.floor(rng() * ALL_MOVES.length)];
    s = Moves[move](s);
  }
  return s;
}, []);

const solution = useMemo(() => solveLayerByLayer(scrambledState), [scrambledState]);

// In the scroll-driven cube component:
const scroll = useScroll();
useFrame(() => {
  const targetMoveIndex = Math.floor(scroll.offset * solution.length);
  // Apply moves up to targetMoveIndex to scrambledState
  // Update visual cube state accordingly
});
```

The cube also still rotates slowly (its own y-axis) so it's never static. Combination of: solution progress (driven by scroll) + ambient rotation (driven by time).

**Performance:** This runs the LBL solver once on page load. The solver takes 5-30s for some scrambles. Run it in a `useEffect` after mount, show a brief loading state on the cube ("Loading...") until ready. Or, use a pre-computed solution from a known seed — pick a seed where the LBL solver runs in <2s.

**Mobile:** On mobile, skip the scroll-driven mechanic. Show the cube solving itself on a 10-second loop instead. Same visual story, no scroll dependency.

---

## Part 5: Subtle audio (toggleable)

Add minimal audio feedback. No music. No fanfare. Just subtle cues.

### Sound events

- **Move confirmed** (clicking "Klar — nästa drag" or any move button): soft click, ~50ms
- **Phase complete**: short ascending chime, ~300ms
- **Cube solved**: longer triumphant tone, ~800ms
- **Tutor responds**: subtle ping when AI response arrives

### Implementation

Use Web Audio API directly. No libraries. Create `src/utils/sounds.ts`:

```typescript
const audioContext = new AudioContext();
let enabled = localStorage.getItem('idiotkuben:sound') !== 'off';

function tone(frequency: number, duration: number, type: OscillatorType = 'sine') {
  if (!enabled) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.1, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  osc.start();
  osc.stop(audioContext.currentTime + duration);
}

export const sounds = {
  click: () => tone(440, 0.05, 'square'),
  phaseComplete: () => {
    tone(523, 0.15);
    setTimeout(() => tone(659, 0.15), 150);
    setTimeout(() => tone(784, 0.2), 300);
  },
  solved: () => {
    tone(523, 0.15);
    setTimeout(() => tone(659, 0.15), 100);
    setTimeout(() => tone(784, 0.15), 200);
    setTimeout(() => tone(1047, 0.4), 300);
  },
  tutorPing: () => tone(880, 0.1, 'sine'),
  toggle(state: boolean) {
    enabled = state;
    localStorage.setItem('idiotkuben:sound', state ? 'on' : 'off');
  },
  isEnabled: () => enabled,
};
```

### Sound toggle UI

Small speaker icon in TopNav (next to language toggle). Click toggles, icon shows current state. Default: **off** (respects users who don't expect audio).

Use Lucide React icons or inline SVG. Don't install new icon libraries.

---

## Part 6: Onboarding preview on level cards

The level selector shows two text-only cards. Add a tiny visual preview to communicate what each level looks like.

### Approach: animated mini-preview

On each card, embed a small (~150px) animated preview:

**Beginner card preview:**
- Tiny cube
- Single move arrow ("R") highlighted
- Text caption: "One move at a time"

**Advanced card preview:**
- Same tiny cube
- Algorithm string scrolling: "R U R' U' F R' F'"
- Text caption: "Full algorithms"

These are static SVG illustrations, not 3D — no need to spin up another Cube3D instance per card. Hand-drawn (in code) representations of cube faces with the relevant overlay.

**Animation:** Subtle, looping. Beginner shows the same R arrow blinking softly. Advanced shows the algorithm characters appearing one at a time, then resetting.

This sells the difference between levels visually before the user has to commit.

---

## Part 7: Proactive AI tutor (frustration detector)

Currently the AI tutor only responds when the user clicks. Make it proactive in one specific case: when the user clicks "Backa" (back) 3+ times on the same move.

### Trigger logic

In `SolutionPlayer.tsx`:

```typescript
const [backCounts, setBackCounts] = useState<Record<number, number>>({});

function handleBack() {
  const currentMove = guidedStep;
  setBackCounts(c => ({ ...c, [currentMove]: (c[currentMove] || 0) + 1 }));
  // ... existing back logic
}

// When backCounts[currentMove] === 3, trigger proactive tutor
useEffect(() => {
  if (backCounts[guidedStep] === 3 && !proactiveShown[guidedStep]) {
    showProactiveTutor();
    setProactiveShown(p => ({ ...p, [guidedStep]: true }));
  }
}, [backCounts, guidedStep]);
```

### UI

A small, dismissible card that slides in from the bottom-right:

```
+---------------------------------+
| Stuck on this move?             |
| I can explain it differently.   |
|                                 |
| [Yes, help me]      [Dismiss]   |
+---------------------------------+
```

**"Yes, help me"** triggers the tutor with a special prompt:
```
Question: "I'm having trouble with this move. Explain it in a simpler way, with a different angle than the standard explanation."
```

**"Dismiss"** hides the card and doesn't show again for that move.

Show only once per move per session. Don't be annoying.

This is the AI-aware feature that justifies the "AI course project" label.

---

## Part 8: Polish refinements

### 8.1 Page transitions

Currently page changes are instant. Add a 200ms fade transition between pages using CSS:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-content {
  animation: fadeIn 200ms ease-out;
}
```

Apply to the main content area of each page.

### 8.2 Empty state for tutor

Before the user asks anything, the tutor area shows a placeholder:

```
Need help? Ask the tutor.
```

Subtle, muted color. Once user asks, replaces with conversation.

### 8.3 Error handling polish

Currently errors are technical. Replace with friendly messages:
- "Cube can't be solved" → "This cube state isn't valid. Check that you set 9 stickers per color."
- "Tutor unavailable" → "Tutor is taking a break. Try again in a moment."
- "Build failed" / connection errors → "Something went sideways. Refresh and try again."

---

## Definition of done

- [ ] Language toggle (EN/SV) in TopNav, persists to localStorage
- [ ] All UI strings come from `t()` — zero hardcoded strings
- [ ] Worker accepts language parameter and responds in that language
- [ ] Mobile cross-input switches to vertical stack at <640px
- [ ] Cube animation runs on mobile (verified in DevTools simulation)
- [ ] Landing page cube solves itself as user scrolls (desktop) / on loop (mobile)
- [ ] Sound toggle works, default off
- [ ] All four sound events play correctly when enabled
- [ ] Onboarding preview on both level cards
- [ ] Proactive tutor triggers after 3 back-clicks on same move
- [ ] Page transitions fade in
- [ ] Error messages are friendly
- [ ] `npm run build` clean
- [ ] All tests still pass (`npm test`)
- [ ] Worker redeployed: `cd cloudflare-worker && npx wrangler deploy`
- [ ] Frontend redeployed: `npx wrangler pages deploy dist --project-name=idiotkuben`

---

## Order of execution

Do these in order. If you run out of time/tokens, stop after Part 4 — that's the highest-impact subset.

1. **Part 1** (language) — biggest user-facing change
2. **Part 2** (mobile cross) — fixes broken layout
3. **Part 3** (mobile animation) — fixes broken feature
4. **Part 4** (self-solving cube) — biggest wow factor
5. **Part 5** (audio) — polish
6. **Part 6** (level previews) — polish
7. **Part 7** (proactive tutor) — AI-vinkel
8. **Part 8** (general polish) — final touches

After each part: build to verify nothing broke. Don't deploy until all parts done (or you stop early).

---

## When milestone 6 is done

This is genuinely the last milestone. Idiotkuben is now ready for the course presentation.

Final deliverables:
- Live URL: https://idiotkuben.pages.dev
- GitHub: https://github.com/CaBackstrom/idiotkuben
- Worker URL: https://idiotkuben-tutor.carl-backstrom.workers.dev

Update CLAUDE.md to mark all 6 milestones complete. Update README.md with final live URL and a one-paragraph project description.
