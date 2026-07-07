# FlowSensa

Local-first process intelligence for human, agent, and system work. FlowSensa turns telemetry logs into process maps, task insights, process risks, enhancement suggestions, and exportable evidence.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Demo Mode

Click **Begin demo** to load the synthetic creator/project workspace. No API key is required.

The sample workspace includes post research, drafting, review, coding, tests, deployment, handoffs, retries, and human/agent/system activity.

## Bring Your Own Telemetry Log

Mnemosync can sync telemetry into FlowSensa, but it is not required. You can import:

- FlowSensa JSON work-event collections
- BPMN or XML process models
- Process images for BYOK-assisted candidate extraction

For the event schema, examples, prompts, and open source tooling options, see [docs/telemetry-log-guide.md](docs/telemetry-log-guide.md).

At minimum, each event should identify:

- the case or workflow instance;
- the activity performed;
- the actor (`human`, `agent`, `system`, `service-account`, or `external`);
- optional tool/model context via `system.tool` and `system.model`;
- result status and truth state;
- provenance;
- optional practical resources such as token counts, human time, compute, storage, network, or financial cost.

Carbon, water, and energy/electricity resources are intentionally out of scope for this version.

## AI Insights And BYOK

The deterministic process-mining core works without a model key.

Optional AI features use named OpenAI-compatible LLM profiles:

1. Open **Settings -> LLM Profiles**.
2. Name the profile so you know which provider/model it represents.
3. Enter a base URL, model/deployment name, and API key.
4. Use **Test connection** before asking AI Insights questions.

Keys are kept in browser memory for the current session. They are not written to local storage, IndexedDB, exports, telemetry, logs, or the source bundle.

## Storage Posture

FlowSensa is local-first in the browser. Supabase-backed Mnemosync is useful for shared multi-agent telemetry, but FlowSensa should remain portable: JSON import/export is the escape hatch.

If you want a stricter local-sovereignty setup, keep your telemetry log in SQLite or PGlite and export FlowSensa-compatible JSON when you want process analysis. Supabase remains a practical private-cloud option because the data can be migrated to self-hosted Postgres later.

## NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | TypeScript check + Vite build |
| `npm run lint` | oxlint |
| `npm test` | Vitest domain unit tests |
| `npm run test:e2e` | Playwright end-to-end tests |

## Architecture

All workspace data stays local unless you explicitly sync from Mnemosync, import a file, invoke an LLM profile, or export a process map. See `docs/architecture.md` and `.ai/sdd/` for design artifacts.
