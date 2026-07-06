# Tasks: Flowsensa Product Redesign

> Status: Approved
> SDD Gate: tasks:approved
> Evidence date: 2026-07-05

## Implementation Slices

### Slice A — Visual system + ten-module shell (T01–T03)
### Slice B — Core modules: Overview, Explorer, Activity Log (T04–T07)
### Slice C — Analysis modules: Variants, Performance, Improvements (T08–T10)
### Slice D — Operational modules: Alerts, AI Analyst, Data Sources (T11–T13)
### Slice E — Settings, BYOK, live demo chain (T14–T16)
### Slice F — Responsive + accessibility + verification (T17–T19)

---

## Tasks

### T01 · Design token system + CSS refactor
**Priority:** P0 | **Estimate:** 1h | **Dependencies:** none

**Work:**
- [ ] Create `src/styles/tokens.css` with full ocean-blue/yellow token set from design.md
- [ ] Create `src/styles/layout.css` with app shell, sidebar, workspace layout
- [ ] Create `src/styles/components.css` with shared component styles
- [ ] Update `src/styles.css` to import the three new files (keep as entry point)
- [ ] Replace all hard-coded hex values from old styles with new tokens

**Acceptance criteria:**
- All tokens defined; no magic hex values outside `tokens.css`
- `npm run build` passes
- Visual: dark ocean-blue background with yellow accent visible in browser

**Files:** `src/styles/tokens.css`, `src/styles/layout.css`, `src/styles/components.css`, `src/styles.css`
**Verification:** `npm run build && npm run lint`

---

### T02 · Ten-module navigation shell
**Priority:** P0 | **Estimate:** 2h | **Dependencies:** T01

**Work:**
- [ ] Extend `View` type in `App.tsx` to 10 modules: `overview | explorer | variants | activity | performance | improvements | alerts | analyst | sources | settings`
- [ ] Replace NAV_ITEMS array with 10-module list (enterprise names, design.md M1–M10)
- [ ] Add sidebar collapse toggle (icon-only mode at 1024–1200px)
- [ ] Add mobile hamburger top nav bar (hidden sidebar triggers, `<nav>` drawer)
- [ ] Add bottom tab bar for mobile (5 primary modules + overflow)
- [ ] Add skip-to-main link for accessibility

**Acceptance criteria:**
- All 10 modules accessible by keyboard tab + Enter from nav
- Mobile breakpoint shows hamburger + bottom tabs correctly
- No overflow or clipping at 375px viewport width

**Files:** `src/App.tsx`, `src/styles/layout.css`
**Verification:** `npm run lint`, manual responsive check at 375px / 1024px / 1440px

---

### T03 · Module stub components
**Priority:** P0 | **Estimate:** 1h | **Dependencies:** T02

**Work:**
- [ ] Create `src/modules/OperationalOverview.tsx` — stub with heading + "coming soon" placeholder
- [ ] Create `src/modules/ProcessExplorer.tsx` — wraps existing ObserveView + ConfirmView
- [ ] Create `src/modules/ProcessVariants.tsx` — stub
- [ ] Create `src/modules/ActivityLog.tsx` — stub with empty log state
- [ ] Create `src/modules/PerformanceAnalysis.tsx` — stub
- [ ] Create `src/modules/ImprovementOpportunities.tsx` — wraps existing EngineerView
- [ ] Create `src/modules/AlertsModule.tsx` — stub
- [ ] Create `src/modules/AIAnalyst.tsx` — wraps existing AnalystView
- [ ] Create `src/modules/DataSources.tsx` — wraps existing ImportPanel
- [ ] Create `src/modules/SettingsModule.tsx` — wraps existing RegistryView + ExportView
- [ ] Wire all 10 into App.tsx render switch

**Acceptance criteria:**
- All views render without console errors
- Legacy functionality (import, observe, confirm, engineer, analyst, registry, export) still works

**Files:** `src/modules/*.tsx`, `src/App.tsx`
**Verification:** `npm run test`, `npm run build`

---

### T04 · Operational Overview module
**Priority:** P1 | **Estimate:** 2h | **Dependencies:** T03, T05 (kpiEngine)

**Work:**
- [ ] KPI strip: Cases, Median Throughput Time, Exception Rate, Automation Coverage
- [ ] Process health gauge bar (confirmed/total nodes)
- [ ] Top-3 improvement opportunities list (from `recommendations`)
- [ ] Alert feed (from `alerts` state) — linked to Alerts module
- [ ] Last-sync status chip + manual refresh button

**Acceptance criteria:**
- All 4 KPIs computed correctly from `events` and `graph`
- Health bar reflects confirmed node percentage
- No layout overflow at any breakpoint

**Files:** `src/modules/OperationalOverview.tsx`, `src/lib/kpiEngine.ts`
**Verification:** `npm run test`, visual check

---

### T05 · KPI engine + alert engine
**Priority:** P1 | **Estimate:** 2h | **Dependencies:** T03

**Work:**
- [ ] Create `src/lib/kpiEngine.ts`: `calculateKPIs(events, graph): KPISnapshot` pure function
  - metrics: caseCount, medianThroughputMs, exceptionRate, reworkRate, automationCoverageRate
- [ ] Create `src/lib/alertEngine.ts`: `evaluateAlerts(kpis, rules): Alert[]` pure function
  - rule: exceptionRate > 0.20 → critical
  - rule: reworkRate > 0.10 → warning
- [ ] Add `KPISnapshot`, `Alert`, `AlertRule` types to `src/domain/types.ts`
- [ ] Wire `useMemo` in App.tsx: `kpis = calculateKPIs(events, graph)` and `alerts = evaluateAlerts(kpis, defaultRules)`

**Acceptance criteria:**
- `calculateKPIs` returns correct values for showcase fixture
- `evaluateAlerts` returns critical alert when exceptionRate is 0.25
- Existing `npm test` (domain.test.ts) still passes

**Files:** `src/lib/kpiEngine.ts`, `src/lib/alertEngine.ts`, `src/domain/types.ts`, `src/App.tsx`
**Verification:** `npm run test`, `npm run lint`

---

### T06 · Process Explorer with node/edge interactivity
**Priority:** P1 | **Estimate:** 3h | **Dependencies:** T03

**Work:**
- [ ] Move/extend graph SVG canvas into ProcessExplorer module
- [ ] Each node `<g>`: add `tabIndex={0}`, `role="button"`, `aria-label="[label], [freq] occurrences"`, `onKeyDown` (Enter/Space triggers selection), `onTouchEnd` (same as onClick)
- [ ] Hover CSS: node scale 1.04 + border glow `--accent` (CSS transition 150ms)
- [ ] Focus CSS: 2px outline offset `--accent`
- [ ] Selected state: node border `--accent`, right detail panel slides in
- [ ] Right panel: label, frequency, avg duration, actor IDs, truth state, evidence IDs, cases, links to Activity Log
- [ ] Edge hover/focus: highlight + frequency tooltip
- [ ] ConfirmView accessible as subpanel within ProcessExplorer

**Acceptance criteria:**
- All nodes reachable and activatable by keyboard
- Touch tap opens detail panel on mobile
- Detail panel shows correct data from the selected node's events
- Escape closes detail panel

**Files:** `src/modules/ProcessExplorer.tsx`, `src/styles/components.css`
**Verification:** `npm run lint`, manual keyboard + touch check

---

### T07 · Activity Log module
**Priority:** P1 | **Estimate:** 2h | **Dependencies:** T03

**Work:**
- [ ] Add `activityLog: ActivityLogEntry[]` state to App.tsx (max 500 entries, prepend new)
- [ ] Create `ActivityLogEntry` type: `{ eventId, caseId, actorType, actorId, activityLabel, resultStatus, truthState, sourceRef, ingestedAt, isDemo: boolean }`
- [ ] Populate initial log from imported `events`
- [ ] ActivityLog module: table with filter bar (case ID, actor type, result, date range)
- [ ] Row click → opens existing EventDialog
- [ ] Demo entries get "Demo" badge
- [ ] New entries animate in (CSS `@keyframes slideDown`)
- [ ] Pause/resume scroll lock button

**Acceptance criteria:**
- Log shows all events from current workspace
- Filters narrow results correctly
- New live-demo events appear without page refresh
- Badge visible on demo entries

**Files:** `src/modules/ActivityLog.tsx`, `src/App.tsx`, `src/domain/types.ts`
**Verification:** `npm run test`, `npm run lint`

---

### T08 · Process Variants module
**Priority:** P2 | **Estimate:** 1.5h | **Dependencies:** T03

**Work:**
- [ ] Table: variant ID, case count, path steps (node labels joined), exception %, outcome %, median duration
- [ ] Row click → expands to show full step sequence + linked activity log IDs
- [ ] Mobile: card per variant with labeled rows
- [ ] Link variant case IDs to ActivityLog filter

**Acceptance criteria:**
- Table renders all variants from showcase fixture
- Expanded row shows correct step sequence
- Mobile card layout matches desktop data (no missing fields)

**Files:** `src/modules/ProcessVariants.tsx`
**Verification:** `npm run lint`, visual check at 375px

---

### T09 · Performance Analysis module
**Priority:** P2 | **Estimate:** 2h | **Dependencies:** T05

**Work:**
- [ ] Period selector: Last 7d / 30d / Custom (filter events by `timestamp`)
- [ ] KPI sparkline grid using SVG paths (no external chart lib)
- [ ] Bottleneck table: top-5 nodes by average wait time + frequency rank
- [ ] Compare-periods: show current vs prior period delta for each KPI

**Acceptance criteria:**
- Period selector changes KPI values (showcase data spans multiple days)
- Bottleneck table shows 5 nodes ranked correctly
- No chart library import added to package.json

**Files:** `src/modules/PerformanceAnalysis.tsx`
**Verification:** `npm run build`, `npm run lint`

---

### T10 · Improvement Opportunities module
**Priority:** P1 | **Estimate:** 2h | **Dependencies:** T03

**Work:**
- [ ] Extend existing EngineerView into ImprovementOpportunities module
- [ ] Use Henry's approved family labels: Automation / LLM / Hybrid / Keep Manual
- [ ] Per-recommendation: "Generate brief" button → downloads family-specific brief text
- [ ] Per-recommendation: "Track in Mnemosync" CTA (opens clipboard copy modal)
- [ ] Filter bar: by family, by confidence level
- [ ] Confidence bar rendered per recommendation

**Acceptance criteria:**
- "Generate brief" produces non-empty downloadable text for each family
- Family labels use approved names from D-002
- Filter by family reduces visible recommendations correctly

**Files:** `src/modules/ImprovementOpportunities.tsx`
**Verification:** `npm run test`, `npm run lint`

---

### T11 · Alerts module
**Priority:** P2 | **Estimate:** 1.5h | **Dependencies:** T05

**Work:**
- [ ] Alert list: severity chip, rule description, triggered value, timestamp
- [ ] Per-alert actions: Acknowledge / Mute / Resolve (managed in local state)
- [ ] Alert history tab (resolved/muted entries)
- [ ] Alert rule configuration panel (threshold inputs per rule)

**Acceptance criteria:**
- Alerts generated by alertEngine appear in list
- Acknowledge/Resolve update alert status in UI
- History tab shows prior alert lifecycle

**Files:** `src/modules/AlertsModule.tsx`, `src/App.tsx`
**Verification:** `npm run lint`, manual check with high exception-rate fixture

---

### T12 · AI Analyst module + OpenRouter client
**Priority:** P2 | **Estimate:** 3h | **Dependencies:** T14 (BYOK settings)

**Work:**
- [ ] Create `src/lib/openrouterClient.ts`:
  - `sendAnalystQuery(key, model, context): Promise<string>` — streams or returns full response
  - Never logs key; key passed per-call only
  - Returns structured response with advisory label
- [ ] AI Analyst module: chat interface, conversation history in local state
- [ ] Context strip: shows what KPI snapshot + event IDs are bound
- [ ] Graceful degraded state when no key: shows deterministic-only summary panels
- [ ] "Regenerate" + "Clear conversation" controls
- [ ] All AI responses labeled: "Advisory — AI interpretation, not confirmed fact"

**Acceptance criteria:**
- When no key: module renders without errors, shows deterministic panels
- When key configured: sends request to OpenRouter, displays response with advisory label
- Key is never visible in component HTML or console output

**Files:** `src/lib/openrouterClient.ts`, `src/modules/AIAnalyst.tsx`
**Verification:** `npm run test`, `npm run lint`, manual BYOK connection test

---

### T13 · Data Sources module + demo reset
**Priority:** P1 | **Estimate:** 1.5h | **Dependencies:** T03, T16

**Work:**
- [ ] Source list: name, type, last sync, health chip, event count
- [ ] "Sync now" stub (shows "Automatic sync requires Mnemosync integration — use Import" for Phase 2)
- [ ] Manual file import retained (same import button)
- [ ] Demo source entry: "Northstar Showcase" + run demo button + reset button
- [ ] Cursor display: current ingestion cursor (event count + last event timestamp)

**Acceptance criteria:**
- Demo source entry visible
- Reset demo removes `"live-demo"` tagged events and re-renders graph
- Manual import still works

**Files:** `src/modules/DataSources.tsx`
**Verification:** `npm run test`, `npm run lint`

---

### T14 · Settings module + OpenRouter BYOK UI
**Priority:** P1 | **Estimate:** 2h | **Dependencies:** T03

**Work:**
- [ ] Settings module: 4 tabs — OpenRouter / Registry / Export / Workspace
- [ ] OpenRouter tab:
  - `<input type="password">` with show/hide toggle
  - Model selector dropdown (hardcoded list + default `openai/gpt-5.5`)
  - Test connection button → calls OpenRouter with minimal request
  - Context review expandable panel (shows bounded JSON template)
  - Disconnect button → clears key from React state
  - Status chip: "Connected · model-name" or "Not configured"
- [ ] Add `openRouterConfig: { key: string; model: string } | null` to App.tsx state (never persisted)
- [ ] Registry tab: existing RegistryView
- [ ] Export tab: existing ExportView
- [ ] Workspace tab: clear/delete actions

**Acceptance criteria:**
- Key entry masked; never visible in DOM after submit
- Test connection shows success or error with no key leak in error message
- Disconnect clears config from state
- Status chip updates correctly

**Files:** `src/modules/SettingsModule.tsx`, `src/App.tsx`, `src/domain/types.ts`
**Verification:** `npm run lint`, manual BYOK test

---

### T15 · Live demo event chain
**Priority:** P1 | **Estimate:** 2.5h | **Dependencies:** T07, T13

**Work:**
- [ ] Create `src/lib/demoProducer.ts`: 4 demo activity generators
  - `emitPostCreated()`, `emitCodeCommit()`, `emitReviewCompleted()`, `emitPostPublished()`
  - Each returns a valid `WorkEvent` with tag `["showcase-demo", "live-demo"]`
  - Deterministic field generation (no Math.random for IDs — use counter-based)
- [ ] Wire "Run demo activity" button in DataSources to `emitPostCreated()` (cycling through 4 types)
- [ ] Demo event routes through `importPayload()` ingestion path (validation + dedup + reconstruction)
- [ ] `activityLog` receives new entry → animate in
- [ ] Affected process nodes flash: CSS class `node--updated` added for 1s then removed
- [ ] Toast notification: "Demo event ingested: EV-XXXX"
- [ ] Demo reset: filter events by `"live-demo"` tag, re-run reconstruction

**Acceptance criteria:**
- Each demo event passes AJV schema validation
- Activity Log shows new entry within 100ms of button click
- Only affected graph nodes animate (unaffected nodes do not change)
- Reset removes exactly all `"live-demo"` events and restores prior graph state
- Toast shows stable event ID

**Files:** `src/lib/demoProducer.ts`, `src/modules/DataSources.tsx`, `src/App.tsx`
**Verification:** `npm run test` (add unit tests for demoProducer), `npm run test:e2e`

---

### T16 · Demo event E2E test
**Priority:** P1 | **Estimate:** 1h | **Dependencies:** T15

**Work:**
- [ ] Add Playwright test: load showcase, click "Run demo activity", verify ActivityLog row appears, verify toast shown
- [ ] Add Playwright test: click reset, verify demo rows removed from Activity Log

**Acceptance criteria:**
- Both E2E tests pass with exit code 0

**Files:** `tests/demo-chain.spec.ts`
**Verification:** `npm run test:e2e`

---

### T17 · Responsive layout verification + fixes
**Priority:** P1 | **Estimate:** 2h | **Dependencies:** T01–T16

**Work:**
- [ ] Audit all 10 modules at 375px, 768px, 1024px, 1440px
- [ ] Fix any text overflow (min-width:0, overflow:hidden, text-overflow:ellipsis)
- [ ] Fix any floating actions — anchor all to section headers
- [ ] Verify process graph horizontal scroll on mobile
- [ ] Verify table → card transformation in ProcessVariants and alerts
- [ ] Add desktop + mobile screenshots to `docs/screenshots/`

**Acceptance criteria:**
- No horizontal scroll on page at 375px except SVG canvas (intentional)
- All 10 modules render completely at 375px
- No text clipped without ellipsis

**Files:** `src/styles/*.css`, `docs/screenshots/`
**Verification:** Playwright screenshot tests at 375px and 1440px

---

### T18 · Accessibility audit + fixes
**Priority:** P1 | **Estimate:** 1.5h | **Dependencies:** T17

**Work:**
- [ ] Verify all interactive elements have `:hover`, `:focus-visible`, and `:active` states
- [ ] Verify all `<img>` and `<svg>` have `alt` or `aria-label`
- [ ] Verify color contrast: `--text` on `--bg` ≥ 4.5:1; `--text-muted` on `--bg` ≥ 3:1 (use dev tools)
- [ ] Verify keyboard flow through all 10 modules
- [ ] Verify touch alternatives for all hover-only interactions (process nodes)
- [ ] Add `aria-live="polite"` region for toast notifications and Activity Log

**Acceptance criteria:**
- No WCAG 2.2 AA failures on core workflows
- Keyboard-only user can complete import → observe → recommendations → export flow

**Files:** `src/styles/components.css`, various module files
**Verification:** `npm run lint`, manual keyboard audit

---

### T19 · Final build, lint, tests, deployment prep
**Priority:** P0 | **Estimate:** 1h | **Dependencies:** T01–T18

**Work:**
- [ ] `npm run lint` — zero errors
- [ ] `npm test` — all unit tests pass
- [ ] `npm run test:e2e` — all Playwright tests pass
- [ ] `npm run build` — exit code 0, no TypeScript errors
- [ ] Verify `dist/` is a deployable static bundle
- [ ] Create/update `README.md` with setup instructions and environment variable docs
- [ ] Create `AGENTS.md` and `CLAUDE.md` in project root pointing to `.ai/`

**Acceptance criteria:**
- All four verification commands exit 0
- `dist/index.html` loads in browser from `file://`

**Files:** `README.md`, `AGENTS.md`, `CLAUDE.md`
**Verification:** `npm run lint && npm test && npm run test:e2e && npm run build`

---

### T20 · Closed-loop recommendation execution pattern
**Priority:** P1 | **Estimate:** 1h | **Dependencies:** T10

**Work:**
- [ ] Fix `loopConfigFor()` to receive real events instead of empty array
- [ ] Verify `executionPatternFor()` selects `"bounded-loop"` when: objective evaluator exists, feedback is quick, activity is low-risk/reversible, no exceptions observed
- [ ] Verify `loopConfigFor()` returns `LoopConfig` with evaluator, stop/escalation conditions, failure action, and `CostEstimate`
- [ ] Verify cost formula: `iterationCost = (inputTokens/1M)*inputPrice + (outputTokens/1M)*outputPrice + toolCost`
- [ ] Verify closed loop is NOT recommended when: no evaluator, exceptions observed, high-risk/irreversible, subjective quality without measure
- [ ] Add unit test: bounded-loop produced for validate activity with success/failure results
- [ ] Add unit test: one-shot produced for execute activity with exceptions
- [ ] Verify recommendations display cost summary string in Improvement Opportunities view

**Acceptance criteria:**
- `loopConfigFor()` defect fixed — receives real `events` parameter
- `recommendTreatments()` produces `executionPattern: "bounded-loop"` with `loopConfig` for eligible activities
- No loop recommended for high-risk or exception-heavy activities
- Cost estimates are deterministic for identical input

**Files:** `src/domain/recommendations.ts`, `tests/recommendations.test.ts`
**Verification:** `npm test`, `npm run lint`

---

## Requirement Coverage

| Requirement | Task IDs |
|---|---|
| FR-001 | T13 |
| FR-002 | T06 |
| FR-003 | T06 |
| FR-004 | T06 |
| FR-005 | T10 |
| FR-006 | T10 |
| FR-007 | T10 |
| FR-008 | T12 |
| FR-009 | T10 |
| FR-010 | T10 |
| FR-011 | existing (T19 verify) |
| FR-012 | existing (T19 verify) |
| FR-015 | T13 (stub) |
| FR-016 | T13 |
| FR-017 | T09 |
| FR-018 | T05 |
| FR-019 | T11 |
| FR-020 | T12 |
| FR-022 | T15, T16 |
| FR-023 | T06 |
| FR-024 | T14 |
| FR-026 | T20 |
| NFR-009 | T17, T18 |
