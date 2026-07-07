# Feature: Operational Context Workspace

> Status: Approved
> Source: User feedback on staged product-resonance pass, 2026-07-07

## Overview

Flowsensa must feel like operational process intelligence software for a local individual or team, not an explanatory prototype. The first product surface should help the user choose, inspect, rename, import, confirm, enhance, and export processes. Copy should be concise and operational. The product may have a marketing/demo entry screen, but the working app should start at mapping and gate checks rather than an "Observe" explainer page.

## Business Context

The core promise of Flowsensa is operational context for whoever adopts it: what process is actually happening, what each task means, where telemetry supports the map, and what improvements or tools are worth trying next. The app must preserve local-first deterministic analysis while supporting optional BYOK model assistance for analysis and import interpretation. Success means a knowledge worker can bring in a process, understand task-level performance and evidence, and leave with practical process enhancements plus exportable artifacts.

## User Stories

### US-001: Start From The Process Map

**As a** FlowSensa user
**I want to** begin in a map-and-gate-check workspace
**So that** I can immediately inspect operational context instead of reading intent copy.

**Acceptance Criteria:**
- [ ] The default working-app route starts at process mapping/gate checks when sample or imported data is available.
- [ ] The previous "Observe" explainer is removed from the core workflow navigation.
- [ ] Any first-run/marketing surface is visually distinct from the app workspace and has one primary action: begin demo or import process.
- [ ] First-run copy is short, product-grade, and avoids explaining the user's prompt back to them.

### US-002: Manage Multiple Processes

**As a** process owner
**I want to** select, rename, and inspect processes and their tasks
**So that** Flowsensa can hold more than one operational context without ambiguity.

**Acceptance Criteria:**
- [ ] A process selector controls which process appears in the graph.
- [ ] Users can rename a process without losing telemetry links.
- [ ] Users can rename tasks/activities in a process while preserving original event labels as provenance.
- [ ] Clicking a process task opens task details with available telemetry, evidence, and insights.

### US-003: Import Process Sources

**As a** knowledge worker
**I want to** import JSON, BPMN, or a process image
**So that** I can analyze processes that come from logs, formal models, or visual diagrams.

**Acceptance Criteria:**
- [ ] JSON import remains supported for normalized work-event data.
- [ ] BPMN import creates or updates a process map from BPMN tasks, gateways, events, and sequence flows.
- [ ] Image import is accepted as an input path for process analysis and clearly communicates whether extraction is deterministic, AI-assisted, or manual-confirmation required.
- [ ] Imports never silently overwrite an existing process without confirmation.
- [ ] Invalid imports preserve the current workspace and show recoverable errors.

### US-004: Export Process Maps

**As a** process owner
**I want to** export a process map
**So that** I can use FlowSensa output in documentation, handoff, or tool evaluation.

**Acceptance Criteria:**
- [ ] The process map can be exported from the map workspace.
- [ ] Export includes process name, task names, transitions, confidence/evidence notes where available, and provenance-safe metadata.
- [ ] Export formats include at least one human-readable format and one machine-readable format.

### US-005: Get Task-Level Process Intelligence

**As a** process analyst or knowledge worker
**I want to** see task insights based on available telemetry
**So that** I can understand bottlenecks, rework, variants, ownership, quality, and automation potential.

**Acceptance Criteria:**
- [ ] Task details show event count, case count, actor mix, observed duration/latency when available, failure/retry/exception signals, downstream/upstream transitions, and evidence links.
- [ ] Task details identify insufficient telemetry rather than inventing metrics.
- [ ] Task insights use process-intelligence language without requiring enterprise-process-mining expertise.
- [ ] Insights remain tied to source events, imported BPMN elements, or image-derived/manual confirmation evidence.

### US-006: Process Enhancements

**As a** user looking for leverage
**I want to** see strong process enhancements and tool suggestions
**So that** I can decide what to automate, simplify, augment, govern, or research through OSSensa.

**Acceptance Criteria:**
- [ ] The "Intervention" tab is renamed to "Process Enhancements".
- [ ] Enhancement recommendations are stronger and more specific than generic automation classes.
- [ ] Recommendations include why the enhancement fits, expected benefit, required controls, evidence confidence, and likely implementation path.
- [ ] Tool suggestions can include alternatives to search through OSSensa.
- [ ] Recommendations distinguish deterministic findings from model-assisted suggestions.

### US-007: AI Insights

**As a** local knowledge worker
**I want to** ask high-value questions about my process
**So that** I can get useful operational insights from deterministic data and optional BYOK models.

**Acceptance Criteria:**
- [ ] "AI Analyst" is renamed to "AI Insights".
- [ ] Users can enter custom prompts in addition to suggested prompts.
- [ ] Suggested prompts reflect enterprise process intelligence adapted to local work: bottlenecks, variants, rework, compliance gates, automation candidates, handoff risk, quality signals, tool fit, and missing telemetry.
- [ ] Responses clearly separate deterministic facts, AI interpretation, hypotheses, and next checks.
- [ ] No model key is required for deterministic sections.

### US-008: Provider-Agnostic BYOK

**As a** user with my own model access
**I want to** name and use API keys without being locked to OpenRouter
**So that** I can identify which model/provider profile I am using.

**Acceptance Criteria:**
- [ ] BYOK settings are not branded as OpenRouter-only.
- [ ] Users can create a named key/profile for an LLM connection.
- [ ] The profile name is how the user recognizes the model/API they intend to use.
- [ ] The key remains browser-session scoped unless the user explicitly opts into persistence.
- [ ] The UI explains exactly what process context is sent to the selected model.

### US-009: Process Risks

**As a** process owner
**I want to** see risks and mitigations for the selected process and its tasks
**So that** I can understand what may fail before choosing enhancements or tools.

**Acceptance Criteria:**
- [ ] A `Process Risks` tab appears before `Process Enhancements` in navigation.
- [ ] The tab uses the currently selected process from the process dropdown.
- [ ] Risks are presented as `Process -- Task -- Risk Identified -- Risk Mitigation`.
- [ ] Deterministic risks are generated from available telemetry such as exceptions, retries, rework, handoffs, missing owners, low confidence, and insufficient evidence.
- [ ] When an LLM API profile is connected and the user explicitly invokes it, the tab can add deeper risk insight while keeping deterministic and AI-assisted risk sources distinct.
- [ ] Risk mitigations are practical and process-specific, not generic compliance filler.

## Functional Requirements

### FR-001: Default Workspace Starts At Map And Gate Checks - Must Have

WHEN a user opens the working app
IF process data exists or sample data is active
THE SYSTEM SHALL show the process map and gate-check workflow as the primary starting point
SO THAT operational context is immediately available.

### FR-002: Optional Demo Landing - Should Have

WHEN no workspace is active or the user chooses a marketing/demo entry
THE SYSTEM SHALL show a concise Celonis-inspired landing surface with light grey/purple styling, flowing digitized line motion, and a "Begin demo" selection
SO THAT the app can still introduce itself without polluting the workspace.

### FR-003: Process Selector - Must Have

WHEN multiple processes exist
THE SYSTEM SHALL provide a process selector that controls the graph view
SO THAT users can switch operational contexts intentionally.

### FR-004: Process And Task Rename - Must Have

WHEN a user renames a process or task
THE SYSTEM SHALL persist the display name while retaining source identifiers and original labels
SO THAT user-friendly naming does not destroy provenance.

### FR-005: Task Detail Insights - Must Have

WHEN a user selects a task in the graph
THE SYSTEM SHALL show telemetry-backed task insights, evidence, transitions, and available operational metrics
SO THAT the user can understand the step before acting on it.

### FR-006: JSON/BPMN/Image Import - Must Have

WHEN a user imports JSON, BPMN, or image input
THE SYSTEM SHALL create a candidate process or event-backed map with explicit confidence and confirmation requirements
SO THAT imported process sources can be analyzed safely.

### FR-007: Process Map Export - Must Have

WHEN a user exports a process map
THE SYSTEM SHALL provide portable output that includes process structure, labels, metadata, and evidence/confidence notes
SO THAT the process can be reused outside Flowsensa.

### FR-008: Process Enhancements Module - Must Have

WHEN a user opens Process Enhancements
THE SYSTEM SHALL show concrete enhancements, controls, expected benefit, evidence confidence, and tool-search handoffs
SO THAT recommendations are useful enough to drive action.

### FR-009: OSSensa Tool Search Handoff - Should Have

WHEN an enhancement implies a tool need
THE SYSTEM SHALL offer a way to search or hand off alternatives through OSSensa
SO THAT the user can evaluate concrete tooling options.

### FR-010: AI Insights Prompting - Must Have

WHEN a user opens AI Insights
THE SYSTEM SHALL support custom prompts and high-value suggested prompts grounded in the selected process
SO THAT model-assisted analysis is user-directed and valuable.

### FR-011: Provider-Agnostic LLM Profiles - Must Have

WHEN a user configures BYOK
THE SYSTEM SHALL support named LLM key/profile configuration without OpenRouter-only framing
SO THAT users can identify the model/provider access they are using.

### FR-012: Local-First Boundaries - Must Have

WHEN deterministic analysis, import validation, mapping, gate checks, task details, enhancements, or exports run
THE SYSTEM SHALL operate locally unless the user explicitly invokes an LLM or external tool handoff
SO THAT Flowsensa remains privacy-preserving and useful without paid services.

### FR-013: Process Risks Registry - Must Have

WHEN a user opens Process Risks
IF a process is selected
THE SYSTEM SHALL show a risk registry grouped by process and task with identified risks, source evidence, severity, and suggested mitigations
SO THAT the user can review operational risk before choosing process enhancements.

## Non-Functional Requirements

### NFR-001: Usability
- The first screen should feel like operational software, not an explainer or pitch deck.
- Primary actions should be obvious: select process, import, rename, inspect task, confirm/gate-check, enhance, export.
- Copy must be concise and product-native.

### NFR-002: Trust / Evidence
- All task insights and enhancements must identify their evidence source or state that telemetry is insufficient.
- AI-assisted extraction or interpretation must be labeled separately from deterministic findings.

### NFR-003: Privacy / Security
- LLM keys must not be written to source bundles, logs, exports, or local storage by default.
- Sending process context to a model must be an explicit user action.

### NFR-004: Performance
- Process switching, task selection, and detail inspection should feel instant for the bundled sample and typical local imports.

### NFR-005: Accessibility
- Process selector, rename controls, import actions, graph task details, and export actions must be keyboard operable.

## Out of Scope

- Multi-user process repository.
- Enterprise SSO, role-based access control, or tenant administration.
- Guaranteed extraction accuracy from arbitrary process images without user confirmation.
- Full universal support for every proprietary LLM API shape in the first implementation slice.
- Server-side storage of user keys or process data.

## Decisions

### D-001: Map First, Not Observe First

**Decision:** The app workspace starts with process mapping and gate checks; "Observe" is removed as a core navigation concept.
**Reason:** The Observe page reads like generated explanation and weakens trust.
**Source:** Direct user instruction
**Impacts:** US-001, FR-001, NFR-001

### D-002: Optional Landing Is A Demo Entry, Not The Workspace

**Decision:** A Celonis-inspired landing page is optional and should only serve first-run/demo entry, with flowing digitized lines and "Begin demo" as a primary selection.
**Reason:** A landing page may help introduce the product, but it should not block the operational workflow.
**Source:** Direct user instruction
**Impacts:** US-001, FR-002

### D-003: Intervention Becomes Process Enhancements

**Decision:** Rename "Intervention" language to "Process Enhancements" and make this the strongest value area.
**Reason:** The user sees enhancements and tool suggestions as the gold of Flowsensa.
**Source:** Direct user instruction
**Impacts:** US-006, FR-008, FR-009

### D-004: AI Analyst Becomes AI Insights

**Decision:** Rename AI Analyst to AI Insights and add custom prompting plus stronger suggested prompts.
**Reason:** The module should feel like a high-value process intelligence assistant for local work, not a passive analyst panel.
**Source:** Direct user instruction
**Impacts:** US-007, FR-010

### D-005: BYOK Is Provider-Agnostic In The UX

**Decision:** BYOK should not be OpenRouter-only; users create named key/profile entries to identify the model/provider access they are using.
**Reason:** Users may bring different LLM API keys and need a neutral way to identify them.
**Source:** Direct user instruction
**Impacts:** US-008, FR-011, NFR-003

### D-006: First LLM Slice Uses Named OpenAI-Compatible Profiles

**Decision:** The first implementation supports named LLM profiles with an OpenAI-compatible endpoint URL, model/deployment ID, and API key.
**Reason:** This keeps the UX provider-agnostic while covering OpenRouter, OpenAI-compatible local gateways, LiteLLM, LM Studio/proxies, and many hosted providers without building every proprietary adapter at once.
**Source:** User approval of Q-001 Option A
**Impacts:** US-007, US-008, FR-010, FR-011, NFR-003

### D-007: Image Import Is BYOK-Assisted And Requires Confirmation

**Decision:** Image import accepts an image, uses a configured BYOK model profile for extraction when available, and requires user confirmation before the extracted map is treated as trusted.
**Reason:** Deterministic browser-only extraction from arbitrary process images is unreliable; AI-assisted extraction must be clearly labeled and gated.
**Source:** User approval of Q-002 Option A
**Impacts:** US-003, FR-006, NFR-002, NFR-003

### D-008: Process Risks Precedes Process Enhancements

**Decision:** Add a `Process Risks` module before `Process Enhancements`; it presents rows in the form `Process -- Task -- Risk Identified -- Risk Mitigation` and can deepen results when an LLM profile is connected.
**Reason:** Risk review is a natural step between understanding the process and deciding enhancements. It increases operational context and makes improvement recommendations more credible.
**Source:** Direct user instruction
**Impacts:** US-009, FR-013, FR-008, FR-010, NFR-002

## Questions

### Q-001: How broad should "any LLM" be in the first implementation?

**Status:** answered
**Answer:** Option A approved: named profiles plus OpenAI-compatible endpoint URL/model/key.
**Why it matters:** A fully universal LLM connector requires provider-specific request/response adapters. A first slice can be provider-agnostic in UX while technically supporting OpenAI-compatible endpoints plus named profiles.
**Recommended:** Option A - Provider-agnostic profiles with OpenAI-compatible endpoint support first, because it keeps BYOK broad enough for OpenRouter, OpenAI-compatible local gateways, LiteLLM, LM Studio, Ollama-compatible proxies, and many hosted providers while staying implementable.

| Option | Answer | Choose this if... | Impact |
|--------|--------|-------------------|--------|
| A | Named profiles + OpenAI-compatible endpoint URL/model/key | You want broad coverage fast | Requires profile name, API base URL, model/deployment ID, key |
| B | Preset adapters for OpenAI, Anthropic, Google, OpenRouter, Ollama | You want polished provider-specific setup | More UI and adapter work; slower first release |
| C | Key name + key only, no live API calls yet | You mainly want labeling and future-proof UX | AI Insights cannot reliably call arbitrary APIs |
| Custom | User-defined scope | None fit | Update requirements/design accordingly |

### Q-002: What should image import do in the first implementation?

**Status:** answered
**Answer:** Option A approved: BYOK-assisted image extraction plus mandatory confirmation before trust.
**Why it matters:** Deterministic browser-only extraction from arbitrary process images is unreliable. Model-assisted extraction needs BYOK and clear trust boundaries.
**Recommended:** Option A - accept image import, use BYOK model-assisted extraction when configured, then force user confirmation before the process is treated as real.

| Option | Answer | Choose this if... | Impact |
|--------|--------|-------------------|--------|
| A | BYOK-assisted image extraction + confirmation | You want useful image import soon | Requires clear AI-assisted label and confirmation gate |
| B | Image upload as reference only + manual task creation | You want fully local deterministic behavior | More manual work, less magic |
| C | Defer image import after JSON/BPMN | You want fast map/process management first | Image import moves to follow-up |
| Custom | User-defined behavior | None fit | Update requirements/design accordingly |

## Glossary

- **Gate checks:** Confirmation and evidence-review steps that decide whether a process map or recommendation is trusted enough to act on.
- **Process:** A named operational workflow containing tasks, transitions, telemetry, and optional imported structure.
- **Task:** A process activity/step shown in the graph. A task may have a user display name and original source labels.
- **Process enhancement:** A recommended improvement such as automation, AI assistance, simplification, control, tool adoption, or human-owned refinement.
- **LLM profile:** A named BYOK connection entry that identifies the model/provider access the user intends to use.
- **Process risk:** A telemetry-backed or model-assisted concern that may cause delay, failure, rework, quality loss, control weakness, or poor automation outcomes.
