import type {
  FlowExport,
  PrimitiveRegistry,
  ProcessGraph,
  ProcessMetadata,
  Recommendation,
  TaskInsight,
} from "./types";
import { taskDisplayName } from "./processMetadata";

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

export function exportProcessMapJson(
  graph: ProcessGraph,
  metadata: ProcessMetadata,
  insights: TaskInsight[],
): string {
  return JSON.stringify({
    schemaVersion: "1.0.0",
    exportType: "flowsensa-process-map",
    exportedAt: new Date().toISOString(),
    process: metadata,
    tasks: graph.nodes
      .filter((node) => node.status !== "rejected")
      .map((node) => ({
        id: node.id,
        displayName: taskDisplayName(metadata, node.id, node.label),
        originalLabel: metadata.originalTaskLabels[node.id] ?? node.label,
        status: node.status,
        truthState: node.truthState,
        frequency: node.frequency,
        confidence: node.confidence,
        insight: insights.find((insight) => insight.nodeId === node.id),
      })),
    transitions: graph.edges
      .filter((edge) => edge.status !== "rejected")
      .map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        frequency: edge.frequency,
        handoffs: edge.handoffs,
        truthState: edge.truthState,
        status: edge.status,
      })),
  }, null, 2);
}

export function exportProcessMapMarkdown(
  graph: ProcessGraph,
  metadata: ProcessMetadata,
  insights: TaskInsight[],
): string {
  const lines = [
    `# ${metadata.displayName}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    `Source: ${metadata.source}`,
    `Minimum confidence: ${Math.round(metadata.confidence * 100)}%`,
    "",
    "## Tasks",
    "",
    "| Display name | Original label | Events | Cases | Exceptions | Retries | Evidence note |",
    "| --- | --- | ---: | ---: | ---: | ---: | --- |",
    ...graph.nodes
      .filter((node) => node.status !== "rejected")
      .map((node) => {
        const insight = insights.find((candidate) => candidate.nodeId === node.id);
        return `| ${taskDisplayName(metadata, node.id, node.label)} | ${metadata.originalTaskLabels[node.id] ?? node.label} | ${insight?.eventCount ?? node.frequency} | ${insight?.caseCount ?? 0} | ${insight?.exceptionCount ?? node.exceptions} | ${insight?.retryCount ?? node.repeats} | ${(insight?.insufficientTelemetry ?? []).join("; ") || "Telemetry available"} |`;
      }),
    "",
    "## Transitions",
    "",
    "| From | To | Frequency | Handoffs |",
    "| --- | --- | ---: | ---: |",
    ...graph.edges
      .filter((edge) => edge.status !== "rejected")
      .map((edge) => {
        const from = graph.nodes.find((node) => node.id === edge.from);
        const to = graph.nodes.find((node) => node.id === edge.to);
        return `| ${from ? taskDisplayName(metadata, from.id, from.label) : edge.from} | ${to ? taskDisplayName(metadata, to.id, to.label) : edge.to} | ${edge.frequency} | ${edge.handoffs} |`;
      }),
    "",
    "## Mermaid",
    "",
    "```mermaid",
    exportMermaid({
      ...graph,
      nodes: graph.nodes.map((node) => ({
        ...node,
        label: taskDisplayName(metadata, node.id, node.label),
      })),
    }),
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
