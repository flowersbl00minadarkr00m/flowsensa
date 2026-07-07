# Feature: Telemetry Portability And Resource Mapping

> Status: Approved
> Source: User approval to proceed with telemetry enhancements, 2026-07-07

## Overview

FlowSensa should preserve enough telemetry to show which human, agent, system, tool, or model performed each process step, while keeping the product portable beyond Mnemosync.

## Requirements

- WHEN telemetry is synced from Mnemosync, THE SYSTEM SHALL preserve actor identity, system/tool/model identity, duration, confidence, agent source, and practical resource telemetry where schema-valid.
- WHEN resources are mapped, THE SYSTEM SHALL include financial, token, human-time, compute, storage, and network resources only.
- THE SYSTEM SHALL NOT include carbon, water, or energy/electricity resource telemetry in this version.
- WHEN a user opens Activity Log or an event detail, THE SYSTEM SHALL make actor and model/tool context visible.
- WHEN a GitHub user wants to use FlowSensa without Mnemosync, THE PROJECT SHALL document how to create or map a compatible telemetry log.

## Decisions

- Mnemosync remains a first-party upstream, not a hard requirement.
- Supabase remains acceptable as a shared/private-cloud layer because the data can migrate to self-hosted Postgres later.
- SQLite or PGlite should be recommended as a stricter local-sovereignty option.
