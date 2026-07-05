import Ajv2020, { type ErrorObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import workEventSchema from "../schemas/work-event.schema.json";
import workPrimitivesSchema from "../schemas/work-primitives.schema.json";
import type { PrimitiveRegistry, WorkEventCollection } from "./types";

export interface ValidationIssue {
  eventId: string;
  field: string;
  reason: string;
  keyword: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  issues: ValidationIssue[];
  acceptedCount: number;
  rejectedCount: number;
}

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);

const validateEventsSchema = ajv.compile(workEventSchema);
const validatePrimitivesSchema = ajv.compile(workPrimitivesSchema);

function eventIndexFromPath(path: string): number | undefined {
  const match = path.match(/^\/events\/(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function normalizePath(error: ErrorObject): string {
  if (error.keyword === "required") {
    const missing = (error.params as { missingProperty: string }).missingProperty;
    return error.instancePath ? `${error.instancePath}/${missing}` : missing;
  }
  if (error.keyword === "additionalProperties") {
    const extra = (error.params as { additionalProperty: string }).additionalProperty;
    return error.instancePath ? `${error.instancePath}/${extra}` : extra;
  }
  return error.instancePath || "/";
}

function issuesFromErrors(
  input: unknown,
  errors: ErrorObject[] | null | undefined,
): ValidationIssue[] {
  const events =
    typeof input === "object" && input !== null && "events" in input
      ? (input as { events?: unknown[] }).events
      : undefined;

  return (errors ?? []).map((error) => {
    const index = eventIndexFromPath(error.instancePath);
    const candidate = index === undefined ? undefined : events?.[index];
    const eventId =
      typeof candidate === "object" &&
      candidate !== null &&
      "eventId" in candidate &&
      typeof candidate.eventId === "string" &&
      candidate.eventId
        ? candidate.eventId
        : index === undefined
          ? "collection"
          : `events[${index}]`;
    return {
      eventId,
      field: normalizePath(error).replace(/^\/events\/\d+\/?/, "") || "(event)",
      reason: error.message ?? "Schema validation failed",
      keyword: error.keyword,
    };
  });
}

export function validateWorkEvents(input: unknown): ValidationResult<WorkEventCollection> {
  const valid = validateEventsSchema(input);
  const eventCount =
    typeof input === "object" &&
    input !== null &&
    "events" in input &&
    Array.isArray(input.events)
      ? input.events.length
      : 0;
  const issues = issuesFromErrors(input, validateEventsSchema.errors);
  const rejectedEvents = new Set(
    issues
      .map((issue) => issue.eventId)
      .filter((eventId) => eventId !== "collection"),
  ).size;

  return {
    valid,
    data: valid ? (input as unknown as WorkEventCollection) : undefined,
    issues,
    acceptedCount: valid ? eventCount : 0,
    rejectedCount: valid ? 0 : Math.max(rejectedEvents, eventCount > 0 ? 1 : 0),
  };
}

export function validatePrimitiveRegistry(input: unknown): ValidationResult<PrimitiveRegistry> {
  const valid = validatePrimitivesSchema(input);
  const issues = issuesFromErrors(input, validatePrimitivesSchema.errors).map((issue) => ({
    ...issue,
    eventId: issue.eventId === "collection" ? "registry" : issue.eventId,
  }));
  const entryCount =
    typeof input === "object" &&
    input !== null &&
    "entries" in input &&
    Array.isArray(input.entries)
      ? input.entries.length
      : 0;
  return {
    valid,
    data: valid ? (input as unknown as PrimitiveRegistry) : undefined,
    issues,
    acceptedCount: valid ? entryCount : 0,
    rejectedCount: valid ? 0 : entryCount,
  };
}
