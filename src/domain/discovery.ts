import type {
  GraphEdge,
  GraphNode,
  ProcessGraph,
  ProcessVariant,
  WorkEvent,
  WorkEventCollection,
} from "./types";

interface OrderedCase {
  caseId: string;
  events: WorkEvent[];
  ambiguous: boolean;
}

function orderCase(caseId: string, events: WorkEvent[]): OrderedCase {
  let ambiguous = false;
  const ordered = [...events].sort((left, right) => {
    if (left.sequence !== undefined && right.sequence !== undefined) {
      const bySequence = left.sequence - right.sequence;
      if (bySequence !== 0) return bySequence;
    }
    const byTime = Date.parse(left.timestamp) - Date.parse(right.timestamp);
    if (byTime === 0) ambiguous = true;
    return byTime || left.eventId.localeCompare(right.eventId);
  });
  return { caseId, events: ordered, ambiguous };
}

export function groupAndOrderEvents(events: WorkEvent[]): OrderedCase[] {
  const groups = new Map<string, WorkEvent[]>();
  for (const event of events) {
    groups.set(event.caseId, [...(groups.get(event.caseId) ?? []), event]);
  }
  return [...groups.entries()]
    .map(([caseId, caseEvents]) => orderCase(caseId, caseEvents))
    .sort((a, b) => a.caseId.localeCompare(b.caseId));
}

function buildNodes(events: WorkEvent[]): GraphNode[] {
  const nodes = new Map<string, GraphNode>();
  const activityCaseCounts = new Map<string, Map<string, number>>();

  for (const event of events) {
    const existing = nodes.get(event.activity.id);
    const caseCounts =
      activityCaseCounts.get(event.activity.id) ?? new Map<string, number>();
    caseCounts.set(event.caseId, (caseCounts.get(event.caseId) ?? 0) + 1);
    activityCaseCounts.set(event.activity.id, caseCounts);

    if (existing) {
      existing.frequency += 1;
      existing.eventIds.push(event.eventId);
      existing.totalDurationMs += event.durationMs ?? 0;
      existing.acceptedOutcomes += event.acceptedOutcome ? 1 : 0;
      existing.exceptions +=
        event.result.status === "exception" || event.result.status === "failure" ? 1 : 0;
      if (!existing.actorIds.includes(event.actor.id)) existing.actorIds.push(event.actor.id);
      if (!existing.actorTypes.includes(event.actor.type)) {
        existing.actorTypes.push(event.actor.type);
      }
    } else {
      nodes.set(event.activity.id, {
        id: event.activity.id,
        label: event.activity.label,
        activityType: event.activity.type,
        frequency: 1,
        actorIds: [event.actor.id],
        actorTypes: [event.actor.type],
        eventIds: [event.eventId],
        acceptedOutcomes: event.acceptedOutcome ? 1 : 0,
        exceptions:
          event.result.status === "exception" || event.result.status === "failure" ? 1 : 0,
        repeats: 0,
        totalDurationMs: event.durationMs ?? 0,
        truthState: "inferred",
        confidence: 1,
        authorityLevel: event.actor.authorityLevel,
        status: "proposed",
      });
    }
  }

  for (const [activityId, counts] of activityCaseCounts) {
    const node = nodes.get(activityId);
    if (node) {
      node.repeats = [...counts.values()].reduce(
        (total, count) => total + Math.max(0, count - 1),
        0,
      );
    }
  }
  return [...nodes.values()];
}

function buildEdges(cases: OrderedCase[]): GraphEdge[] {
  const edges = new Map<string, GraphEdge>();
  for (const currentCase of cases) {
    for (let index = 0; index < currentCase.events.length - 1; index += 1) {
      const fromEvent = currentCase.events[index]!;
      const toEvent = currentCase.events[index + 1]!;
      const id = `${fromEvent.activity.id}→${toEvent.activity.id}`;
      const waitMs = Math.max(
        0,
        Date.parse(toEvent.timestamp) -
          Date.parse(fromEvent.timestamp) -
          (fromEvent.durationMs ?? 0),
      );
      const handoff = fromEvent.actor.id !== toEvent.actor.id ? 1 : 0;
      const existing = edges.get(id);
      if (existing) {
        existing.frequency += 1;
        existing.caseIds.push(currentCase.caseId);
        existing.handoffs += handoff;
        existing.waitMs.push(waitMs);
        existing.eventIds.push(fromEvent.eventId, toEvent.eventId);
      } else {
        edges.set(id, {
          id,
          from: fromEvent.activity.id,
          to: toEvent.activity.id,
          frequency: 1,
          caseIds: [currentCase.caseId],
          handoffs: handoff,
          waitMs: [waitMs],
          eventIds: [fromEvent.eventId, toEvent.eventId],
          truthState: "inferred",
          status: "proposed",
        });
      }
    }
  }
  return [...edges.values()].map((edge) => ({
    ...edge,
    caseIds: [...new Set(edge.caseIds)],
    eventIds: [...new Set(edge.eventIds)],
  }));
}

function buildVariants(cases: OrderedCase[]): ProcessVariant[] {
  const variants = new Map<string, ProcessVariant>();
  for (const currentCase of cases) {
    const activityIds = currentCase.events.map((event) => event.activity.id);
    const id = activityIds.join(" → ");
    const existing = variants.get(id);
    const acceptedOutcomes = currentCase.events.filter(
      (event) => event.acceptedOutcome,
    ).length;
    const hasException = currentCase.events.some((event) =>
      ["exception", "failure", "retry", "rollback"].includes(event.result.status),
    );
    if (existing) {
      existing.caseIds.push(currentCase.caseId);
      existing.frequency += 1;
      existing.acceptedOutcomes += acceptedOutcomes;
      existing.hasException ||= hasException;
    } else {
      variants.set(id, {
        id,
        activityIds,
        caseIds: [currentCase.caseId],
        frequency: 1,
        hasException,
        acceptedOutcomes,
      });
    }
  }
  return [...variants.values()].sort((a, b) => b.frequency - a.frequency);
}

export function discoverProcess(collection: WorkEventCollection): ProcessGraph {
  const cases = groupAndOrderEvents(collection.events);
  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    nodes: buildNodes(collection.events),
    edges: buildEdges(cases),
    variants: buildVariants(cases),
    ambiguousOrderCaseIds: cases
      .filter((currentCase) => currentCase.ambiguous)
      .map((currentCase) => currentCase.caseId),
    sourceEventIds: collection.events.map((event) => event.eventId),
  };
}
