# Flowsensa — Claude Instructions

See `.ai/` for SDD artifacts.

- Design: `.ai/sdd/specs/001-product-requirements/design.md`
- Requirements: `.ai/sdd/specs/001-product-requirements/requirements.md`
- Tasks: `.ai/sdd/specs/001-product-requirements/tasks.md`
- Technical requirements map: `.ai/sdd/specs/001-product-requirements/technical-requirements-map.md`

## Key constraints

- **Never modify**: `src/domain/`, `src/fixtures/`, `src/schemas/`, `tests/domain.test.ts`
- **Never persist**: `openRouterConfig` to storage
- **Never use**: `Math.random()` in `demoProducer.ts`
- **Stack**: React 19, Vite 8, TypeScript ~6.0.2, no Tailwind
- **Test**: `npm test` (domain), `npm run test:e2e` (Playwright)
