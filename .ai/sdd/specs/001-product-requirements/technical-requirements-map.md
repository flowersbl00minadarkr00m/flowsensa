# Flowsensa User-to-Technical Requirements Map

> Status: Non-binding technical assessment
> SDD Gate: `requirements:draft`
> Evidence date: 2026-07-04

This is not an approved `design.md` and does not authorize implementation.

| User requirement | Technical requirement | State | Evidence / future work |
|---|---|---|---|
| Consume Mnemosync telemetry | Versioned JSON adapter and AJV validation | **Current** | `src/domain/adapters.ts`, `validation.ts`, schemas, producer E2E |
| Reconstruct sequences and variants | Deterministic case-ordering and graph engine | **Current** | `src/domain/discovery.ts` and domain tests |
| Distinguish actor types | Actor type retained through events, graph, UI, export | **Current** | Domain types and Observe/Registry views |
| Correct inferred facts | Truth states, override records, undo, merge/split, ownership edits | **Current** | `TruthBadge.tsx`, `ConfirmView.tsx` |
| Detect friction and gaps | Deterministic discovery/gap rules with evidence IDs | **Current** | `discovery.ts`, `gaps.ts`, `EvidenceLinks.tsx` |
| Recommend Automation, LLM, Hybrid | Deterministic rubric plus approved user-facing taxonomy | **Partial** | Rubric exists; current copy still uses older labels |
| Explain uncertainty and controls | Structured factors, failure modes, and evidence links | **Current** | Recommendation domain types and Engineer view |
| Generate AI-assisted insights | Same-origin Vercel Function, deterministic context builder, structured response schema, advisory provenance | **Future** | No model call exists |
| Public credential safety | No server fallback; BYOK remains in session memory and is forwarded only per request | **Future** | Showcase is keyless; BYOK UI/proxy absent |
| Henry's model-enabled instance | Protected Vercel deployment with server-only `OPENROUTER_API_KEY` | **Future** | Deployment exists; private instance/function absent |
| Family-specific briefs | Schema-backed Automation, LLM, and Hybrid artifact generators | **Future** | Current export lacks implementation briefs |
| Send needs to OSSensa | Versioned `tooling-requirement` payload with capabilities, constraints, evidence, and privacy-safe summary | **Future** | Contract absent |
| Export confirmed maps | Versioned JSON, Markdown, and Mermaid | **Current** | `src/domain/exports.ts`, `ExportView.tsx` |
| Save decisions to Obsidian | Generate Markdown and require explicit export/sync | **Future** | General Markdown export exists; decision handoff absent |
| Link cost/time evidence | Store external LocalCFO IDs without recalculation | **Future** | Accounting intentionally outside Flowsensa |
| Local-first privacy | IndexedDB, explicit deletion, no background analytics | **Current** | `src/domain/storage.ts`; network E2E |
| Hosted personal workspace | Authenticated user-scoped sync behind a storage adapter | **Future** | No auth or hosted persistence |
| Automatic Mnemosync ingestion | Append-only source feed, stable event IDs, per-source cursor, idempotent upsert, schema negotiation, and visible sync health | **Future** | Current integration is manual file import; Mnemosync only polls its own browser storage |
| Recurring refresh | Scheduled synchronization plus manual “Sync now,” bounded retry, checkpoint recovery, and rejected-event diagnostics | **Future** | No Flowsensa polling, push, watcher, or subscription exists |
| Historical trends | Versioned event history and process revisions with comparable time windows | **Future** | Current workspace represents one imported state |
| Operational dashboards | Queryable KPI layer for volume, throughput, wait, rework, retries, exceptions, handoffs, outcomes, variants, and actors | **Future** | Current UI exposes case-level observations but no historical KPI layer |
| Alerts | Deterministic rule engine, severity, acknowledgment/mute/resolve lifecycle, evidence links, and alert history | **Future** | No alert model or background evaluator |
| Filtering and bottleneck statistics | Composable filter specification and repeatable aggregate calculations | **Future** | Current analyst offers six predetermined deterministic questions |
| Root-cause analysis | Deterministic cohort comparison and ranked candidate factors before model interpretation | **Future** | Current gap rules do not perform cohort/root-cause statistics |
| AI Analyst | OpenRouter receives bounded KPI/filter/evidence context and returns structured fact/hypothesis/gap/recommendation sections with citations | **Future** | No model call exists |
| Task mining | Local Mnemosync capture companion normalizes allowlisted app/window/action metadata into privacy-reduced task events | **Future** | Neither project currently captures human desktop/browser interactions |
| Live activity demonstration | Demo producer emits schema-valid events through the normal ingestion path; derived stores trigger activity, process, case, KPI, and chart updates | **Future** | Static showcase exists; no live event simulation or incremental UI update |
| Reactive process path | Shared selection model supports hover/focus/tap details and evidence-linked cross-filtering | **Future** | Current graph views do not provide complete node-to-log drill-down |
| Responsive desktop/mobile UI | Breakpoint-specific navigation, wrapping, table-to-card transformation, and touch-safe controls | **Future** | Mobile layout and screenshot coverage are not verified |
| OpenRouter BYOK settings | Session-only masked key, connection test, model selection, bounded-context review, and disconnect | **Future** | Requirement exists; settings UI and proxy are absent |

## Architecture boundary

```text
Mnemosync events
  -> deterministic Flowsensa core
  -> confirmed process revision
       -> versioned export
       -> advisory OpenRouter call
       -> OSSensa tooling requirement
       -> Mnemosync implementation ticket
       -> Obsidian decision export
       -> LocalCFO reference
```

- Mnemosync owns capture and execution tracking.
- Flowsensa owns reconstruction, confirmation, and automation analysis.
- OSSensa owns external open-source discovery.
- SancusSight owns accepted assets and controls.
- LocalCFO owns accounting.
