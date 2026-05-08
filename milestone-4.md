# Milestone 4 — Landing Page, AI Tutor, Mobile, Deploy

**Read `idiotkuben-plan.md` and `skills/README.md` first.**

**Goal:** The app goes from functional to finished. A real landing page with scroll-driven 3D cube, an AI tutor that explains moves, mobile polish, and clean final deploy.

This is the last milestone. After this, Idiotkuben is a complete course project.

---

## What exists from previous milestones

- Milestone 1: cube engine, 18 moves, 3D rendering, verify utility
- Milestone 2: Kociemba solver, color input, solution player, localStorage
- Milestone 3: LBL solver, guided mode, level selector, design tokens (Fraunces, Inter, JetBrains Mono, CSS variables)
- Deployed at idiotkuben.pages.dev

Do not break any of this. Read existing code before modifying components.

---

## Part 1: Landing Page

### New file: `src/pages/LandingPage.tsx`

Route: `/` (replaces the current DemoPage as the homepage)

Move DemoPage to `/demo` (keep it — it's useful for debugging).

**Landing page structure (top to bottom):**

```
+------------------------------------------+
|  HEADER                                  |
|  Idiotkuben                              |
|  (Fraunces, large, near-black)           |
+------------------------------------------+
|  HERO                                    |
|  3D cube — centered, large               |
|  Rotates as user scrolls                 |
|                                          |
|  Text fades in on scroll:                |
|  Section 1: "Lär dig lösa kuben."        |
|  Section 2: "Ett drag i taget."          |  
|  Section 3: "Fungerar alltid."           |
+------------------------------------------+
|  CTA                                     |
|  [Lös din kub →]  (accent red button)    |
+------------------------------------------+
|  HOW IT WORKS (3 columns)               |
|  1. Mata in din kub                      |
|  2. Välj din nivå                        |
|  3. Följ dragen                          |
+------------------------------------------+
```

**Scroll-driven 3D cube:**

Use `ScrollControls` from `@react-three/drei` wrapping the Canvas. Inside, use `useScroll` hook to get `scroll.offset` (0–1). Map offset to cube rotation:

```typescript
useFrame(() => {
  if (meshRef.current) {
    meshRef.current.rotation.y = scroll.offset * Math.PI * 2;
  }
});
```

The cube rotates a full 360° as the user scrolls from top to bottom of the hero section. Use `quality="low"` prop on Cube3D for landing performance.

**GSAP is NOT required.** `useScroll` from drei is sufficient and simpler. Do not install GSAP unless `useScroll` proves insufficient.

**Text sections:** Simple CSS — `position: sticky` with `opacity` transitions on scroll. No Framer Motion needed for this.

**CTA button** navigates to `/level`.

**Mobile:** On screens < 640px, replace the scroll-driven cube with a static cube that rotates slowly (autorotate). Scroll-driven animation on mobile is janky and not worth it.

---

## Part 2: AI Tutor (Cloudflare Worker)

### New directory: `cloudflare-worker/`

```
cloudflare-worker/
├── src/
│   └── index.ts
├── wrangler.toml
└── package.json
```

### `cloudflare-worker/wrangler.toml`

```toml
name = "idiotkuben-tutor"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"
```

### `cloudflare-worker/src/index.ts`

```typescript
export interface Env {
  AI: Ai;
}

interface AskRequest {
  question: string;
  context: {
    phase: number;
    phaseName: string;
    currentMove: string;
    explanation: string;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const body: AskRequest = await request.json();
    const { question, context } = body;

    const systemPrompt = `Du är en hjälpsam Rubiks kub-tutor. 
Svara alltid på svenska. Håll svaret kort — max 3 meningar.
Var direkt och pedagogisk. Inga emojis. Inga onödiga fraser som "Bra fråga!".
Användaren håller just på med: ${context.phaseName} (fas ${context.phase} av 4).
Nuvarande drag: ${context.currentMove} (${context.explanation}).`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ];

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
      max_tokens: 200,
    });

    return new Response(JSON.stringify({ answer: response.response }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
```

### Deploy the Worker

```bash
cd cloudflare-worker
npm init -y
npm install -D wrangler
npx wrangler deploy
```

Note the Worker URL after deploy — something like `https://idiotkuben-tutor.your-subdomain.workers.dev`

Add this URL to the frontend as an environment variable in a `.env` file:
```
VITE_TUTOR_URL=https://idiotkuben-tutor.your-subdomain.workers.dev
```

**Important:** `.env` must be in `.gitignore`. Add it if not already there.

For Cloudflare Pages deploy, add the environment variable in the Pages dashboard under Settings → Environment variables.

### Frontend: AI Tutor UI

Add a tutor panel to `SolvePage.tsx` in guided mode only.

Three interaction points:

1. **"Förklara enklare" button** — sends: `{ question: "Förklara detta drag enklare", context: {...} }`
2. **"Varför detta drag?" button** — sends: `{ question: "Varför gör man just detta drag nu?", context: {...} }`  
3. **Free text input** — user types own question, sends with same context

UI placement: below the move display, above the "Backa/Klar" buttons.

```
+------------------------------------------+
|  D'   Vrid botten moturs                 |
|                                          |
|  [Förklara enklare] [Varför detta drag?] |
|  [_________________________] [Fråga →]  |
|                                          |
|  Tutor: "D' vrider hela bottenlagret    |
|  moturs. Det behövs nu för att flytta   |
|  den gröna-vita kanten till rätt..."    |
+------------------------------------------+
```

**Loading state:** Show "Tutorn tänker..." while waiting.

**Error state:** If Worker returns 5xx: "Tutorn sover. Försök igen." Do not show technical errors.

**Rate limiting (client-side only):** Max 3 tutor requests per minute. Track with a timestamp array in useState. If limit reached: "Vänta lite innan nästa fråga." This is good enough for a course project.

**Skip tutor if `VITE_TUTOR_URL` is not set** — the rest of the app must work without it. Check `import.meta.env.VITE_TUTOR_URL` before rendering tutor UI.

---

## Part 3: Mobile Polish

Target: iPhone SE width (375px) and up. Test in Chrome DevTools device simulation.

**SolvePage mobile layout:**
- Stack cube above instruction panel (not side-by-side)
- Cube height: 300px on mobile, 450px on desktop
- "Klar — nästa drag" button: full width, large touch target (min 56px height)
- Phase stepper: compress to icons or numbers only on mobile (hide text labels)

**InputPage mobile layout:**
- Cross layout scales down — each sticker square min 32px
- Palette row wraps if needed
- Both buttons full width on mobile

**LevelPage mobile layout:**
- Cards stack vertically on mobile
- Full width cards

**LandingPage mobile:**
- Static slow-rotating cube instead of scroll-driven
- Text sections stack normally
- CTA button full width

**General:**
- No horizontal scrolling anywhere
- Touch targets minimum 44px
- Test: zoom to 375px width in Chrome DevTools, verify no overflow

---

## Part 4: Telemetry

Add Cloudflare Web Analytics. It is cookieless and GDPR-compliant — no banner needed for this.

In `index.html`, add before `</head>`:
```html
<script defer src='https://static.cloudflare insights.com/beacon.min.js' 
  data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
```

Get the token from: Cloudflare Dashboard → Web Analytics → Add a site → idiotkuben.pages.dev

Custom events (add to relevant components):
```typescript
// Helper
function track(event: string, data?: Record<string, string>) {
  if (typeof window !== 'undefined' && (window as any).cf_beacon) {
    (window as any).cf_beacon('event', { name: event, ...data });
  }
}

// Usage
track('level_selected', { level: 'beginner' });
track('solve_started');
track('phase_completed', { phase: '1' });
track('solve_completed');
track('tutor_asked', { type: 'explain_simpler' });
```

Create `src/utils/telemetry.ts` with the track helper.

---

## Part 5: Final cleanup

**Remove or hide the DemoPage link** from the main navigation. Keep `/demo` route for internal use but don't advertise it.

**Update CLAUDE.md** with complete project overview, all 4 milestones done.

**README.md** — update with:
- One paragraph about the project
- Tech stack
- How to run locally
- Live URL

**Delete any remaining TODO comments** in the code.

**Final build check:**
```bash
npm run build
```
Should produce no warnings except the expected Three.js chunk size warning.

---

## Skills to apply

- `frontend-design` (in your Claude Code installation) — landing page design, mobile layout
- `fullstack-engineer` (in `skills/`) — Worker code, environment variables
- `api-design` (in `skills/`) — Worker endpoint design
- `ai-ml-integration` (in `skills/`) — prompt engineering, fallback handling

---

## Definition of done

- [ ] Landing page at `/` with scroll-driven (desktop) or autorotating (mobile) 3D cube
- [ ] Three text sections fade in on scroll on desktop
- [ ] CTA button navigates to `/level`
- [ ] "How it works" section visible
- [ ] AI tutor shows in guided mode with all three interaction types
- [ ] Tutor responds correctly (test with "Förklara enklare" on any move)
- [ ] Tutor error state shows correctly when Worker is unavailable
- [ ] Client-side rate limiting works (3 requests/minute)
- [ ] Mobile layout correct at 375px — no horizontal scroll, large touch targets
- [ ] Cloudflare Web Analytics token added to index.html
- [ ] telemetry.ts created with track() helper
- [ ] track() called on level_selected, solve_started, solve_completed
- [ ] CLAUDE.md updated — all 4 milestones marked complete
- [ ] README.md updated with live URL
- [ ] `npm run build` clean
- [ ] Final deploy: `npx wrangler pages deploy dist --project-name=idiotkuben`
- [ ] Worker deployed: `cd cloudflare-worker && npx wrangler deploy`
- [ ] Live URL confirmed working end-to-end

---

## Deploy order

1. Build and deploy frontend first (without tutor URL):
   ```bash
   npm run build
   npx wrangler pages deploy dist --project-name=idiotkuben
   ```

2. Deploy Worker:
   ```bash
   cd cloudflare-worker
   npx wrangler deploy
   ```

3. Note Worker URL, add to Cloudflare Pages environment variables in dashboard.

4. Redeploy frontend to pick up the environment variable:
   ```bash
   cd ..
   npm run build  
   npx wrangler pages deploy dist --project-name=idiotkuben
   ```

---

## When milestone 4 is done

This is the final milestone. When complete:
- Share the live URL with the user
- The app is ready to present as a course project
- Update CLAUDE.md to reflect all milestones complete

Congratulations — Idiotkuben is done.
