# Conventions Steering — Flowsensa

## Code Style

- **Language:** TypeScript (~6.0.2)
- **Lint:** oxlint — `npm run lint` (lints `src` and `tests`)
- **Naming:** camelCase for variables/functions, PascalCase for components, kebab-case for files

## Architecture Patterns

- **Domain logic separation:** `tests/domain.test.ts` suggests a domain layer separate from UI
- **Schema-driven:** AJV validates work events against a schema before processing
- **Export pipeline:** JSON, Markdown, Mermaid — three output formats from the same process graph

## Testing Rules

- Vitest for unit tests (`tests/domain.test.ts`)
- Playwright for E2E tests (`tests/` — verify test file locations)
- Lint covers both `src` and `tests` directories

## Accessibility / Security Rules

- No external requests at runtime (local-first)
- All data processing in browser
- Demo data must be visibly labeled as synthetic

## Workflow Rules

- `npm run lint` before commits
- `npm test` before merging (unit)
- `npm run test:e2e` for full verification
- `npm run build` verifies TypeScript compilation

## Open Questions

- `docs/` directory conventions?
- Event schema location and versioning strategy?
- Component structure (is there a `components/` or `domain/` directory pattern)?
