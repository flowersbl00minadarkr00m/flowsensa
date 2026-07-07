import type {
  GraphNode,
  MeasurementClass,
  ResourceKind,
  ResourceMeasurement,
  WorkEvent,
} from "./types";

type MeasurementBucket = "actual" | "estimated" | "unknown";

export interface ResourceQuantity {
  actual: number;
  estimated: number;
  unknownCount: number;
  eventIds: string[];
}

export interface ResourceTotal extends ResourceQuantity {
  kind: ResourceKind;
  unit: string;
}

export interface ResourceDriverRow {
  id: string;
  label: string;
  eventIds: string[];
  eventCount: number;
  tokens: ResourceQuantity;
  cost: ResourceQuantity;
  humanTimeMinutes: ResourceQuantity;
  missingResourceEvents: number;
}

export interface ModelUsageRow extends ResourceDriverRow {
  model?: string;
  tool?: string;
  systemLabel?: string;
}

export interface ResourceUsageSummary {
  totalEvents: number;
  resourceEventCount: number;
  missingResourceEventCount: number;
  agentOrModelEventCount: number;
  agentOrModelMissingResourceCount: number;
  totals: ResourceTotal[];
  overallTokens: ResourceQuantity;
  overallCost: ResourceQuantity;
  overallHumanTimeMinutes: ResourceQuantity;
  byTask: ResourceDriverRow[];
  byCase: ResourceDriverRow[];
  byActorType: ResourceDriverRow[];
  byModel: ModelUsageRow[];
}

const TOKEN_KINDS = new Set<ResourceKind>([
  "input-tokens",
  "output-tokens",
  "cached-tokens",
  "reasoning-tokens",
]);

function emptyQuantity(): ResourceQuantity {
  return { actual: 0, estimated: 0, unknownCount: 0, eventIds: [] };
}

function bucketFor(measurementClass: MeasurementClass, value: number | null): MeasurementBucket {
  if (value === null || measurementClass === "unknown") return "unknown";
  if (measurementClass === "estimated") return "estimated";
  return "actual";
}

function addQuantity(target: ResourceQuantity, amount: number | null, bucket: MeasurementBucket, eventId: string) {
  if (!target.eventIds.includes(eventId)) target.eventIds.push(eventId);
  if (bucket === "unknown" || amount === null) {
    target.unknownCount += 1;
    return;
  }
  if (bucket === "estimated") target.estimated += amount;
  else target.actual += amount;
}

function normalizeTokenValue(resource: ResourceMeasurement): number | null {
  if (resource.value === null) return null;
  return resource.value;
}

function normalizeCostUsd(resource: ResourceMeasurement): number | null {
  if (resource.value === null) return null;
  const unit = resource.unit.toLowerCase();
  if (unit === "usd" || unit === "$" || unit === "dollar" || unit === "dollars") return resource.value;
  return resource.value;
}

function normalizeHumanTimeMinutes(resource: ResourceMeasurement): number | null {
  if (resource.value === null) return null;
  const unit = resource.unit.toLowerCase();
  if (unit.startsWith("hour")) return resource.value * 60;
  if (unit.startsWith("sec")) return resource.value / 60;
  if (unit === "ms" || unit === "millisecond" || unit === "milliseconds") return resource.value / 60_000;
  return resource.value;
}

function mergeQuantity(target: ResourceQuantity, source: ResourceQuantity) {
  target.actual += source.actual;
  target.estimated += source.estimated;
  target.unknownCount += source.unknownCount;
  for (const eventId of source.eventIds) {
    if (!target.eventIds.includes(eventId)) target.eventIds.push(eventId);
  }
}

function createDriverRow(id: string, label: string): ResourceDriverRow {
  return {
    id,
    label,
    eventIds: [],
    eventCount: 0,
    tokens: emptyQuantity(),
    cost: emptyQuantity(),
    humanTimeMinutes: emptyQuantity(),
    missingResourceEvents: 0,
  };
}

function addEventToRow(row: ResourceDriverRow, event: WorkEvent) {
  row.eventCount += 1;
  if (!row.eventIds.includes(event.eventId)) row.eventIds.push(event.eventId);
  if (!event.resources?.length) row.missingResourceEvents += 1;
  for (const resource of event.resources ?? []) {
    const bucket = bucketFor(resource.measurementClass, resource.value);
    if (TOKEN_KINDS.has(resource.kind)) {
      addQuantity(row.tokens, normalizeTokenValue(resource), bucket, event.eventId);
    } else if (resource.kind === "financial") {
      addQuantity(row.cost, normalizeCostUsd(resource), bucket, event.eventId);
    } else if (resource.kind === "human-time") {
      addQuantity(row.humanTimeMinutes, normalizeHumanTimeMinutes(resource), bucket, event.eventId);
    }
  }
}

function sortDrivers<T extends ResourceDriverRow>(rows: T[]): T[] {
  return rows.sort((a, b) => {
    const bScore = b.tokens.actual + b.tokens.estimated + b.cost.actual * 1000 + b.cost.estimated * 1000 + b.humanTimeMinutes.actual + b.humanTimeMinutes.estimated;
    const aScore = a.tokens.actual + a.tokens.estimated + a.cost.actual * 1000 + a.cost.estimated * 1000 + a.humanTimeMinutes.actual + a.humanTimeMinutes.estimated;
    return bScore - aScore || b.eventCount - a.eventCount || a.label.localeCompare(b.label);
  });
}

export function buildResourceUsage(events: WorkEvent[], nodes: GraphNode[] = []): ResourceUsageSummary {
  const totals = new Map<string, ResourceTotal>();
  const byCase = new Map<string, ResourceDriverRow>();
  const byActorType = new Map<string, ResourceDriverRow>();
  const byModel = new Map<string, ModelUsageRow>();
  const taskRows = new Map<string, ResourceDriverRow>();
  const eventToNode = new Map<string, GraphNode>();

  for (const node of nodes) {
    const row = createDriverRow(node.id, node.label);
    taskRows.set(node.id, row);
    for (const eventId of node.eventIds) eventToNode.set(eventId, node);
  }

  let resourceEventCount = 0;
  let agentOrModelEventCount = 0;
  let agentOrModelMissingResourceCount = 0;

  for (const event of events) {
    const hasResources = Boolean(event.resources?.length);
    if (hasResources) resourceEventCount += 1;
    const isAgentOrModel = event.actor.type === "agent" || Boolean(event.system?.model || event.system?.tool);
    if (isAgentOrModel) {
      agentOrModelEventCount += 1;
      if (!hasResources) agentOrModelMissingResourceCount += 1;
    }

    const caseRow = byCase.get(event.caseId) ?? createDriverRow(event.caseId, event.caseId);
    byCase.set(event.caseId, caseRow);
    addEventToRow(caseRow, event);

    const actorRow = byActorType.get(event.actor.type) ?? createDriverRow(event.actor.type, event.actor.type);
    byActorType.set(event.actor.type, actorRow);
    addEventToRow(actorRow, event);

    const node = eventToNode.get(event.eventId);
    if (node) addEventToRow(taskRows.get(node.id)!, event);

    if (isAgentOrModel) {
      const modelKey = [event.system?.model, event.system?.tool, event.actor.label].filter(Boolean).join(" / ");
      const key = modelKey || event.actor.id;
      const modelRow = byModel.get(key) ?? {
        ...createDriverRow(key, modelKey || event.actor.label),
        model: event.system?.model,
        tool: event.system?.tool,
        systemLabel: event.system?.label,
      };
      byModel.set(key, modelRow);
      addEventToRow(modelRow, event);
    }

    for (const resource of event.resources ?? []) {
      const key = `${resource.kind}:${resource.unit}`;
      const total = totals.get(key) ?? {
        kind: resource.kind,
        unit: resource.unit,
        ...emptyQuantity(),
      };
      totals.set(key, total);
      addQuantity(total, resource.value, bucketFor(resource.measurementClass, resource.value), event.eventId);
    }
  }

  const overallTokens = emptyQuantity();
  const overallCost = emptyQuantity();
  const overallHumanTimeMinutes = emptyQuantity();
  for (const row of byCase.values()) {
    mergeQuantity(overallTokens, row.tokens);
    mergeQuantity(overallCost, row.cost);
    mergeQuantity(overallHumanTimeMinutes, row.humanTimeMinutes);
  }

  return {
    totalEvents: events.length,
    resourceEventCount,
    missingResourceEventCount: events.length - resourceEventCount,
    agentOrModelEventCount,
    agentOrModelMissingResourceCount,
    totals: [...totals.values()].sort((a, b) => a.kind.localeCompare(b.kind)),
    overallTokens,
    overallCost,
    overallHumanTimeMinutes,
    byTask: sortDrivers([...taskRows.values()].filter((row) => row.eventCount > 0)),
    byCase: sortDrivers([...byCase.values()]),
    byActorType: sortDrivers([...byActorType.values()]),
    byModel: sortDrivers([...byModel.values()]),
  };
}
