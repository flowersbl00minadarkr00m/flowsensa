import type {
  AutomationFamily,
  GraphNode,
  Recommendation,
  RecommendationClass,
  RubricFactor,
  WorkEvent,
} from "./types";

export function automationFamilyFor(
  recommendationClass: RecommendationClass,
): AutomationFamily {
  if (recommendationClass === "Deterministic automation") {
    return "Deterministic / vibe-code";
  }
  if (
    recommendationClass === "Probabilistic AI assistance with human execution" ||
    recommendationClass === "Probabilistic AI proposal with human approval"
  ) {
    return "Probabilistic / prompt";
  }
  if (
    recommendationClass === "Bounded probabilistic execution with deterministic controls" ||
    recommendationClass === "Hybrid deterministic/probabilistic workflow"
  ) {
    return "Hybrid / agent with harness";
  }
  if (recommendationClass === "Insufficient evidence") {
    return "Insufficient evidence";
  }
  return "Manual / simplify";
}

const FACTOR_LABELS = [
  ["input-structure", "Input structure and quality"],
  ["rule-stability", "Rule stability and explicitness"],
  ["judgment-ambiguity", "Judgment ambiguity"],
  ["output-verifiability", "Output verifiability"],
  ["error-impact", "Error impact"],
  ["reversibility", "Reversibility"],
  ["action-authority", "Action authority"],
  ["data-sensitivity", "Data sensitivity"],
  ["frequency-volume", "Frequency and volume"],
  ["exception-diversity", "Exception rate and diversity"],
  ["latency", "Latency requirement"],
  ["audit", "Evidence and audit requirement"],
  ["api-readiness", "System/API readiness"],
  ["performance", "Current process performance"],
  ["context-freshness", "Context freshness"],
  ["review-capacity", "Human-review capacity"],
] as const;

function treatmentFor(node: GraphNode): RecommendationClass {
  if (node.frequency < 1 || node.eventIds.length === 0) return "Insufficient evidence";
  if (node.repeats > 0 || node.exceptions > 0) {
    return "Simplify or eliminate before automating";
  }
  if (node.activityType === "validate" || node.activityType === "execute") {
    return "Deterministic automation";
  }
  if (node.activityType === "extract") {
    return "Bounded probabilistic execution with deterministic controls";
  }
  if (node.activityType === "review" || node.activityType === "decide") {
    return "Probabilistic AI proposal with human approval";
  }
  if (node.activityType === "intake" || node.activityType === "handoff") {
    return "Hybrid deterministic/probabilistic workflow";
  }
  return "Keep manual";
}

function factorsFor(node: GraphNode, events: WorkEvent[]): RubricFactor[] {
  const nodeEvents = events.filter((event) => node.eventIds.includes(event.eventId));
  const hasRules = nodeEvents.some((event) => event.decision?.ruleRef);
  const hasEvidence = nodeEvents.some((event) => (event.evidence?.length ?? 0) > 0);
  const isHuman = node.actorTypes.includes("human");
  const isAgent = node.actorTypes.includes("agent");
  const sensitive = nodeEvents.some((event) =>
    event.objects?.some((object) => Boolean(object.classification)),
  );

  return FACTOR_LABELS.map(([key, label]) => {
    let value: RubricFactor["value"] = "unknown";
    let effect = "Not enough evidence; lowers recommendation confidence.";
    if (key === "input-structure") {
      value = node.activityType === "extract" ? "medium" : "high";
      effect =
        value === "high"
          ? "Structured inputs support deterministic handling."
          : "Mixed document inputs warrant bounded probabilistic extraction.";
    } else if (key === "rule-stability") {
      value = hasRules ? "high" : "medium";
      effect = hasRules
        ? "Explicit rule evidence favors deterministic controls."
        : "No rule reference was observed; keep accountable review.";
    } else if (key === "judgment-ambiguity") {
      value = isHuman || isAgent ? "high" : "low";
      effect =
        value === "high"
          ? "Semantic or accountable judgment constrains unattended automation."
          : "Low ambiguity supports deterministic execution.";
    } else if (key === "output-verifiability") {
      value = hasEvidence ? "high" : "medium";
      effect = hasEvidence
        ? "Observed evidence makes outputs independently checkable."
        : "Verification evidence should be added before execution automation.";
    } else if (key === "error-impact") {
      value = node.activityType === "execute" || node.activityType === "decide" ? "high" : "medium";
      effect = "Higher-impact actions require deterministic controls and approval boundaries.";
    } else if (key === "reversibility") {
      value = node.activityType === "execute" ? "low" : "medium";
      effect = "Limited observed reversibility keeps human approval or rollback controls in scope.";
    } else if (key === "action-authority") {
      value = node.authorityLevel && node.authorityLevel >= 5 ? "high" : "medium";
      effect = "Authority-bearing actions cannot be delegated from frequency evidence alone.";
    } else if (key === "data-sensitivity") {
      value = sensitive ? "high" : "low";
      effect = sensitive
        ? "Classified objects favor local processing and explicit sharing consent."
        : "No classified object was observed for this step.";
    } else if (key === "frequency-volume") {
      value = node.frequency >= 3 ? "high" : "medium";
      effect = "Frequency informs potential value but never selects automation on its own.";
    } else if (key === "exception-diversity") {
      value = node.exceptions > 0 || node.repeats > 0 ? "high" : "low";
      effect =
        value === "high"
          ? "Observed exceptions or repeats argue for simplification first."
          : "No exception was observed for this step in the fixture.";
    } else if (key === "audit") {
      value = hasEvidence ? "high" : "medium";
      effect = "Audit requirements favor explicit provenance and deterministic checks.";
    } else if (key === "api-readiness") {
      value = nodeEvents.some((event) => event.system) ? "high" : "low";
      effect = "An observed system boundary improves deterministic integration readiness.";
    } else if (key === "performance") {
      value = node.exceptions > 0 || node.repeats > 0 ? "low" : "medium";
      effect = "Observed rework should be corrected before automation.";
    } else if (key === "review-capacity") {
      value = isHuman ? "medium" : "unknown";
      effect = isHuman
        ? "A human reviewer exists, but queue capacity was not observed."
        : "No review-capacity evidence was observed.";
    } else if (key === "context-freshness") {
      value = "medium";
      effect = "Event context is current to import time; live freshness is not established.";
    } else if (key === "latency") {
      value = node.totalDurationMs > 300_000 ? "high" : "medium";
      effect = "Observed timing indicates whether delay reduction is material.";
    }
    return { key, label, value, effect, evidenceEventIds: node.eventIds };
  });
}

export function recommendTreatments(
  nodes: GraphNode[],
  events: WorkEvent[],
): Recommendation[] {
  return nodes
    .filter((node) => node.status !== "rejected")
    .map((node) => {
      const recommendationClass = treatmentFor(node);
      return {
        nodeId: node.id,
        recommendationClass,
        automationFamily: automationFamilyFor(recommendationClass),
        confidence: node.frequency >= 2 ? 0.78 : 0.62,
        uncertainty:
          "Based on the supplied fixture only; policy intent, review capacity, and production exception diversity require confirmation.",
        evidenceEventIds: node.eventIds,
        factors: factorsFor(node, events),
        expectedFailureModes:
          recommendationClass.includes("Probabilistic") ||
          recommendationClass.includes("Hybrid")
            ? ["Incorrect semantic interpretation", "Unsupported confidence", "Context drift"]
            : ["Rule drift", "Missing input", "Downstream integration failure"],
        requiredControls: [
          "Schema validation",
          "Evidence retention",
          recommendationClass.includes("approval") || recommendationClass === "Keep manual"
            ? "Accountable human decision"
            : "Deterministic output check",
        ],
        truthState: "inferred",
      };
    });
}
