import type {
  FlowExport,
  PrimitiveRegistry,
  ProcessGraph,
  Recommendation,
} from "./types";

export function createJsonExport(input: Omit<FlowExport, "schemaVersion" | "exportType" | "exportedAt">): FlowExport {
  return {
    schemaVersion: "1.0.0",
    exportType: "flowsensa-confirmed-process",
    exportedAt: new Date().toISOString(),
    ...input,
  };
}

export function validateFlowExport(input: unknown): input is FlowExport {
  if (typeof input !== "object" || input === null) return false;
  const candidate = input as Partial<FlowExport>;
  return (
    candidate.schemaVersion === "1.0.0" &&
    candidate.exportType === "flowsensa-confirmed-process" &&
    Boolean(candidate.events?.events) &&
    Boolean(candidate.inferredGraph?.nodes) &&
    Boolean(candidate.confirmedGraph?.nodes) &&
    Array.isArray(candidate.recommendations) &&
    Array.isArray(candidate.overrides)
  );
}

function escapeMermaid(value: string): string {
  return value.replace(/"/g, "'").replace(/[\r\n]+/g, " ");
}

export function exportMermaid(graph: ProcessGraph): string {
  const lines = ["flowchart LR"];
  for (const node of graph.nodes.filter((candidate) => candidate.status !== "rejected")) {
    lines.push(
      `  ${JSON.stringify(node.id)}["${escapeMermaid(node.label)}<br/>${node.truthState} · n=${node.frequency}"]`,
    );
  }
  for (const edge of graph.edges.filter((candidate) => candidate.status !== "rejected")) {
    lines.push(
      `  ${JSON.stringify(edge.from)} -->|"n=${edge.frequency}; handoffs=${edge.handoffs}"| ${JSON.stringify(edge.to)}`,
    );
  }
  return lines.join("\n");
}

export function exportMarkdown(
  graph: ProcessGraph,
  recommendations: Recommendation[],
  registry: PrimitiveRegistry,
): string {
  const lines = [
    "# Confirmed Flowsensa process",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Process steps",
    "",
    "| Step | Frequency | Truth state | Status |",
    "| --- | ---: | --- | --- |",
    ...graph.nodes.map(
      (node) =>
        `| ${node.label} | ${node.frequency} | ${node.truthState} | ${node.status} |`,
    ),
    "",
    "## Automation recommendations",
    "",
    ...recommendations.map(
      (recommendation) =>
        `- **${recommendation.nodeId}:** ${recommendation.automationFamily} — ${recommendation.recommendationClass} (${Math.round(recommendation.confidence * 100)}% confidence). Evidence: ${recommendation.evidenceEventIds.join(", ")}. Failure modes: ${recommendation.expectedFailureModes.join(", ")}.`,
    ),
    "",
    "## Primitive registry",
    "",
    `Registry ${registry.registryVersion}; ${registry.entries.length} governed meanings available.`,
    "",
    "## Mermaid",
    "",
    "```mermaid",
    exportMermaid(graph),
    "```",
  ];
  return lines.join("\n");
}

export function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
