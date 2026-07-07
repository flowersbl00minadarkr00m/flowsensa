# Tasks: Resource Usage

> Requirements: @requirements.md
> Design: @design.md
> Status: Complete

## Requirement Coverage

| Requirement | Tasks | Notes |
|-------------|-------|-------|
| FR-001 | T1, T2 | Add view and navigation. |
| FR-002 | T1 | Aggregate actual telemetry. |
| FR-003 | T1, T2 | Separate actual/estimated/unknown labels. |
| FR-004 | T1, T2 | Summarize model/tool and missing coverage. |
| FR-005 | T2 | Drill down to existing event modal. |
| FR-006 | N/A | Could Have, deferred. |
| NFR-001 | T2 | Plain labels. |
| NFR-002 | T1 | Local deterministic module. |
| NFR-003 | T1 | Single-pass aggregation. |
| NFR-004 | T2 | Existing responsive table/card patterns. |

## Implementation Readiness Check

| Check | Status | Notes |
|-------|--------|-------|
| Must Have requirements have tasks | Pass | FR-001 through FR-004 covered. |
| Requirements are covered by design | Pass | See design mapping. |
| Critical Questions are answered | Pass | None blocking. |
| Tasks have dependencies, acceptance criteria, files, and verification | Pass | See tasks below. |
| Verification commands are known | Pass | `npm run lint`, `npm test`, `npm run build`, browser screenshot. |

## Implementation Slices

### MVP Slice

- **Goal:** Make token, cost, time, model/tool coverage visible from event telemetry.
- **User Stories:** US-001, US-002, US-003
- **Tasks:** T1, T2, T3
- **Independent validation:** Unit tests plus browser screenshot.

## Task T1: Resource aggregation

**Priority:** P0  
**Estimate:** 1h  
**Dependencies:** none  
**Covers:** FR-002, FR-003, FR-004, NFR-002, NFR-003

### Work
- [x] Add `src/domain/resourceUsage.ts`.
- [x] Aggregate resources by kind/unit/measurement class.
- [x] Aggregate by task, case, actor type, and model/tool.
- [x] Flag agent/model events missing resource telemetry.
- [x] Add unit coverage.

### Acceptance Criteria
- [x] Actual, estimated, unknown, and missing telemetry are distinct in output.
- [x] Model/tool rows include token and cost totals when present.

### Files
- `src/domain/resourceUsage.ts` - create
- `tests/domain.test.ts` - modify

### Verification
- [x] `npm test` passed: 19 tests.

## Task T2: Resource Usage UI

**Priority:** P0  
**Estimate:** 1h  
**Dependencies:** T1  
**Covers:** FR-001, FR-003, FR-004, FR-005, NFR-001, NFR-004

### Work
- [x] Add `src/modules/ResourceUsage.tsx`.
- [x] Add Resource Usage navigation route in `App.tsx`.
- [x] Render summary cards, model/tool coverage, task drivers, case totals, and missing telemetry.
- [x] Link rows to supporting event dialog.

### Acceptance Criteria
- [x] User can open Resource Usage from main navigation.
- [x] UI distinguishes actual, estimated, unknown, and missing values.
- [x] User can open an evidence event from resource rows.

### Files
- `src/modules/ResourceUsage.tsx` - create
- `src/App.tsx` - modify

### Verification
- [x] `npm run lint` passed.
- [x] Browser screenshot captured at `demo-previews/flowsensa-resource-usage-view.png`.

## Task T3: Strong synthetic sample labeling

**Priority:** P0  
**Estimate:** 30m  
**Dependencies:** none  
**Covers:** NFR-001, TD-002

### Work
- [x] Replace weak `sample data` header text with "Synthetic sample data loaded locally".
- [x] Add visible banner with "Clear sample and import your telemetry" action.
- [x] Keep sample data local and avoid implying shared production data.

### Acceptance Criteria
- [x] Synthetic sample state is obvious in the UI.
- [x] Import action is visible from the sample banner.

### Files
- `src/App.tsx` - modify
- `src/styles.css` or existing CSS file - modify if needed

### Verification
- [x] Browser screenshot captured at `demo-previews/flowsensa-resource-usage-sample-banner.png`.
