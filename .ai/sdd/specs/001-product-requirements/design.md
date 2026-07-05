# Design: Flowsensa Product Redesign

> Status: Approved
> SDD Gate: design:approved
> Evidence date: 2026-07-05

## Overview

This design transforms the existing Flowsensa prototype into a complete enterprise-quality process-intelligence application. It adds ten new navigation modules, a live demo event chain, telemetry drill-down, OpenRouter BYOK AI integration, full responsive layout, and a dark ocean-blue/yellow visual system — all built on top of the existing domain layer without changing validated business logic.

---

## Architecture

### Layered structure (preserve existing pattern)

```
src/
  domain/          ← existing, unchanged (discovery, gaps, recommendations, etc.)
  components/      ← existing views refactored + new module views
  modules/         ← new: OperationalOverview, ProcessExplorer, ProcessVariants,
                         ActivityLog, PerformanceAnalysis, ImprovementOpportunities,
                         Alerts, AIAnalyst, DataSources, Settings
  hooks/           ← new: useDemoEngine, useOpenRouter, useAlerts, useKPIs
  lib/             ← new: demoProducer.ts, kpiEngine.ts, alertEngine.ts, openrouterClient.ts
  styles/          ← refactored: tokens.css, layout.css, components.css
  fixtures/        ← existing, unchanged
  schemas/         ← existing, unchanged
```

### State model (extend App.tsx)

All existing state is preserved. New state slices:
- `activityLog: ActivityLogEntry[]` — live ring buffer, max 500 entries
- `alerts: Alert[]` — deterministic alert engine output
- `kpiHistory: KPISnapshot[]` — time-bucketed KPI windows
- `openRouterConfig: OpenRouterConfig | null` — session-only, never persisted
- `demoState: DemoState` — tracks live demo chain, resettable

---

## Visual Design System

### Design direction: dark-glass enterprise

Ocean-blue deep backgrounds, yellow/amber accent, frosted glass cards.

```css
:root {
  /* Ocean-blue dark system */
  --bg:           #0a1628;
  --bg-mid:       #0d1e35;
  --surface:      #112240;
  --surface-2:    #162c4a;
  --border:       #1e3a5f;
  --border-light: #2a4d73;

  /* Text */
  --text:         #e8f0fc;
  --text-muted:   #7a9cc0;
  --text-dim:     #4a6a8a;

  /* Accent system */
  --accent:       #f5c842;   /* yellow */
  --accent-hover: #ffd55a;
  --accent-dim:   rgba(245,200,66,0.12);

  /* Semantic */
  --success:      #2dd4a0;
  --warning:      #f59342;
  --danger:       #ef5260;
  --info:         #4f8ee8;

  /* Typography */
  --font-sans:    'Inter', 'Segoe UI', system-ui, sans-serif;
  --font-mono:    'JetBrains Mono', 'Cascadia Code', ui-monospace, monospace;

  /* Sizing */
  --nav-width:    220px;
  --header-h:     56px;
  --radius:       8px;
  --radius-lg:    12px;
}
```

### Navigation: ten enterprise modules

| ID | Label | Icon glyph |
|----|------|----------|
| `overview` | Operational Overview | ⬡ |
| `explorer` | Process Explorer | ⬡ |
| `variants` | Process Variants | ⬡ |
| `activity` | Activity Log | ⬡ |
| `performance` | Performance Analysis | ⬡ |
| `improvements` | Improvement Opportunities | ⬡ |
| `alerts` | Alerts | ⬡ |
| `analyst` | AI Analyst | ⬡ |
| `sources` | Data Sources | ⬡ |
| `settings` | Settings | ⬡ |

Legacy views (observe/confirm/engineer/ask/meanings/export) are mapped to new modules:
- observe → explorer (keep ObserveView inside)
- confirm → explorer (ConfirmView as subpanel)
- engineer → improvements (EngineerView inside)
- ask → analyst (new AIAnalyst wraps AnalystView)
- meanings → settings (RegistryView moved)
- export → settings (ExportView moved)

---

## Module Designs

### M1: Operational Overview

**Purpose:** Single-screen health summary for any process workspace.

**Layout:**
- 4-column KPI strip: Cases, Throughput Time (median), Exception Rate, Automation Coverage
- Process health gauge bar (confirmed/total nodes)
- 2-column grid: top-3 improvement opportunities list + alert feed
- Last-sync status with manual refresh button

**Data sources:** `graph`, `events`, `kpiHistory`, `alerts`
**Live update trigger:** `activityLog` length change → recalculate KPIs

---

### M2: Process Explorer

**Purpose:** Visual process graph with node/edge selection and telemetry drill-down.

**Layout:**
- SVG canvas (scrollable, keyboard-navigable); nodes as rectangles with actor-type color bands
- Right panel: node detail (frequency, avg duration, actor IDs, truth state, evidence IDs, cases)
- Bottom drawer: selected event records from ActivityLog
- Variant selector strip above canvas

**Interactions:**
- `hover` → tooltip with frequency + avg duration
- `click`/`Enter` → open right panel with full telemetry
- `touch tap` → equivalent to click
- `Tab`/`Shift+Tab` → cycle through nodes and edges
- `Escape` → close right panel

**Node color scheme:**
- human actor: `--info`
- agent actor: `--accent`
- system actor: `--success`
- external actor: `--text-muted`

**Actor-type badge below each node label**

---

### M3: Process Variants

**Purpose:** Compare variant paths by frequency, throughput, and outcome.

**Layout:**
- Table: variant ID, case count, path steps (condensed), exception %, outcome %, median duration
- Row click → expand to show full step sequence and linked activity-log entries
- On mobile: card per variant, same fields as labeled rows

---

### M4: Activity Log

**Purpose:** Live append-only event stream from all sources including demo.

**Columns:** timestamp, event ID, case ID, actor, activity, result, truth state, source

**Features:**
- Filter bar: case ID, actor type, result status, date range
- Row click → full EventDialog (existing)
- New entries animate in from top
- "Synthetic demo" badge on demo-sourced entries
- Pause/resume scroll lock button
- Export CSV (plain text, no raw private fields)

**Data source:** `activityLog` ring buffer

---

### M5: Performance Analysis

**Purpose:** Time-series KPI trends and bottleneck identification.

**Layout:**
- Period selector: Last 7d / 30d / 90d / custom (filters over `kpiHistory`)
- KPI sparkline grid: throughput, wait time, rework, exception rate, automation coverage
- Bottleneck table: top-5 nodes by wait time + frequency rank
- Compare-periods toggle showing delta vs prior period

---

### M6: Improvement Opportunities

**Purpose:** Recommendations with evidence, rubric, and family-specific actions.

**Content:** Existing EngineerView functionality reorganised + new family-brief export.

**New additions:**
- "Generate brief" button per recommendation → downloads Automation/LLM/Hybrid brief
- "Track in Mnemosync" CTA per recommendation (explicit, never automatic)
- Confidence bar and evidence link count per opportunity
- Filter by family (Automation / LLM / Hybrid / Manual)

---

### M7: Alerts

**Purpose:** Deterministic threshold-breach notifications with lifecycle.

**Layout:**
- Alert list with severity chip (critical/warning/info), rule description, triggered value, timestamp
- Per-alert: Acknowledge / Mute / Resolve actions
- Alert history tab
- Alert rule configuration (static thresholds on KPIs, editable)

**Alert engine (deterministic only):**
- Exception rate > 20% → critical
- Rework rate > 10% → warning
- No new events in 24h → info
- Active on `kpiHistory` update

---

### M8: AI Analyst

**Purpose:** AI-grounded investigation of deterministic findings.

**Layout:**
- Chat-style interface with conversation history
- Context strip showing what evidence is currently bound (KPI snapshot, case IDs, event range)
- "Regenerate" and "Clear conversation" controls
- Requires OpenRouter key configured in Settings
- Graceful degraded state when no key: show deterministic-only summary panels

**Prompt construction (deterministic first):**
1. Calculate KPI snapshot, top gaps, top bottlenecks, candidate root-cause factors
2. Attach up to 20 selected event summaries (no private fields)
3. Send to OpenRouter → stream advisory response
4. Label response: "Advisory — AI interpretation, not confirmed fact"

---

### M9: Data Sources

**Purpose:** Ingestion configuration and sync health.

**Layout:**
- Source list: name, type (mnemosync/file/demo), last sync, health chip, event count
- "Sync now" per source
- Ingestion cursor, pending count, rejected events with diagnostics
- Manual file import retained
- Demo source entry: "Northstar Demo" with reset button

---

### M10: Settings

**Sections:**
1. OpenRouter BYOK (see BYOK design below)
2. Primitive Registry (existing RegistryView)
3. Export (existing ExportView)
4. Workspace management (clear, delete)

---

## Live Demo Event Chain (FR-022)

### Design

```
User clicks "Run demo activity" button in Operational Overview or Data Sources
  → demoProducer.ts emits a valid WorkEvent (Mnemosync-compatible schema)
  → event enters importPayload() ingestion path
  → validation + deduplication run normally
  → event appended to activityLog
  → graph reconstruction re-run on full event set
  → only affected nodes/edges update (diffed by eventIds)
  → kpiEngine recalculates affected KPI buckets
  → alertEngine checks updated KPIs
  → ActivityLog row animates in
  → affected process nodes flash briefly (CSS transition)
  → "Demo event ingested" toast with stable event ID
```

### Demo activities (4 types covering human + agent workflows)

1. **Post created** — human creates LinkedIn post draft
2. **Code commit** — agent commits code change
3. **Review completed** — human reviews and approves
4. **Post published** — agent publishes post

Each produces a deterministic event with stable `caseId` prefix `"demo-"` and tag `["showcase-demo", "live-demo"]`.

### Reset

"Reset demo state" button in Data Sources:
- Removes all events tagged `"live-demo"` from event store
- Re-runs reconstruction without those events
- Does not affect user-imported real workspaces

---

## OpenRouter BYOK (FR-024, FR-019)

### Settings UI flow

1. **Key entry** — `<input type="password">` masked, never shown in DOM after submit
2. **Model selector** — dropdown populated from OpenRouter models API, default `openai/gpt-5.5`
3. **Test connection** — sends minimal test request, shows latency + model name
4. **Context review** — expandable panel showing exactly what JSON will be sent (bounded KPI + event summaries)
5. **Disconnect** — clears session-only key from memory, no storage interaction
6. **Status chip** — "Connected · model-name" or "Not configured"

### Security constraints

- Key held only in React state (never `localStorage`, `sessionStorage`, `IndexedDB`, URL, or bundle)
- `openrouterClient.ts` sends key in `Authorization: Bearer` header per request
- Key never logged, exported, or embedded in error messages
- Public deployment: no server-side key fallback
- Private/Henry deployment: `OPENROUTER_API_KEY` env var on Vercel, consumed only in Vercel Function `/api/ai-analyst`

### API contract

```
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer <session-key>
Content-Type: application/json

{
  "model": "openai/gpt-5.5",
  "messages": [...bounded context],
  "stream": true,
  "max_tokens": 1200
}
```

---

## Responsive Layout

### Desktop (≥1024px)
- Fixed sidebar `var(--nav-width)` + main workspace fills remainder
- Sidebar collapses to icon-only at 1024–1200px
- Module content uses CSS grid, max content width 1400px

### Tablet (768–1023px)
- Sidebar hidden, top nav bar with hamburger
- Module content single-column with compact table → labeled-card transformation

### Mobile (<768px)
- Bottom tab bar (5 primary modules) + overflow menu
- All tables become labeled stacked cards
- Process graph scrollable horizontal; node tap = drawer from bottom
- No floating actions; all CTAs anchored to section headers

### Overflow prevention rules
- All text containers: `min-width: 0; overflow: hidden; text-overflow: ellipsis`
- Table cells: `white-space: nowrap` with overflow on narrow viewport → card fallback
- SVG canvas: `overflow: scroll` within fixed-height container, not page overflow
- Action buttons: never `position: fixed` over content; in headers or owning panels only

---

## Process Node Interactivity (FR-023)

- Every `<g role="button">` SVG node: `tabIndex={0}`, `aria-label`, `onKeyDown Enter/Space`
- Hover CSS: scale 1.04, border glow `--accent`
- Focus CSS: 2px offset outline `--accent`
- Touch: `onTouchEnd` fires same handler as `onClick`
- Selection state: node border changes to `--accent`, right panel opens
- Edge hover/focus: highlights in `--accent`, shows frequency tooltip

---

## Requirements Mapping

| Requirement | Design section |
|---|---|
| FR-001 Event ingestion | Data Sources, importPayload unchanged |
| FR-002 Process reconstruction | Process Explorer, existing discoverProcess |
| FR-003 Actor distinction | Process Explorer node color bands |
| FR-004 Truth states | Process Explorer node detail panel |
| FR-005 Friction analysis | Improvement Opportunities, gaps engine |
| FR-006 Recommendation families | Improvement Opportunities, family badges |
| FR-007 Recommendation explanation | Improvement Opportunities, rubric panel |
| FR-008 Advisory model call | AI Analyst, openrouterClient |
| FR-009 Family-specific briefs | Improvement Opportunities, "Generate brief" |
| FR-010 OSSensa export | Improvement Opportunities, "Export tooling req" |
| FR-011 Local persistence | existing storage.ts unchanged |
| FR-012 Exports | Settings → Export tab |
| FR-015 Automatic ingestion | Data Sources sync engine (stub for Phase 2) |
| FR-016 Recurring refresh | Data Sources, sync health panel |
| FR-017 Historical trends | Performance Analysis, kpiHistory |
| FR-018 Deterministic analytics | kpiEngine.ts |
| FR-019 Alerts | Alerts module, alertEngine.ts |
| FR-020 AI Analyst | AI Analyst module |
| FR-022 Live demo event flow | Demo chain via demoProducer.ts |
| FR-023 Interactive process evidence | Process Explorer interactivity spec |
| FR-024 OpenRouter BYOK | Settings → OpenRouter section |
| NFR-009 Responsive layout | Responsive Layout section |

---

## Technical Decisions

### TD-001: Navigation rename to enterprise modules
Keep existing view state approach (`useState<View>`), extend type to 10 modules. No router needed at this scale.

### TD-002: activityLog as append-only ring buffer
`ActivityLogEntry[]` capped at 500. New events prepended. Separate from `events: WorkEventCollection` — the log is the display layer; the event collection is the domain source.

### TD-003: kpiEngine is a pure function
`calculateKPIs(events, graph, window): KPISnapshot` — deterministic, no side effects. Called in `useMemo` on event/graph change.

### TD-004: alertEngine is a pure function
`evaluateAlerts(kpis, rules): Alert[]` — deterministic. Called after KPI recalculation.

### TD-005: OpenRouter key in React state only
No persistence layer. Refresh clears key. This is the safest public-deployment approach.

### TD-006: Demo events use tag-based isolation
Live-demo events carry tag `"live-demo"`. Reset filters by this tag. No separate store needed.

### TD-007: CSS-only responsive, no Tailwind
Existing project has no Tailwind. Extend `styles.css` with CSS custom properties + media queries.

### TD-008: SVG graph is custom, not a library
Existing graph rendering is custom SVG. Extend it with node interactivity (role=button, keyboard, touch) rather than introducing a new library.
