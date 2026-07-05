# Flowsensa acceptance evidence

| Requirement | Evidence |
| --- | --- |
| Valid schema import | `tests/domain.test.ts` accepts all supplied events and primitives |
| Atomic invalid import | Unit and E2E tests assert event/field errors and preserved local data |
| Observed variants and graph facts | Domain tests cover variants, transitions, handoffs, repeats, exceptions, and outcomes |
| Confirmation and overrides | `tests/e2e/fixture-workflow.spec.ts` confirms a step with rationale and owner |
| Automation families | Domain and E2E tests assert deterministic/vibe-code and hybrid/prompt-family labels |
| Evidence and gaps | Domain test checks 16 factors, failure modes, and linked gaps |
| Deterministic analyst | Domain and E2E tests cover all six Flowsensa questions |
| Exports | Domain and E2E tests verify JSON round trip, Markdown, and Mermaid |
| No LocalCFO route | Narrow-layout E2E asserts that Resources is absent |
| Real producer integration | `tests/e2e/mnemosync-integration.spec.ts` downloads a real canonical Mnemosync export and imports it directly |
| Local privacy | E2E captures network requests and permits localhost only |
