import type {
  AnalystAnswer,
  Gap,
  ProcessGraph,
  Recommendation,
  WorkEvent,
} from "./types";

export const ANALYST_QUESTIONS = [
  { id: "elapsed", label: "Which activities consume the most elapsed time?" },
  { id: "handoffs", label: "Where are the longest observed handoffs?" },
  { id: "repeats", label: "Which activities repeat most often?" },
  { id: "exceptions", label: "Which paths contain failures, retries, or exceptions?" },
  { id: "gaps", label: "Which steps lack owners, authority, evidence, controls, or outcomes?" },
  { id: "treatment", label: "Which steps suit deterministic, probabilistic, or hybrid treatment?" },
] as const;

interface AnalystContext {
  graph: ProcessGraph;
  events: WorkEvent[];
  gaps: Gap[];
  recommendations: Recommendation[];
}

function noEvidence(questionId: string, title: string): AnalystAnswer {
  return {
    questionId,
    title,
    summary: "No supporting records were found in the current local dataset.",
    evidence: [],
  };
}

export function answerQuestion(
  questionId: string,
  context: AnalystContext,
): AnalystAnswer {
  const title =
    ANALYST_QUESTIONS.find((question) => question.id === questionId)?.label ??
    "Process question";

  if (questionId === "elapsed") {
    const ranked = [...context.graph.nodes]
      .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
      .slice(0, 3);
    if (!ranked.length) return noEvidence(questionId, title);
    return {
      questionId,
      title,
      summary: ranked
        .map((node) => `${node.label}: ${(node.totalDurationMs / 60_000).toFixed(1)} min processing time`)
        .join("; "),
      evidence: ranked.map((node) => ({
        label: `${node.label} duration evidence`,
        eventIds: node.eventIds,
        nodeIds: [node.id],
      })),
    };
  }

  if (questionId === "handoffs") {
    const ranked = [...context.graph.edges]
      .filter((edge) => edge.handoffs > 0)
      .sort((a, b) => Math.max(...b.waitMs, 0) - Math.max(...a.waitMs, 0))
      .slice(0, 3);
    if (!ranked.length) return noEvidence(questionId, title);
    return {
      questionId,
      title,
      summary: ranked
        .map(
          (edge) =>
            `${edge.from} → ${edge.to}: ${(Math.max(...edge.waitMs) / 3_600_000).toFixed(1)} h observed wait`,
        )
        .join("; "),
      evidence: ranked.map((edge) => ({
        label: edge.id,
        eventIds: edge.eventIds,
        nodeIds: [edge.from, edge.to],
      })),
    };
  }

  if (questionId === "repeats") {
    const repeated = context.graph.nodes
      .filter((node) => node.repeats > 0)
      .sort((a, b) => b.repeats - a.repeats);
    if (!repeated.length) return noEvidence(questionId, title);
    return {
      questionId,
      title,
      summary: repeated
        .map((node) => `${node.label}: ${node.repeats} repeat(s)`)
        .join("; "),
      evidence: repeated.map((node) => ({
        label: node.label,
        eventIds: node.eventIds,
        nodeIds: [node.id],
      })),
    };
  }

  if (questionId === "exceptions") {
    const variants = context.graph.variants.filter((variant) => variant.hasException);
    if (!variants.length) return noEvidence(questionId, title);
    return {
      questionId,
      title,
      summary: variants
        .map((variant) => `${variant.caseIds.join(", ")}: ${variant.activityIds.join(" → ")}`)
        .join("; "),
      evidence: variants.map((variant) => ({
        label: variant.id,
        eventIds: context.events
          .filter((event) => variant.caseIds.includes(event.caseId))
          .map((event) => event.eventId),
        nodeIds: variant.activityIds,
      })),
    };
  }

  if (questionId === "gaps") {
    if (!context.gaps.length) return noEvidence(questionId, title);
    return {
      questionId,
      title,
      summary: context.gaps.map((gap) => gap.message).join(" "),
      evidence: context.gaps.map((gap) => ({
        label: gap.type,
        eventIds: gap.eventIds,
        nodeIds: gap.nodeId ? [gap.nodeId] : [],
      })),
    };
  }

  if (questionId === "treatment") {
    if (!context.recommendations.length) return noEvidence(questionId, title);
    return {
      questionId,
      title,
      summary: context.recommendations
        .map((recommendation) =>
          `${recommendation.nodeId}: ${recommendation.automationFamily} — ${recommendation.recommendationClass}`,
        )
        .join("; "),
      evidence: context.recommendations.map((recommendation) => ({
        label: recommendation.automationFamily,
        eventIds: recommendation.evidenceEventIds,
        nodeIds: [recommendation.nodeId],
      })),
    };
  }

  return noEvidence(questionId, title);
}
