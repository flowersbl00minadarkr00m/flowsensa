# Design: Telemetry Portability And Resource Mapping

> Requirements: @requirements.md
> Status: Approved

## Approach

- Extend the Mnemosync sync mapper to copy schema-valid `system`, `durationMs`, `confidence`, `agent_source`, and `resources`.
- Keep resource mapping strict so malformed nested values do not break the entire import.
- Exclude water and energy/electricity from the schema and mapper; carbon is not introduced.
- Show actor/system/model/resource context in Activity Log and Event Details.
- Document standalone telemetry-log setup in README and `docs/telemetry-log-guide.md`.

## Privacy / Sovereignty

FlowSensa remains local-first by default. Shared Supabase-backed Mnemosync sync is optional. Local SQLite or PGlite logs are recommended for users who want a stronger local-sovereignty posture.
