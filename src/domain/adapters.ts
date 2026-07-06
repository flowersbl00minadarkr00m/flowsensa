import type { WorkEventCollection } from "./types";

export interface TelemetryAdapter {
  readonly id: string;
  readonly label: string;
  import(input: unknown): Promise<unknown>;
}

export class JsonFileTelemetryAdapter implements TelemetryAdapter {
  readonly id = "json-file";
  readonly label = "JSON file";

  async import(input: unknown): Promise<unknown> {
    const parsed = typeof input === "string"
      ? JSON.parse(input) as unknown
      : input;
    return omitNullObjectProperties(parsed);
  }
}

/**
 * SQL-backed JSON exports commonly serialize absent optional fields as null.
 * The work-event schema represents absence by omitting those properties.
 * Keep null array items so malformed collections still fail validation.
 */
export function omitNullObjectProperties(value: unknown): unknown {
  const optionalNullableKeys = new Set([
    "traceId",
    "parentEventId",
    "sequence",
    "durationMs",
    "intent",
    "transition",
    "system",
    "objects",
    "decision",
    "evidence",
    "resources",
    "acceptedOutcome",
    "confidence",
    "tags",
    "primitiveVersion",
    "role",
    "authorityLevel",
    "version",
    "tool",
    "model",
    "reasonCode",
    "message",
    "retryCount",
    "transformation",
    "contentHash",
    "classification",
    "sourceRef",
    "allocationMethod",
    "notes",
  ]);
  if (Array.isArray(value)) {
    return value.map((item) => omitNullObjectProperties(item));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, item]) => item !== null || !optionalNullableKeys.has(key))
      .map(([key, item]) => [key, omitNullObjectProperties(item)]),
  );
}

export interface OpenTelemetryWorkEvent {
  timeUnixNano?: string;
  name?: string;
  attributes?: Record<string, unknown>;
}

export class OpenTelemetryShapedAdapter implements TelemetryAdapter {
  readonly id = "opentelemetry-shaped";
  readonly label = "OpenTelemetry-shaped boundary";

  async import(input: unknown): Promise<unknown> {
    const records = input as OpenTelemetryWorkEvent[];
    if (!Array.isArray(records)) {
      throw new Error("OpenTelemetry input must be an array of records.");
    }
    throw new Error(
      "OpenTelemetry mapping is an adapter boundary in this MVP. Configure an explicit attribute map before import.",
    );
  }
}

export function isWorkEventCollection(value: unknown): value is WorkEventCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    "events" in value &&
    Array.isArray((value as { events?: unknown }).events)
  );
}
