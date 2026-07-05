# Flowsensa

Enterprise process-intelligence application. Discover, confirm, and engineer your operational workflows from observed event data.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Demo mode

Click **Load demo** or **Run demo activity** on the Data Sources page. No API key required. The Northstar showcase is a fictional organisation — no real data.

## AI Analyst (optional)

Flowsensa includes an optional AI chat layer powered by OpenRouter.

1. Get an API key at [openrouter.ai](https://openrouter.ai)
2. Open **Settings → OpenRouter**, paste your key, choose a model, and click **Save & Connect**
3. Keys are never persisted to storage or sent anywhere except OpenRouter

For private deployment, set `OPENROUTER_API_KEY` as an environment variable if you want to pre-configure the model server-side (not required for client-only use).

## NPM scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | TypeScript check + Vite build |
| `npm run lint` | oxlint |
| `npm test` | Vitest domain unit tests |
| `npm run test:e2e` | Playwright end-to-end tests |

## Architecture

All process data stays local (IndexedDB). No telemetry, no tracking. See `docs/architecture.md` and `.ai/sdd/` for full SDD artifacts.
