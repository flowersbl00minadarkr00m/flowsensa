import type { ProcessMetadata, ProcessRisk, Recommendation, TaskInsight } from "./types";
import { taskDisplayName } from "./processMetadata";

export function buildProcessRisks(
  metadata: ProcessMetadata,
  insights: TaskInsight[],
  recommendations: Recommendation[],
): ProcessRisk[] {
  const risks: ProcessRisk[] = [];
  for (const insight of insights) {
    const rec = recommendations.find((candidate) => candidate.nodeId === insight.nodeId);
    const taskName = taskDisplayName(
      metadata,
      insight.nodeId,
      metadata.originalTaskLabels[insight.nodeId] ?? insight.nodeId,
    );
    const base = {
      processId: metadata.id,
      processName: metadata.displayName,
      nodeId: insight.nodeId,
      taskName,
      source: "deterministic" as const,
      evidenceEventIds: insight.evidenceEventIds,
    };
    if (insight.exceptionCount > 0 || insight.retryCount > 0) {
      risks.push({
        ...base,
        id: `${insight.nodeId}-exceptions`,
        severity: "high",
        riskIdentified: "Failure, exception, or retry signals indicate execution instability.",
        riskMitigation: "Add an explicit recovery path, acceptance check, and rollback/redo owner before automating this task.",
      });
    }
    if (insight.upstream.length > 1 || insight.downstream.length > 1) {
      risks.push({
        ...base,
        id: `${insight.nodeId}-handoff`,
        severity: "medium",
        riskIdentified: "Multiple handoffs or paths can create coordination delay and unclear ownership.",
        riskMitigation: "Define entry/exit criteria and one accountable owner for this task before downstream work starts.",
      });
    }
    if (insight.insufficientTelemetry.length > 0) {
      risks.push({
        ...base,
        id: `${insight.nodeId}-telemetry`,
        severity: "medium",
        riskIdentified: insight.insufficientTelemetry[0] ?? "Telemetry is insufficient for a confident risk read.",
        riskMitigation: "Capture duration, owner, result, and evidence for at least three more runs before treating findings as stable.",
      });
    }
    if (rec?.requiredControls.length && rec.confidence < 0.8) {
      risks.push({
        ...base,
        id: `${insight.nodeId}-automation-controls`,
        severity: "medium",
        riskIdentified: "Enhancement candidate still needs controls before safe execution.",
        riskMitigation: `Require ${rec.requiredControls.slice(0, 2).join(" and ")} before adopting the suggested enhancement.`,
      });
    }
  }
  return risks.length ? risks : [{
    id: "selected-process-low-signal",
    processId: metadata.id,
    processName: metadata.displayName,
    nodeId: "process",
    taskName: "Selected process",
    riskIdentified: "No material deterministic risk signals were detected in the current telemetry.",
    riskMitigation: "Keep collecting owner, duration, exception, and evidence data; use AI enrichment only as an advisory second pass.",
    severity: "low",
    source: "deterministic",
    evidenceEventIds: [],
  }];
}
