# Tasks: Operational Context Workspace

> Requirements: @requirements.md
> Design: @design.md
> Status: Approved

## Requirement Coverage

| Requirement | Tasks | Notes |
|-------------|-------|-------|
| FR-001 | T1 | Map-first workspace and Observe removal |
| FR-002 | T2 | Optional demo landing restyle |
| FR-003 | T3 | Process selector and metadata |
| FR-004 | T3, T4 | Process/task rename overlays |
| FR-005 | T4 | Task-level process intelligence panel |
| FR-006 | T5, T9 | JSON/BPMN/image import paths |
| FR-007 | T6 | Process-map export from map workspace |
| FR-008 | T8 | Process Enhancements module |
| FR-009 | T8 | OSSensa tool-search handoff payloads |
| FR-010 | T9 | AI Insights prompting |
| FR-011 | T10 | Provider-agnostic LLM profiles |
| FR-012 | T5, T9, T10 | Explicit local-first and model-call boundaries |
| FR-013 | T7 | Process Risks registry before Process Enhancements |
| NFR-001 | T1, T2, T7, T8, T11 | Concise operational UX |
| NFR-002 | T4, T5, T7, T8, T9 | Evidence and trust labeling |
| NFR-003 | T9, T10 | BYOK privacy/security |
| NFR-004 | T3, T4, T11 | Fast local switching and inspection |
| NFR-005 | T3, T4, T5, T6, T7, T9, T10, T11 | Keyboard/mobile checks |

## Implementation Readiness Check

| Check | Status | Notes |
|-------|--------|-------|
| Must Have requirements have tasks | Pass | FR-001, FR-003 through FR-008, FR-010 through FR-013 covered |
| Requirements are covered by design | Pass | See design requirements mapping and TD-001 through TD-005 |
| Critical Questions are answered | Pass | Q-001 and Q-002 answered in approved requirements |
| Tasks have dependencies, acceptance criteria, files, and verification | Pass | Each task below includes dependencies/files/checks |
| Verification commands are known or marked manual/N/A | Pass | `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e`, browser screenshots |

## Implementation Slices

### MVP Slice: Map-First Operational Workspace

- **Goal:** Replace Observe-first app flow with a process-map-first workspace users can inspect, rename, and export.
- **User Stories:** US-001, US-002, US-004, US-005
- **Tasks:** T1, T3, T4, T6
- **Independent validation:** App opens to Process Map with process selector, task insight details, rename affordances, and export action.

### Enhancement Slice: Recommendations, Imports, AI, BYOK

- **Goal:** Add stronger Process Enhancements, import pathways, AI Insights prompting, and provider-agnostic BYOK profiles.
- **User Stories:** US-003, US-006, US-007, US-008
- **Tasks:** T2, T5, T7, T8, T9, T10, T11
- **Independent validation:** JSON/BPMN/image import UI is visible, enhancements and OSSensa handoff are useful, AI Insights supports custom prompt, BYOK settings are provider-neutral.

## Task T1: Make Process Map The Default Workspace

**Priority:** P0
**Estimate:** 1h
**Dependencies:** none
**Covers:** FR-001, NFR-001

### Work
- [x] Change default `view` from `overview` to `explorer` when workspace data exists.
- [x] Remove Observe from core navigation and bottom tabs.
- [x] Rename map labels to `Process Map` / `Gate Checks` where visible.
- [x] Ensure existing overview module is either removed from nav or retained only as non-primary/internal code.
- [x] Update E2E selectors that expect Observe/Overview.

### Acceptance Criteria
- [x] App opens directly to process mapping/gate checks with sample data.
- [x] Sidebar/mobile primary nav starts with Process Map, not Observe.
- [x] No visible "Observe" workspace label remains in the core app navigation.

### Files
- `src/App.tsx` - modify
- `tests/e2e/fixture-workflow.spec.ts` - modify
- `src/styles.css` - modify if layout needs adjustment

### Verification
- [x] `npm run lint`
- [x] `npm run test:e2e`
- [x] Manual desktop/mobile screenshot of first workspace screen

## Task T2: Restyle Optional Demo Landing

**Priority:** P1
**Estimate:** 1.5h
**Dependencies:** T1
**Covers:** FR-002, NFR-001

### Work
- [x] Rework no-data `ImportPanel` copy to short product-grade landing copy.
- [x] Add a light grey/purple flow-line visual using CSS/HTML, avoiding generated SVG illustration bloat.
- [x] Make `Begin demo` the primary action and import secondary.
- [x] Preserve invalid fixture and Mnemosync controls where still needed, but make them secondary.

### Acceptance Criteria
- [x] No-data screen feels like a concise demo entry, not an explanatory app page.
- [x] Primary action begins the demo/sample workspace.
- [x] Existing JSON import path remains available.

### Files
- `src/components/ImportPanel.tsx` - modify
- `src/styles.css` - modify
- `tests/e2e/fixture-workflow.spec.ts` - adjust as needed

### Verification
- [x] `npm run lint`
- [x] `npm run test:e2e`
- [x] Manual screenshot after deleting local data or using fresh browser state

## Task T3: Add Process Metadata, Selector, And Process Rename

**Priority:** P0
**Estimate:** 2h
**Dependencies:** T1
**Covers:** FR-003, FR-004, NFR-004, NFR-005

### Work
- [x] Add `ProcessMetadata` type and helpers for default metadata generation.
- [x] Add app state for active process metadata and selected process ID.
- [x] Add process selector UI to the map workspace/header.
- [x] Add process rename control that changes display name without mutating source events.
- [x] Ensure metadata initializes for existing local workspaces.

### Acceptance Criteria
- [x] A process selector is visible in the map workspace.
- [x] User can rename the process and see the updated display name.
- [x] Original event/provenance data remains unchanged.
- [x] One-process sample still works without awkward empty states.

### Files
- `src/domain/types.ts` - modify
- `src/domain/processMetadata.ts` - create
- `src/App.tsx` - modify
- `src/modules/ProcessExplorer.tsx` - modify
- `tests/domain.test.ts` - modify
- `tests/e2e/fixture-workflow.spec.ts` - modify

### Verification
- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run test:e2e`

## Task T4: Add Task Rename And Task-Level Process Intelligence

**Priority:** P0
**Estimate:** 3h
**Dependencies:** T3
**Covers:** FR-004, FR-005, NFR-002, NFR-004, NFR-005

### Work
- [x] Add `TaskInsight` type and deterministic insight calculation helper.
- [x] Calculate event count, case count, actor mix, duration, exceptions, retries, upstream/downstream transitions, and insufficient telemetry notices.
- [x] Add task rename control in selected-node/task detail panel.
- [x] Display original source label and evidence links alongside display name.
- [x] Make empty/structure-only telemetry states explicit.

### Acceptance Criteria
- [x] Clicking a graph task opens task details with telemetry-backed insights.
- [x] User can rename a task while original label remains visible as provenance.
- [x] Insights identify insufficient telemetry instead of inventing values.
- [x] Task details are usable on mobile.

### Files
- `src/domain/processInsights.ts` - create
- `src/domain/types.ts` - modify
- `src/modules/ProcessExplorer.tsx` - modify
- `src/components/EvidenceLinks.tsx` - reuse/modify if needed
- `src/styles.css` - modify
- `tests/domain.test.ts` - modify
- `tests/e2e/fixture-workflow.spec.ts` - modify

### Verification
- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run test:e2e`
- [x] Manual task-detail screenshot desktop/mobile

## Task T5: Extend Imports For JSON, BPMN, And Image Candidate Maps

**Priority:** P0
**Estimate:** 4h
**Dependencies:** T3, T10 for image extraction call path
**Covers:** FR-006, FR-012, NFR-002, NFR-003, NFR-005

### Work
- [x] Keep existing normalized JSON import path working.
- [x] Add file accept support for `.json`, `.bpmn`, `.xml`, and image MIME types.
- [x] Implement BPMN XML parser using `DOMParser` for tasks/events/gateways and sequence flows.
- [x] Convert BPMN structure into a candidate graph/process metadata with insufficient telemetry notices.
- [x] Add image import flow that requires a selected LLM profile and marks output AI-assisted/unconfirmed.
- [x] Prevent silent overwrite by confirming replacement when active workspace exists.
- [x] Surface recoverable errors for invalid BPMN, unsupported image state, or malformed model output.

### Acceptance Criteria
- [x] JSON import behavior remains unchanged.
- [x] BPMN import creates a visible candidate process map.
- [x] Image import clearly requires/configures BYOK-assisted extraction and never marks output trusted automatically.
- [x] Invalid import preserves the current workspace.

### Files
- `src/domain/bpmnImport.ts` - create
- `src/domain/imageProcessImport.ts` - create
- `src/domain/types.ts` - modify
- `src/App.tsx` - modify
- `src/components/ImportPanel.tsx` - modify
- `src/modules/DataSources.tsx` - modify
- `tests/domain.test.ts` - modify
- `tests/e2e/fixture-workflow.spec.ts` - modify

### Verification
- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run test:e2e`
- [x] Manual BPMN import check with a small sample file

## Task T6: Add Process Map Export From Map Workspace

**Priority:** P1
**Estimate:** 1.5h
**Dependencies:** T3, T4
**Covers:** FR-007, NFR-005

### Work
- [x] Add map export control to Process Map workspace.
- [x] Export process name, task display names, original labels, transitions, confidence, trust state, evidence notes, and provenance-safe metadata.
- [x] Offer at least JSON and Mermaid/Markdown using existing export helpers where possible.
- [x] Label unconfirmed/candidate exports clearly.

### Acceptance Criteria
- [x] User can export the visible process map from map workspace.
- [x] Export includes display names and provenance-safe original labels.
- [x] Unconfirmed maps carry confidence/trust notes.

### Files
- `src/domain/exports.ts` - modify
- `src/modules/ProcessExplorer.tsx` - modify
- `src/App.tsx` - modify if export state is owned there
- `tests/domain.test.ts` - modify
- `tests/e2e/fixture-workflow.spec.ts` - modify

### Verification
- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run test:e2e`

## Task T7: Add Process Risks Registry

**Priority:** P0
**Estimate:** 2.5h
**Dependencies:** T3, T4, T10 for optional LLM enrichment
**Covers:** FR-013, NFR-002, NFR-005

### Work
- [x] Add `ProcessRisk` type and deterministic risk generation helper.
- [x] Add `Process Risks` navigation item before `Process Enhancements`.
- [x] Build risk table using selected process and task insights.
- [x] Present columns: `Process`, `Task`, `Risk Identified`, `Risk Mitigation`.
- [x] Add source/severity/evidence affordances without cluttering the required columns.
- [x] Add optional LLM enrichment action when an LLM profile is configured.
- [x] Keep deterministic and AI-assisted risks visually distinct.

### Acceptance Criteria
- [x] `Process Risks` appears before `Process Enhancements`.
- [x] Risk rows update based on the selected process.
- [x] Risk table uses the requested four-column structure.
- [x] Risks and mitigations are specific to telemetry or selected-process context.
- [x] Connected LLM profile can produce deeper risk insight only after explicit user action.

### Files
- `src/domain/types.ts` - modify
- `src/domain/processRisks.ts` - create
- `src/modules/ProcessRisks.tsx` - create
- `src/App.tsx` - modify
- `src/styles.css` - modify
- `tests/domain.test.ts` - modify
- `tests/e2e/fixture-workflow.spec.ts` - modify

### Verification
- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run test:e2e`
- [x] Manual Process Risks screenshot desktop/mobile

## Task T8: Rename And Strengthen Process Enhancements

**Priority:** P0
**Estimate:** 2.5h
**Dependencies:** T4, T7
**Covers:** FR-008, FR-009, NFR-001, NFR-002

### Work
- [x] Rename navigation/module labels from Improve/Intervention Queue to Process Enhancements.
- [x] Rewrite recommendation cards around enhancement, expected benefit, controls, confidence, implementation path, and evidence basis.
- [x] Add tool suggestion block per recommendation with OSSensa search query/handoff action.
- [x] Keep deterministic/model-assisted boundaries clear.
- [x] Update E2E selectors.

### Acceptance Criteria
- [x] Module appears as `Process Enhancements`.
- [x] Module appears after `Process Risks`.
- [x] Recommendations feel concrete and action-oriented, not generic class labels.
- [x] Tool suggestions provide a user-triggered OSSensa search/handoff payload.
- [x] Evidence and confidence remain visible.

### Files
- `src/modules/ImprovementOpportunities.tsx` - modify
- `src/domain/recommendations.ts` - modify if needed
- `src/App.tsx` - modify
- `src/styles.css` - modify
- `tests/e2e/fixture-workflow.spec.ts` - modify

### Verification
- [x] `npm run lint`
- [x] `npm run test:e2e`
- [x] Manual desktop/mobile screenshots

## Task T9: Rename AI Analyst To AI Insights And Add Prompting

**Priority:** P0
**Estimate:** 3h
**Dependencies:** T4, T10
**Covers:** FR-010, FR-012, NFR-002, NFR-003, NFR-005

### Work
- [x] Rename module/navigation from AI Analyst to AI Insights.
- [x] Add custom prompt input in addition to suggested prompts.
- [x] Replace suggested prompts with local/individual process-intelligence questions.
- [x] Build prompt context from selected process/task insights, graph, recommendations, KPIs, and evidence summaries.
- [x] Separate deterministic facts, AI interpretation, hypotheses, and next checks in UI.
- [x] Disable model call or show deterministic-only response when no LLM profile is configured.

### Acceptance Criteria
- [x] AI Insights supports custom prompting.
- [x] Suggested prompts are high-value process-intelligence questions for local work.
- [x] Responses maintain deterministic/AI/hypothesis boundaries.
- [x] No model key is required for deterministic sections.

### Files
- `src/modules/AIAnalyst.tsx` - modify or rename
- `src/domain/analyst.ts` - modify
- `src/domain/llmProfiles.ts` - create/use
- `src/App.tsx` - modify
- `src/styles.css` - modify
- `tests/domain.test.ts` - modify if deterministic prompt helpers added
- `tests/e2e/fixture-workflow.spec.ts` - modify

### Verification
- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run test:e2e`
- [x] Manual AI Insights screenshot desktop/mobile

## Task T10: Replace OpenRouter-Only BYOK With Named LLM Profiles

**Priority:** P0
**Estimate:** 3h
**Dependencies:** none
**Covers:** FR-011, FR-012, NFR-003, NFR-005

### Work
- [x] Replace `OpenRouterConfig` with `LLMProfile`.
- [x] Add profile name, base URL, model/deployment ID, and API key fields.
- [x] Generalize OpenRouter client into OpenAI-compatible chat client.
- [x] Update Settings UI copy to remove OpenRouter-only framing.
- [x] Keep keys in React/session state only; do not persist or export keys.
- [x] Explain what context gets sent to the selected model.

### Acceptance Criteria
- [x] Settings shows provider-neutral named LLM profile setup.
- [x] User can name a profile and configure key/base URL/model.
- [x] OpenRouter remains possible by entering its OpenAI-compatible base URL/model, but is not the only branded path.
- [x] No key is written to persistent local storage or exports.

### Files
- `src/domain/types.ts` - modify
- `src/lib/openrouterClient.ts` - modify/rename or wrap
- `src/domain/llmProfiles.ts` - create
- `src/modules/SettingsModule.tsx` - modify
- `src/App.tsx` - modify
- `tests/e2e/fixture-workflow.spec.ts` - modify

### Verification
- [x] `npm run lint`
- [x] `npm run test:e2e`
- [x] Manual BYOK screenshot desktop/mobile

## Task T11: Final Verification, Screenshots, And SDD Review Notes

**Priority:** P0
**Estimate:** 1.5h
**Dependencies:** T1 through T10
**Covers:** NFR-001, NFR-002, NFR-004, NFR-005

### Work
- [x] Run full verification: lint, unit tests, build, E2E.
- [x] Capture desktop and mobile screenshots for Process Map, Process Risks, Process Enhancements, AI Insights, and LLM Profiles.
- [x] Check for stale labels: Observe, OpenRouter-only BYOK, Intervention Queue, AI Analyst.
- [x] Update 002 task checkboxes and status evidence after successful implementation.
- [x] Refresh project registry and shared brain with durable outcome.

### Acceptance Criteria
- [x] Verification commands pass or failures are clearly reported.
- [x] Screenshots reflect the approved 002 redesign.
- [x] No stale core labels remain in visible UI.
- [x] SDD status is advanced only after fresh verification evidence.

### Files
- `.ai/sdd/specs/002-operational-context-workspace/tasks.md` - update after execution
- `.ai/sdd/specs/002-operational-context-workspace/.status` - update after execution
- Tests and source files touched by T1 through T10

### Verification
- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run build`
- [x] `npm run test:e2e`
- [x] Browser screenshots desktop/mobile
