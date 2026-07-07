import type { ProcessGraph, ProcessMetadata, WorkEventCollection } from "./types";

export function createDefaultProcessMetadata(
  graph: ProcessGraph,
  events: WorkEventCollection,
  displayName = "Creator / project delivery process",
  source: ProcessMetadata["source"] = "event-log",
): ProcessMetadata {
  const originalTaskLabels = Object.fromEntries(
    graph.nodes.map((node) => [node.id, node.label]),
  );
  const sourceName = events.events[0]?.provenance.sourceRef;
  return {
    id: "process-main",
    displayName: sourceName?.includes("bpmn") ? "Imported BPMN process" : displayName,
    source,
    confidence: graph.nodes.length ? Math.min(...graph.nodes.map((node) => node.confidence)) : 0,
    taskDisplayNames: {},
    originalTaskLabels,
  };
}

export function taskDisplayName(metadata: ProcessMetadata | undefined, nodeId: string, fallback: string): string {
  return metadata?.taskDisplayNames[nodeId] || fallback;
}
