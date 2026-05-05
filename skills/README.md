# Skills for Idiotkuben

This folder contains skills (best-practice guides) that Claude Code should apply throughout the project. They are not optional reading.

## How to use these skills

1. **Read this README first** to understand which skill applies to which task.
2. **Read the relevant skill file before starting any task it covers.** For example, before writing tests, read `testing-qa.md`. Before writing a Cloudflare Worker, read `api-design.md` and `ai-ml-integration.md`.
3. **Skills compound.** A frontend component with API calls needs `frontend-design` (in your built-in Claude Code skills) AND `fullstack-engineer.md` AND `api-design.md`.
4. **Skills don't override the project plan.** If a skill suggests a pattern that conflicts with locked architectural decisions in `idiotkuben-plan.md`, the plan wins. The skills are how-to-do-it-well, the plan is what-to-do.

## Skills already available in your Claude Code installation

These the user has installed locally — invoke them where relevant:

- **`frontend-design`** — Distinctive, production-grade frontend design. Use for ALL component work, especially milestone 3 (landing page, level select, designed pages).
- **`ui-ux-pro-max`** — UX flows, micro-interactions, polish. Use for milestone 3 (Guided mode flow, "Done" button design) and milestone 4 (transitions, mobile polish).

If neither skill is found in your installation, proceed with general best practices but tell the user the skills weren't found.

## Skills in this folder

These are copied into the project so they're always available regardless of Claude Code's installation state:

### `fullstack-engineer.md`

**Apply to:** All TypeScript code. Cube logic. React components. Solver wrapper. Worker code.

**Key takeaways for this project:** TypeScript strict mode patterns, error handling, file organization, code review checklist. Use as a reference for "is this idiomatic?" questions.

### `testing-qa.md`

**Apply to:** Every milestone has tests. Mandatory reading before writing `__tests__/` files.

**Key takeaways for this project:** Unit test structure with Vitest, what to test vs what not to test, edge case patterns. The cube logic has clear invariants (R⁴ = identity etc.) that map perfectly to property-style tests.

**Note:** This skill was originally written for fintech context. Ignore the fintech-specific examples (payment flows, fraud detection). Apply the general testing principles.

### `api-design.md`

**Apply to:** Milestone 4 (Cloudflare Worker for AI tutor). Specifically the `/api/ask` endpoint.

**Key takeaways for this project:** Endpoint structure, request/response patterns, error handling, rate limiting. The AI tutor endpoint is small but should be clean.

**Note:** This skill was originally written for SaaS/fintech APIs. We don't need OAuth, API keys for users, multi-tenant concerns, or webhook architecture. Apply only the basic REST/JSON patterns.

### `ai-ml-integration.md`

**Apply to:** Milestone 4 (AI tutor implementation). Specifically prompt engineering, fallback handling, and the frustration detector stretch goal.

**Key takeaways for this project:** Prompt design patterns, system prompt structure, handling LLM failures gracefully, when to use AI vs rules. The frustration detector is a textbook "behavioral signal triggers AI intervention" pattern.

**Note:** This skill was originally written for fintech (fraud detection, churn prediction). The fintech examples don't apply. The general patterns for LLM integration do.

## Topics not covered by skills

For these, search current official documentation when needed:

- **react-three-fiber and drei** — https://r3f.docs.pmnd.rs/ and https://drei.docs.pmnd.rs/
- **GSAP scroll integration with r3f** — https://gsap.com/ and the `useScroll` pattern from drei (combine `gsap.timeline()` with `tl.seek(scroll.offset * tl.duration())` inside `useFrame`)
- **Cloudflare Workers AI** — https://developers.cloudflare.com/workers-ai/ — pay attention to the Llama 3.1 8B Instruct model card and the binding setup
- **Cloudflare Pages deployment** — the user already does this for their other project (Planvra) so the workflow is familiar to them; don't reinvent it
- **Kociemba algorithm details** — https://kociemba.org/cube.htm — only relevant if you need to understand why the parity checks in `validate.ts` work the way they do

## When in doubt

Ask the user. The user has explicitly said "no new dependencies without asking" and "stop and ask if a locked decision needs reopening". Apply the same principle to skill conflicts. If a skill suggests one approach and the project plan suggests another, ask which to follow before guessing.
