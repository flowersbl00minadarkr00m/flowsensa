# Tech Stack Steering — Flowsensa

## Runtime / Platform

- **Runtime:** Node.js (Vite dev server)
- **Deployment target:** Static host
- **Package manager:** npm

## Frontend

- **Framework:** React 19
- **Build:** Vite 8
- **Styling:** Tailwind CSS 4 (assumed — verify)
- **TypeScript:** ~6.0.2
- **Schema validation:** AJV + ajv-formats

## Testing / Verification

- Lint: `npm run lint` (oxlint src tests)
- Test: `npm test` (vitest run tests/domain.test.ts)
- E2E: `npm run test:e2e` (playwright test)
- Build: `npm run build` (tsc -b && vite build)
- Preview: `npm run preview`

## Dependencies

- `react`, `react-dom` — UI framework
- `ajv`, `ajv-formats` — JSON schema validation
- `@vitejs/plugin-react` — Vite React integration
- `oxlint` — linting
- `vitest`, `jsdom` — unit testing
- `@playwright/test` — E2E testing

## Constraints

- No server, no model key, no paid service, no external font
- All dependencies bundled at build time
- Demo mode with 66 synthetic events — application logic must work identically with real data

## Architectural Decisions

- **AJV for schema validation:** Work events must conform to a normalized schema before processing
- **Playwright for E2E:** Full browser testing, not just jsdom
- **Deterministic engine:** Process reconstruction is rules-based, not AI-inferred

## Open Questions

- Tailwind CSS 4 confirmed? (package.json doesn't list it explicitly — may use different styling)
- What is the event normalization schema? (AJV schemas location?)
