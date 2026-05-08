# Idiotkuben

Lär dig lösa en Rubiks kub — ett drag i taget. A web app that teaches the layer-by-layer solving method using a 3D interactive cube, step-by-step guided mode, and an AI tutor powered by Cloudflare Workers AI.

Live: **https://idiotkuben.pages.dev**

---

## Tech stack

- Vite + React 19 + TypeScript (strict mode)
- Tailwind CSS v4
- three.js + @react-three/fiber + @react-three/drei (3D rendering)
- cubejs (Kociemba two-phase solver)
- Cloudflare Pages (frontend) + Cloudflare Workers AI (AI tutor)
- Vitest (unit tests)

## Run locally

```bash
npm install
npm run dev       # dev server at localhost:5173
npm test          # run 32 unit tests
npm run build     # production build to dist/
```

## AI tutor (optional)

The Worker in `cloudflare-worker/` proxies requests to Llama 3.1 8B Instruct via Cloudflare Workers AI. To run it locally:

```bash
cd cloudflare-worker
npm install
npx wrangler dev
```

Set `VITE_TUTOR_URL` in a `.env` file at the project root to connect the frontend to the running Worker. The app works without this variable — the tutor panel simply doesn't appear.

## Deploy

```bash
# Frontend
npm run build
npx wrangler pages deploy dist --project-name=idiotkuben

# Worker
cd cloudflare-worker
npx wrangler deploy
```
