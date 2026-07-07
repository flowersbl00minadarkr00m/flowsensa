# Feature: Resource Usage

> Status: Approved
> Source: User request on 2026-07-07: "add this feature, even if the token usage is an estimate (though strong preference for actual data on consumption by these telemetry events)"

## Overview

FlowSensa should make token, cost, and human-time telemetry visible as a first-class process intelligence view. The feature helps a user understand which human, agent, system, tool, or model consumed resources across a selected process, while preserving the product's evidence-first posture.

## Business Context

FlowSensa already accepts practical resource telemetry on work events, including token counts, human time, compute, storage, network, and financial cost. Today that data is buried per event, and cost estimates appear only inside some Process Enhancement notes. A visible Resource Usage view makes the telemetry useful for deciding where work is expensive, under-instrumented, or worth redesigning.

## User Stories

### US-001: See resource totals for a process

**As a** creator, builder, or process analyst  
**I want to** see token, cost, and time totals for the selected process  
**So that** I can understand resource intensity without inspecting every event manually

**Acceptance Criteria:**
- [ ] The selected process exposes aggregate resource totals when resource telemetry exists.
- [ ] Actual provider-reported or logged values are visually distinguished from estimated values.
- [ ] Empty states explain that better results require events with resource telemetry.

### US-002: Identify resource drivers

**As a** user evaluating human-agent work  
**I want to** see resource usage by task, actor type, model/tool, and case  
**So that** I can identify expensive or under-measured parts of the process

**Acceptance Criteria:**
- [ ] The view shows top tasks by tokens, cost, and human time when available.
- [ ] The view shows model/tool usage when events include system model or tool fields.
- [ ] Rows preserve links back to evidence events or task details.

### US-003: Understand telemetry quality

**As a** user deciding whether to trust the analysis  
**I want to** know where token or cost data is actual, estimated, unknown, or missing  
**So that** I do not mistake weak telemetry for precise process economics

**Acceptance Criteria:**
- [ ] The view reports how many events have resource telemetry.
- [ ] The view reports missing token/cost coverage for agent or LLM-associated events.
- [ ] Estimated totals are labeled as estimates and do not overwrite actual logged values.

## Functional Requirements

### FR-001: Resource Usage surface - Must Have

WHEN a user opens FlowSensa  
THE SYSTEM SHALL provide a Resource Usage view in the main navigation  
SO THAT token, cost, and time telemetry is not buried in the Evidence Log.

### FR-002: Actual telemetry aggregation - Must Have

WHEN the selected process contains event `resources`  
THE SYSTEM SHALL aggregate resource values by kind, measurement class, task, actor type, case, and system/model where available  
SO THAT the user can inspect actual consumption patterns from telemetry events.

### FR-003: Estimated resource handling - Must Have

WHEN resource usage is unknown but estimable from available events or enhancement cost models  
THE SYSTEM SHALL label estimates clearly and keep them separate from actual provider-reported or logged values  
SO THAT users can use estimates without mistaking them for facts.

### FR-004: LLM/model consumption focus - Must Have

WHEN events include agent actors, model names, tools, or token resource kinds  
THE SYSTEM SHALL summarize model/tool consumption and flag missing token or cost telemetry  
SO THAT users can answer which LLM or agent consumed resources and where logging needs improvement.

### FR-005: Evidence drill-down - Should Have

WHEN a resource row is shown  
THE SYSTEM SHOULD allow the user to open the supporting event or related task details  
SO THAT resource claims remain traceable to operational evidence.

### FR-006: Export compatibility - Could Have

WHEN a user exports process analysis  
THE SYSTEM COULD include resource summary data in Markdown or JSON exports  
SO THAT resource usage can travel with the process map.

## Non-Functional Requirements

### NFR-001: Trust and clarity
- The UI must never present estimated token/cost values as confirmed facts.
- Labels must use plain language such as "Actual telemetry", "Estimated", "Unknown", and "Missing".

### NFR-002: Privacy
- Resource usage analysis must run locally from imported or synchronized events.
- No additional model call is required to compute the deterministic resource view.

### NFR-003: Performance
- Aggregation must handle the current prototype-scale event set without noticeable UI delay.

### NFR-004: Accessibility
- Resource tables and summary cards must be keyboard accessible and readable on desktop and mobile.

## Out of Scope

- Carbon, water, electricity, or energy accounting.
- Provider billing reconciliation against external invoices.
- Real-time metering from live API calls.
- Persisting API keys or querying LLM providers for historical usage.

## Decisions

### D-001: Actual telemetry first, estimates second

**Decision:** The feature must prioritize event-provided resource data and only show estimates when clearly labeled.  
**Reason:** The user strongly prefers actual consumption data but accepts estimates when actual telemetry is unavailable.  
**Source:** Direct user instruction.  
**Impacts:** FR-002, FR-003, FR-004, NFR-001

### D-002: Exclude carbon, water, and energy

**Decision:** Resource usage excludes carbon, water, electricity, and energy telemetry.  
**Reason:** The user explicitly excluded these metrics earlier, and FlowSensa's current schema rejects them.  
**Source:** Prior user instruction and telemetry portability spec.  
**Impacts:** Out of Scope, NFR-001

## Questions

None blocking.

## Glossary

- **Actual telemetry:** Resource data included in imported or synchronized work events, especially provider-reported or directly logged values.
- **Estimated telemetry:** A calculated approximation derived from event structure, model defaults, or recommendation cost models.
- **Resource coverage:** The share of relevant events that include resource measurements.
