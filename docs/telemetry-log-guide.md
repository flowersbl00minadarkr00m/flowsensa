# Telemetry Log Guide

FlowSensa works best when you give it a simple telemetry log: one event per meaningful step in a human, agent, or system workflow. Mnemosync is one source, but it is not required.

## Minimal Event Shape

Create a JSON file with this shape:

```json
{
  "schemaVersion": "1.0.0",
  "exportedAt": "2026-07-07T00:00:00.000Z",
  "events": [
    {
      "eventId": "case-1-step-1",
      "caseId": "case-1",
      "timestamp": "2026-07-07T00:00:00.000Z",
      "sequence": 0,
      "durationMs": 120000,
      "activity": { "id": "draft", "label": "Draft post", "type": "execute" },
      "actor": { "id": "human-henry", "label": "Henry", "type": "human" },
      "result": { "status": "success" },
      "truthState": "observed",
      "provenance": {
        "sourceType": "manual",
        "sourceRef": "local-log://case-1",
        "ingestedAt": "2026-07-07T00:01:00.000Z"
      }
    }
  ]
}
```

## Capturing Human vs Agent Work

Use `actor.type` to distinguish who performed the step:

- `human` for a person doing or approving work.
- `agent` for an AI or automation agent.
- `system` for software infrastructure performing a step.
- `service-account` for machine credentials.
- `external` when the actor is outside your boundary.

Use `system` when you know the tool or model behind an agent step:

```json
"actor": { "id": "agent-codex", "label": "Codex", "type": "agent" },
"system": { "id": "openai-api", "label": "OpenAI API", "tool": "codex", "model": "gpt-4.1" }
```

## Cost And Time Telemetry

FlowSensa accepts practical resource telemetry for process analysis:

- `financial`
- `input-tokens`
- `output-tokens`
- `cached-tokens`
- `reasoning-tokens`
- `human-time`
- `compute`
- `storage`
- `network`

Carbon, water, and energy/electricity measurements are intentionally out of scope for this version.

Example:

```json
"resources": [
  {
    "kind": "input-tokens",
    "value": 1500,
    "unit": "tokens",
    "measurementClass": "provider-reported",
    "sourceRef": "usage://case-1-step-2"
  },
  {
    "kind": "human-time",
    "value": 8,
    "unit": "minutes",
    "measurementClass": "estimated",
    "allocationMethod": "manual timer",
    "sourceRef": "timer://case-1-step-2"
  }
]
```

## Open Source Tooling Options

- OpenTelemetry Collector: vendor-neutral collection and export for application telemetry.
- OpenLIT: OpenTelemetry-native LLM observability.
- Langfuse: open source LLM observability, traces, evals, prompt management, and self-hosting.
- LiteLLM Proxy: model gateway with spend tracking and provider-normalized calls.
- SQLite or PGlite: local-first event log if you want the log on your machine before exporting JSON.

## Prompts To Generate A Telemetry Log

Use these prompts with your coding agent or local assistant:

```text
Create a FlowSensa work-event JSON log for this workflow. For each meaningful step, include eventId, caseId, timestamp, sequence, durationMs if known, activity id/label/type, actor id/label/type, optional system tool/model, result status, truthState, provenance, and practical resources such as tokens, human-time, compute, storage, network, or financial cost. Do not include carbon, water, or energy resources.
```

```text
Convert this OpenTelemetry or LLM observability trace into FlowSensa schema v1.0.0. Preserve actor identity, model/tool identity, token counts, human-time estimates, result status, and provenance. Drop fields that cannot pass the schema instead of inventing data.
```

```text
Review this FlowSensa telemetry JSON before import. Find missing case IDs, out-of-order sequences, unknown actor types, invalid resource measurement classes, and places where a human approval step should be represented explicitly.
```

## Storage Posture

FlowSensa is local-first in the browser and can import a plain JSON log. Supabase-backed Mnemosync is useful for shared multi-agent telemetry, but it is not required. If you want to commit harder to local sovereignty, keep a SQLite or PGlite event log and export FlowSensa-compatible JSON when you want analysis.
