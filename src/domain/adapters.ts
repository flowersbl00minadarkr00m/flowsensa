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
    if (typeof input === "string") {
      return JSON.parse(input) as unknown;
    }
    return input;
  }
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
