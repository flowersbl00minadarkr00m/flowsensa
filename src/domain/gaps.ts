import type { Gap, GraphNode, WorkEvent } from "./types";

export function detectGaps(nodes: GraphNode[], events: WorkEvent[]): Gap[] {
  const gaps: Gap[] = [];

  for (const node of nodes.filter((candidate) => candidate.status !== "rejected")) {
    const nodeEvents = events.filter((event) => node.eventIds.includes(event.eventId));
    const add = (
      type: string,
      message: string,
      severity: Gap["severity"] = "warning",
    ) =>
      gaps.push({
        id: `${type}:${node.id}`,
        type,
        severity,
        message,
        nodeId: node.id,
        eventIds: node.eventIds,
      });

    if (!node.owner) add("missing-owner", `${node.label} has no user-confirmed accountable owner.`);
    if (
      node.status !== "confirmed" ||
      nodeEvents.some((event) => event.actor.authorityLevel === undefined)
    ) {
      add(
        "unconfirmed-authority",
        `${node.label} has no user-confirmed action mandate.`,
      );
    }
    if (
      node.authorityLevel !== undefined &&
      nodeEvents.some(
        (event) =>
          event.actor.authorityLevel !== undefined &&
          event.actor.authorityLevel > node.authorityLevel!,
      )
    ) {
      add(
        "authority-exceeds-mandate",
        `${node.label} includes observed authority above the confirmed mandate.`,
        "critical",
      );
    }
    if (nodeEvents.some((event) => event.decision && !(event.evidence?.length || event.decision.ruleRef))) {
      add("decision-without-evidence", `${node.label} includes a decision without evidence or rule.`);
    }
    for (const exception of nodeEvents.filter(
      (event) => event.result.status === "exception",
    )) {
      const resolutionObserved = events.some(
        (event) =>
          event.caseId === exception.caseId &&
          Date.parse(event.timestamp) > Date.parse(exception.timestamp) &&
          (event.activity.id.includes("resolve") ||
            event.transition?.fromState?.includes("exception")),
      );
      if (!resolutionObserved) {
        add(
          "unresolved-exception",
          `${node.label} contains an exception without an observed resolution path.`,
          "critical",
        );
      }
    }
    if (
      node.actorTypes.includes("human") &&
      node.activityType === "review" &&
      !node.owner
    ) {
      add(
        "review-capacity-unowned",
        `${node.label} requires human review, but queue ownership and capacity are not confirmed.`,
      );
    }
    if (node.repeats > 0) {
      add(
        "repeat-without-stop",
        `${node.label} repeats ${node.repeats} time(s); no explicit stop condition was observed.`,
      );
    }
    if (nodeEvents.some((event) => event.acceptedOutcome && !(event.evidence?.length))) {
      add(
        "outcome-without-acceptance-evidence",
        `${node.label} marks an accepted outcome without linked acceptance evidence.`,
        "critical",
      );
    }
    if (
      nodeEvents.some(
        (event) =>
          event.acceptedOutcome &&
          !event.decision?.ruleRef,
      )
    ) {
      add(
        "outcome-without-acceptance-rule",
        `${node.label} marks an accepted outcome without an explicit acceptance rule.`,
        "critical",
      );
    }
    if (
      nodeEvents.some(
        (event) =>
          event.decision?.ruleRef &&
          !(event.evidence?.length),
      )
    ) {
      add(
        "control-without-evidence",
        `${node.label} references a decision rule without linked control evidence.`,
      );
    }
    const unconsumedOutputs = nodeEvents.flatMap((event) =>
      (event.objects ?? [])
        .filter((object) => object.role === "output")
        .filter(
          (output) =>
            !events.some(
              (candidate) =>
                candidate.caseId === event.caseId &&
                candidate.eventId !== event.eventId &&
                (candidate.objects ?? []).some(
                  (object) =>
                    object.id === output.id &&
                    ["input", "subject"].includes(object.role),
                ),
            ),
        ),
    );
    if (unconsumedOutputs.length > 0) {
      add(
        "output-without-consumer",
        `${node.label} produced ${unconsumedOutputs.map((output) => output.id).join(", ")} without an observed consumer.`,
      );
    }
  }

  for (const event of events.filter((candidate) => !candidate.traceId)) {
    gaps.push({
      id: `missing-correlation:${event.eventId}`,
      type: "missing-correlation",
      severity: "warning",
      message: `${event.eventId} has no trace or correlation identifier.`,
      nodeId: event.activity.id,
      eventIds: [event.eventId],
    });
  }

  for (const caseId of new Set(events.map((event) => event.caseId))) {
    const caseEvents = events.filter((event) => event.caseId === caseId);
    if (!caseEvents.some((event) => event.acceptedOutcome)) {
      gaps.push({
        id: `case-without-accepted-outcome:${caseId}`,
        type: "case-without-accepted-outcome",
        severity: "critical",
        message: `${caseId} has no observed accepted outcome or acceptance evidence.`,
        eventIds: caseEvents.map((event) => event.eventId),
      });
    }
  }

  return gaps;
}
