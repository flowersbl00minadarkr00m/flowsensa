import type { ProcessGraph, TaskInsight, WorkEvent } from "./types";

function median(values: number[]): number | undefined {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return undefined;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

export function buildTaskInsight(
  nodeId: string,
  graph: ProcessGraph,
  events: WorkEvent[],
): TaskInsight {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    return {
      nodeId,
      eventCount: 0,
      caseCount: 0,
      actorMix: [],
      totalDurationMs: 0,
      exceptionCount: 0,
      retryCount: 0,
      reworkSignals: [],
      upstream: [],
      downstream: [],
      evidenceEventIds: [],
      insufficientTelemetry: ["Task is not present in the selected process graph."],
    };
  }
  const nodeEvents = events.filter((event) => node.eventIds.includes(event.eventId));
  const durations = nodeEvents.map((event) => event.durationMs ?? 0).filter(Boolean);
  const upstream = graph.edges.filter((edge) => edge.to === nodeId).map((edge) => edge.from);
  const downstream = graph.edges.filter((edge) => edge.from === nodeId).map((edge) => edge.to);
  const retryCount = nodeEvents.reduce((sum, event) => sum + (event.result.retryCount ?? 0), 0) +
    nodeEvents.filter((event) => event.result.status === "retry").length;
  const exceptionCount = nodeEvents.filter((event) =>
    ["failure", "exception", "rollback", "cancelled"].includes(event.result.status),
  ).length;
  const insufficientTelemetry: string[] = [];
  if (!durations.length) insufficientTelemetry.push("No duration telemetry is available for this task.");
  if (nodeEvents.length < 3) insufficientTelemetry.push("Fewer than three observations are available.");
  if (!node.owner) insufficientTelemetry.push("No owner is confirmed for this task.");
  return {
    nodeId,
    eventCount: nodeEvents.length,
    caseCount: new Set(nodeEvents.map((event) => event.caseId)).size,
    actorMix: [...new Set(nodeEvents.map((event) => event.actor.type))],
    medianDurationMs: median(durations),
    totalDurationMs: durations.reduce((sum, value) => sum + value, 0),
    exceptionCount,
    retryCount,
    reworkSignals: [
      ...(node.repeats > 0 ? [`${node.repeats} repeated observation${node.repeats === 1 ? "" : "s"}`] : []),
      ...(retryCount > 0 ? [`${retryCount} retry signal${retryCount === 1 ? "" : "s"}`] : []),
    ],
    upstream,
    downstream,
    evidenceEventIds: node.eventIds,
    insufficientTelemetry,
  };
}

export function buildTaskInsights(graph: ProcessGraph, events: WorkEvent[]): TaskInsight[] {
  return graph.nodes.map((node) => buildTaskInsight(node.id, graph, events));
}
