# Feature: Flowsensa Product Requirements

> Status: Draft
> Source: Henry's requirements feedback, canonical Mnemosync boundary, and current Flowsensa prototype

## Overview

Flowsensa converts observed human, agent, system, and external activity into a
confirmable process map. It helps a user understand how work actually happens,
correct inferred facts, and identify evidence-backed opportunities for
Automation, LLM, or Hybrid implementation.

## Business Context

Knowledge work increasingly crosses humans, agents, and conventional systems.
Flowsensa must preserve the distinction between observed evidence, machine
inference, and user-confirmed truth while finding delays, rework, exceptions,
control gaps, and sensible automation opportunities.

## User Stories

### US-001: Reconstruct observed work

**As a** process owner  
**I want to** import normalized work events and inspect the process variants  
**So that** I can understand the real process rather than a stale procedure

**Acceptance Criteria:**
- [ ] Valid Mnemosync-compatible events produce ordered cases, activities,
      transitions, variants, actors, durations, and outcomes.
- [ ] Invalid data is rejected without replacing the active workspace.
- [ ] Human, agent, system, and external work remain visibly distinct.

### US-002: Confirm process truth

**As a** process owner  
**I want to** correct inferred activities, ownership, and boundaries  
**So that** recommendations use a process I recognize as accurate

**Acceptance Criteria:**
- [ ] Observed, inferred, user-confirmed, and overridden facts are distinguishable.
- [ ] Changes retain the prior value, rationale, actor, and time.
- [ ] The user can rename, merge, split, reject, and assign ownership.

### US-003: Find automation opportunities

**As an** automation evaluator  
**I want to** compare Automation, LLM, and Hybrid treatments  
**So that** I can choose a pattern suited to the work and risk

**Acceptance Criteria:**
- [ ] Each recommendation identifies one approved family.
- [ ] Each includes evidence, uncertainty, failure modes, safeguards,
      implementation difficulty, and expected time effect.
- [ ] The system can generate a family-appropriate implementation brief.

### US-004: Use advisory AI safely

**As a** process owner  
**I want to** request AI interpretation of confirmed process context  
**So that** I receive richer explanations without allowing model execution

**Acceptance Criteria:**
- [ ] Core reconstruction and rubric functions work without a model key.
- [ ] Public users supply their own OpenRouter key.
- [ ] Henry's private deployment may use a server-held OpenRouter key.
- [ ] Model output is advisory and cannot silently alter confirmed facts.

### US-005: Hand opportunities to the ecosystem

**As a** process owner  
**I want to** export process and tooling requirements  
**So that** OSSensa can find assets and Mnemosync can track implementation

**Acceptance Criteria:**
- [ ] Confirmed processes and recommendations export as versioned JSON and
      readable documents.
- [ ] Tooling requirements do not embed private raw telemetry.
- [ ] Exports preserve evidence identifiers and timestamps.

### US-006: Stay synchronized with Mnemosync

**As a** process owner  
**I want to** receive new Mnemosync events automatically  
**So that** the process view stays current without repeated JSON downloads

**Acceptance Criteria:**
- [ ] The system performs an initial synchronization and then ingests only new
      or changed events.
- [ ] Replayed events do not create duplicates.
- [ ] The interface shows last successful refresh, current cursor, source
      health, pending events, and synchronization errors.
- [ ] A failed refresh preserves prior data and retries safely.

### US-007: Monitor process performance over time

**As a** process owner  
**I want to** see trends, KPIs, bottlenecks, and alerts  
**So that** I can detect deterioration and verify whether improvements worked

**Acceptance Criteria:**
- [ ] Dashboards compare selectable time periods and process revisions.
- [ ] Deterministic KPIs include case volume, throughput time, waiting time,
      rework, retry, exception, handoff, outcome, and automation-family counts.
- [ ] Deterministic alert rules identify threshold breaches and meaningful
      changes with links to affected cases and events.
- [ ] Users can acknowledge, mute, resolve, and review alert history.

### US-008: Investigate with an AI Analyst

**As a** process owner  
**I want to** ask for evidence-grounded explanations of performance changes  
**So that** I can investigate root causes without treating model guesses as facts

**Acceptance Criteria:**
- [ ] Deterministic filtering, KPI calculation, bottleneck statistics, and
      candidate root-cause factors run before any model call.
- [ ] The AI Analyst receives bounded aggregates and selected evidence rather
      than unrestricted raw telemetry.
- [ ] Answers distinguish measured facts, deterministic findings, hypotheses,
      missing evidence, and recommended next checks.
- [ ] Every answer links back to the filters, metrics, cases, and events used.

### US-009: Include task-mining evidence

**As a** process owner  
**I want to** optionally analyze fine-grained human desktop and browser activity  
**So that** manual work hidden between system events can be represented

**Acceptance Criteria:**
- [ ] Task capture is explicit, local-first, visible, pausable, and application allowlisted.
- [ ] Sensitive fields, credentials, and excluded applications are never captured.
- [ ] Raw interaction data is reduced to normalized task events before Flowsensa ingestion.
- [ ] Users can inspect and delete captured task evidence.

### US-010: Demonstrate live process updates

**As a** product evaluator  
**I want to** run a representative activity and watch it enter the activity log,
process path, and applicable metrics  
**So that** I can verify that process-mining views are grounded in live telemetry

**Acceptance Criteria:**
- [ ] A demo activity produces a traceable Mnemosync-compatible event instead of
      directly changing presentation-only counters.
- [ ] The event appears in the Activity Log with source, actor, time, case,
      truth state, and stable event ID.
- [ ] Affected process nodes, transitions, timelines, counts, and charts update
      from the same ingested event.
- [ ] Unaffected metrics do not animate or change.
- [ ] The demo can be reset without affecting real imported workspaces.

### US-011: Demonstrate creator and project work

**As a** creator and builder  
**I want to** open Flowsensa on representative post and software-project activity  
**So that** the product immediately demonstrates the work I actually perform

**Acceptance Criteria:**
- [ ] The default synthetic workspace contains post research, drafting, review,
      publication, project planning, coding, testing, review, and deployment events.
- [ ] Cases include human, agent, system, and external actors with realistic
      handoffs, waiting, rework, exceptions, and approval checkpoints.
- [ ] Landing, overview, process, data-source, activity-log, recommendation, and
      export surfaces use the creator/project story consistently.
- [ ] Accounts-payable, invoice, supplier, ERP, and Northstar AP examples do not
      appear in the default experience.
- [ ] Live demo activities extend the same creator/project cases and update the
      Activity Log, process graph, KPIs, and applicable visuals.

## Functional Requirements

### FR-001: Event ingestion — Must Have

WHEN a user imports a supported event collection  
THE SYSTEM SHALL validate its version and structure atomically.

### FR-002: Process reconstruction — Must Have

WHEN valid events are available  
THE SYSTEM SHALL reconstruct cases, ordered activities, transitions, variants,
handoffs, repetitions, exceptions, durations, and outcomes.

### FR-003: Actor distinction — Must Have

THE SYSTEM SHALL preserve human, agent, system, and external actor identity
through reconstruction, analysis, display, and export.

### FR-004: Truth states and corrections — Must Have

THE SYSTEM SHALL label inferred facts and permit evidence-preserving user
confirmation or correction.

### FR-005: Friction and control analysis — Must Have

THE SYSTEM SHALL identify delays, rework, retries, exceptions, responsibility
gaps, missing controls, and missing ownership with evidence links.

### FR-006: Recommendation families — Must Have

THE SYSTEM SHALL classify treatments as:

- **Automation:** deterministic, hard-coded, and exactly verifiable;
- **LLM:** probabilistic interpretation or generation addressed by a prompt;
- **Hybrid:** an agent bounded by deterministic permissions, validation,
  approval, retries, evidence, and stopping conditions.

### FR-007: Recommendation explanation — Must Have

THE SYSTEM SHALL explain evidence, uncertainty, benefit, failure modes,
safeguards, difficulty, and reversibility for each recommendation.

### FR-008: Advisory model call — Should Have

WHEN requested  
THE SYSTEM SHALL send only selected process context through the shared
OpenRouter connector and label the response as advisory.

### FR-009: Family-specific briefs — Should Have

WHEN a recommendation is accepted  
THE SYSTEM SHALL generate an Automation build brief, LLM prompt specification,
or Hybrid harness-and-controls specification.

### FR-010: OSSensa tooling request — Should Have

WHEN an opportunity needs an existing software capability  
THE SYSTEM SHALL export a structured tooling requirement for OSSensa.

### FR-011: Local persistence and deletion — Must Have

THE SYSTEM SHALL save imported and derived work locally by default and provide
explicit deletion.

### FR-012: Exports — Must Have

THE SYSTEM SHALL export confirmed maps and recommendations as versioned JSON,
Markdown, and Mermaid with evidence and truth-state provenance.

### FR-013: Obsidian decision export — Should Have

THE SYSTEM SHALL produce an Obsidian-compatible accepted-decision record without
writing to the vault silently.

### FR-014: Cost linkage — Could Have

THE SYSTEM MAY link LocalCFO project, process, and outcome identifiers without
owning accounting calculations.

### FR-015: Automatic incremental ingestion — Must Have

WHEN Mnemosync makes new work events available  
THE SYSTEM SHALL ingest them automatically from the last confirmed cursor,
validate them atomically, deduplicate them by stable identity, and preserve
source provenance.

### FR-016: Recurring refresh and recovery — Must Have

THE SYSTEM SHALL support recurring refresh, manual refresh, resumable
checkpoints, bounded retries, source-health status, and actionable error states.

### FR-017: Historical trends and operational dashboards — Must Have

THE SYSTEM SHALL retain sufficient versioned history to present operational
dashboards and compare process volume, timing, friction, outcomes, actors,
variants, and accepted recommendations over time.

### FR-018: Deterministic analytics — Must Have

THE SYSTEM SHALL provide composable filters, KPI definitions, bottleneck
statistics, deviation cohorts, and candidate root-cause factors that produce
repeatable results from the same evidence.

### FR-019: Alerts — Must Have

WHEN a configured deterministic rule or material change is detected  
THE SYSTEM SHALL create an evidence-linked alert with severity, status,
triggering values, affected cases, and lifecycle history.

### FR-020: AI Analyst — Should Have

WHEN a user requests investigation assistance  
THE SYSTEM SHALL ground the AI Analyst in deterministic analytics and selected
evidence, require citations to internal evidence, and label hypotheses and
unsupported conclusions.

### FR-021: Task-mining intake — Should Have

WHEN a user enables task mining  
THE SYSTEM SHALL accept privacy-reduced human interaction events from a local
Mnemosync capture component while preserving consent, exclusions, redaction,
provenance, and deletion controls.

### FR-022: Live demo event flow — Must Have

WHEN a representative demo activity is completed  
THE SYSTEM SHALL ingest the resulting event through the normal validation,
deduplication, reconstruction, and analytics path and visibly update every
affected view from that shared state.

### FR-023: Interactive process evidence — Must Have

THE SYSTEM SHALL make process nodes and transitions responsive to hover and
keyboard focus on pointer devices and to tap on touch devices, showing frequency,
duration, affected cases, and links to supporting activity-log events.

### FR-024: OpenRouter BYOK settings — Should Have

THE SYSTEM SHALL provide an explicit OpenRouter connection screen with masked
session-only key entry, connection testing, model selection, disconnect, and a
clear explanation of what context will be transmitted.

### FR-025: Creator/project showcase — Must Have

WHEN Flowsensa starts without user-imported data  
THE SYSTEM SHALL load a clearly labeled synthetic workspace representing post
creation and software-project delivery, and all demo actions shall extend that
same process domain through the normal ingestion path.

## Non-Functional Requirements

### NFR-001: Privacy and security

- Core use remains credential-free and local-first.
- Keys never appear in source, client bundles, exports, telemetry, or logs.
- Public deployments never fall back to Henry's server-held key.
- High-risk context requires an explicit transmission review.

### NFR-002: Explainability

- Every inferred fact and recommendation is traceable to evidence or a rule.
- AI output is distinguishable from deterministic analysis.

### NFR-003: Accessibility

- Core workflows meet WCAG 2.2 AA and remain keyboard operable.

### NFR-004: Reliability

- Invalid imports and failed model calls preserve the active workspace.
- Deterministic reconstruction is repeatable for identical input.

### NFR-005: Portability

- Imports, exports, and integration payloads use versioned schemas.
- Flowsensa remains independently deployable.

### NFR-006: Incremental reliability

- Synchronization is idempotent and resumable.
- Events are never silently discarded; rejected events remain diagnosable.
- Refresh lag and source-health state are visible to the user.

### NFR-007: Analytics integrity

- KPI definitions, filters, time windows, and thresholds are visible and exportable.
- Historical results identify the process revision and data window used.
- AI explanations cannot overwrite deterministic measurements.

### NFR-008: Task-mining privacy

- Task mining is off by default.
- Password fields, authentication screens, private/incognito browsing, and
  excluded applications are never captured.
- Raw screenshots and keystroke contents are out of scope by default.
- Capture state is continuously visible and can be stopped immediately.

### NFR-009: Responsive interaction and layout integrity

- Core overview, process exploration, activity-log, and AI settings workflows
  support desktop and mobile layouts without clipped or overflowing text.
- Hover-dependent information has keyboard-focus and touch alternatives.
- Primary actions remain anchored to page headers or owning panels and do not
  obscure data as floating controls.

### NFR-010: Visual and narrative integrity

- The runtime uses the approved dark ocean-blue and yellow visual system without
  later CSS declarations overriding those tokens.
- Navigation uses conventional enterprise module names without numbered stage
  prefixes.
- Default copy, fixtures, source labels, charts, and screenshots tell one
  consistent creator/project story.
- Desktop and mobile screenshots demonstrate the principal demo flow.
- Normal text and essential labels meet a minimum 4.5:1 contrast ratio; large
  text, focus indicators, controls, chart marks, and meaningful boundaries meet
  the applicable WCAG 2.2 AA 3:1 requirement.
- No heading, status, empty state, tab, helper text, chart legend, or process
  label relies on low-opacity colour that becomes unreadable on its surface.
- Long process, event, actor, and source labels wrap or expose their complete
  value through an accessible detail view; ellipsis never hides the only
  available meaning.
- Header metadata and actions reflow without overlap at 375px, 768px, 1024px,
  1280px, and 1440px viewport widths.
- Every primary module is visually inspected in representative populated,
  empty, loading, error, selected, hover, focus, and disabled states.

## Out of Scope

- Primary activity capture.
- Token, subscription, or project accounting.
- Autonomous implementation.
- Silent modification of other products or Obsidian.
- Treating AI output as confirmed truth.

## Decisions

### D-001: Separate product boundary

**Decision:** Flowsensa remains a standalone consumer of Mnemosync telemetry.  
**Reason:** Monitoring and process engineering are distinct jobs.  
**Source:** Direct user instruction  
**Impacts:** FR-001, FR-010, NFR-005

### D-002: Approved family names

**Decision:** Use Automation, LLM, and Hybrid in user-facing language.  
**Reason:** These labels are clearer than implementation jargon.  
**Source:** Direct user instruction  
**Impacts:** US-003, FR-006, FR-009

### D-003: Advisory model boundary

**Decision:** Models explain, recommend, and draft; they do not execute or
silently change process truth.  
**Reason:** The current need is advisory assistance with human confirmation.  
**Source:** Direct user instruction  
**Impacts:** US-004, FR-008, NFR-001

### D-004: Automatic ingestion is the normal path

**Decision:** Mnemosync events synchronize automatically and incrementally;
manual JSON import remains a recovery and portability path.  
**Reason:** Recurring manual export would make monitoring stale and brittle.  
**Source:** Direct user instruction  
**Impacts:** US-006, FR-001, FR-015, FR-016, NFR-006

### D-005: Deterministic analytics precede AI interpretation

**Decision:** Filters, KPIs, bottlenecks, alert triggers, and root-cause
candidates are calculated deterministically before the AI Analyst interprets them.  
**Reason:** Users need reproducible evidence and a clear boundary around model inference.  
**Source:** Direct user instruction  
**Impacts:** US-007, US-008, FR-018, FR-019, FR-020, NFR-007

### D-007: Canonical process identifier

**Decision:** Processes carry a stable logical `processId` (set once, never reused) and an immutable `revisionId` (UUID) per confirmed change. All external cross-product references cite both fields. Exports embed both so downstream lookups survive renaming and structural edits.  
**Reason:** External references from OSSensa, Mnemosync, and Obsidian must remain valid after a process is renamed or restructured.  
**Source:** Henry — accepted recommended answer  
**Impacts:** FR-010, FR-012, FR-013, NFR-005

### D-008: Accepted recommendation workflow

**Decision:** Accepting a recommendation produces two explicit user-driven actions: (1) generate and offer a downloadable family-specific brief (Automation build brief / LLM prompt spec / Hybrid harness-and-controls spec); (2) surface a "Track in Mnemosync" CTA that the user must explicitly trigger — never automatic. No background writes to any other product occur.  
**Reason:** Users need control over downstream side-effects; implicit cross-product writes would be surprising and hard to undo.  
**Source:** Henry — accepted recommended answer  
**Impacts:** FR-009, FR-010, US-003

### D-009: Default task-mining granularity

**Decision:** The local capture companion collects application/window identity, action category (focus, switch, submit, open, close), timestamps, durations, and explicit user labels by default. Screenshots, typed content, clipboard contents, raw keystrokes, and browser URL paths beyond origin require explicit opt-in. Password fields, private/incognito windows, and excluded applications are never captured regardless of settings.  
**Reason:** This balances task-reconstruction value against privacy floor requirements.  
**Source:** Henry — accepted recommended answer  
**Impacts:** US-009, FR-021, NFR-008

### D-010: Creator/project showcase replaces accounts payable

**Decision:** The default showcase represents Henry-like post creation and
software-project delivery; the Northstar accounts-payable fixture and narrative
are removed from all default surfaces.  
**Reason:** The demo must make Flowsensa's relevance to human-agent creative and
technical work immediately credible.  
**Source:** Direct user correction, 2026-07-05  
**Impacts:** US-011, FR-025, NFR-010

### D-006: Task mining is collected outside Flowsensa

**Decision:** A local Mnemosync capture component owns task capture; Flowsensa
receives normalized privacy-reduced task events.  
**Reason:** This preserves product boundaries and keeps sensitive raw interaction
data out of the process-analysis application.  
**Source:** Recommended response to direct user question  
**Impacts:** US-009, FR-021, NFR-008

## Questions

### Q-001: Canonical process identifier

**Status:** closed — resolved as D-007  
**Why it matters:** Cross-product references need durable identity after edits.  
**Recommended:** Immutable revision IDs plus a stable logical process ID.

### Q-002: Accepted recommendation workflow

**Status:** closed — resolved as D-008  
**Why it matters:** Acceptance could create an export, Mnemosync ticket, or both.  
**Recommended:** Create an export and offer an explicit "Track in Mnemosync" action.

### Q-003: Default task-mining granularity

**Status:** closed — resolved as D-009  
**Why it matters:** More detailed capture can improve task reconstruction but
substantially increases privacy and security risk.  
**Recommended:** Capture application/window identity, action category, timestamps,
durations, and explicit user labels; keep screenshots, typed content, clipboard
contents, and raw keystrokes off by default.
