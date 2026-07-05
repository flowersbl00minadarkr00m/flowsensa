import type {
  Activity,
  Actor,
  ResourceMeasurement,
  WorkEvent,
  WorkEventCollection,
} from "../domain/types";

interface DemoStep {
  activityId: keyof typeof ACTIVITIES;
  actorId: keyof typeof ACTORS;
  fromState: string;
  toState: string;
  durationMs: number;
  waitMinutes: number;
  status?: WorkEvent["result"]["status"];
  reasonCode?: string;
  acceptedOutcome?: boolean;
}

interface DemoCase {
  caseId: string;
  start: string;
  steps: DemoStep[];
}

const ACTIVITIES = {
  receive: { id: "receive-invoice", label: "Receive invoice", type: "intake" },
  extract: { id: "extract-invoice", label: "Extract invoice fields", type: "extract" },
  validate: {
    id: "validate-invoice",
    label: "Validate fields and totals",
    type: "validate",
  },
  match: {
    id: "match-purchase-order",
    label: "Match purchase order",
    type: "reconcile",
  },
  resolve: {
    id: "resolve-exception",
    label: "Resolve exception",
    type: "review",
  },
  route: {
    id: "route-for-approval",
    label: "Route for approval",
    type: "handoff",
  },
  approve: { id: "approve-invoice", label: "Approve invoice", type: "review" },
  post: { id: "post-invoice", label: "Post approved invoice", type: "execute" },
  schedule: {
    id: "schedule-payment",
    label: "Schedule supplier payment",
    type: "close",
  },
} as const satisfies Record<string, Activity>;

const ACTORS = {
  mailbox: {
    id: "ap-intake-mailbox",
    label: "AP intake mailbox",
    type: "system",
    role: "Invoice intake",
    authorityLevel: 1,
  },
  extractor: {
    id: "invoice-extraction-agent",
    label: "Invoice extraction agent",
    type: "agent",
    role: "Field extraction",
    authorityLevel: 2,
  },
  rules: {
    id: "ap-validation-rules",
    label: "AP validation rules",
    type: "system",
    role: "Deterministic validation",
    authorityLevel: 2,
  },
  matcher: {
    id: "three-way-match-service",
    label: "Three-way match service",
    type: "service-account",
    role: "Purchase-order matching",
    authorityLevel: 3,
  },
  analyst: {
    id: "ap-operations-team",
    label: "AP operations team",
    type: "human",
    role: "Exception resolution",
    authorityLevel: 4,
  },
  router: {
    id: "approval-routing-service",
    label: "Approval routing service",
    type: "system",
    role: "Queue routing",
    authorityLevel: 2,
  },
  approver: {
    id: "business-unit-approver",
    label: "Business unit approver",
    type: "human",
    role: "Budget owner",
    authorityLevel: 5,
  },
  controller: {
    id: "finance-controller",
    label: "Finance controller",
    type: "human",
    role: "High-value approval",
    authorityLevel: 6,
  },
  erp: {
    id: "erp-posting-service",
    label: "ERP posting service",
    type: "service-account",
    role: "Ledger posting",
    authorityLevel: 6,
  },
  payments: {
    id: "payment-scheduling-service",
    label: "Payment scheduling service",
    type: "service-account",
    role: "Payment execution preparation",
    authorityLevel: 6,
  },
} as const satisfies Record<string, Actor>;

const standardSteps: DemoStep[] = [
  { activityId: "receive", actorId: "mailbox", fromState: "not-received", toState: "received", durationMs: 48_000, waitMinutes: 0 },
  { activityId: "extract", actorId: "extractor", fromState: "received", toState: "extracted", durationMs: 38_000, waitMinutes: 2 },
  { activityId: "validate", actorId: "rules", fromState: "extracted", toState: "validated", durationMs: 5_000, waitMinutes: 1 },
  { activityId: "match", actorId: "matcher", fromState: "validated", toState: "matched", durationMs: 8_000, waitMinutes: 1 },
  { activityId: "route", actorId: "router", fromState: "matched", toState: "awaiting-approval", durationMs: 3_000, waitMinutes: 1 },
  { activityId: "approve", actorId: "approver", fromState: "awaiting-approval", toState: "approved", durationMs: 150_000, waitMinutes: 96 },
  { activityId: "post", actorId: "erp", fromState: "approved", toState: "posted", durationMs: 12_000, waitMinutes: 3 },
  { activityId: "schedule", actorId: "payments", fromState: "posted", toState: "payment-scheduled", durationMs: 9_000, waitMinutes: 2, acceptedOutcome: true },
];

const cases: DemoCase[] = [
  {
    caseId: "northstar-invoice-2401",
    start: "2026-06-16T15:00:00Z",
    steps: standardSteps,
  },
  {
    caseId: "northstar-invoice-2402",
    start: "2026-06-17T16:20:00Z",
    steps: [
      ...standardSteps.slice(0, 2),
      { activityId: "validate", actorId: "rules", fromState: "extracted", toState: "validation-exception", durationMs: 5_000, waitMinutes: 1, status: "exception", reasonCode: "TOTAL_MISMATCH" },
      { activityId: "resolve", actorId: "analyst", fromState: "validation-exception", toState: "corrected", durationMs: 390_000, waitMinutes: 1_120 },
      { activityId: "validate", actorId: "rules", fromState: "corrected", toState: "validated", durationMs: 5_000, waitMinutes: 2, status: "retry", reasonCode: "REVALIDATED" },
      ...standardSteps.slice(3),
    ],
  },
  {
    caseId: "northstar-invoice-2403",
    start: "2026-06-18T14:05:00Z",
    steps: [
      standardSteps[0]!,
      { ...standardSteps[1]!, status: "failure", reasonCode: "LOW_EXTRACTION_CONFIDENCE" },
      { ...standardSteps[1]!, fromState: "extraction-review", waitMinutes: 18, status: "retry", reasonCode: "HUMAN_ASSISTED_RETRY" },
      ...standardSteps.slice(2),
    ],
  },
  {
    caseId: "northstar-invoice-2404",
    start: "2026-06-19T17:45:00Z",
    steps: [
      ...standardSteps.slice(0, 6),
      { activityId: "approve", actorId: "controller", fromState: "approved-by-owner", toState: "approved", durationMs: 210_000, waitMinutes: 185 },
      ...standardSteps.slice(6),
    ],
  },
  {
    caseId: "northstar-invoice-2405",
    start: "2026-06-20T15:30:00Z",
    steps: [
      ...standardSteps.slice(0, 3),
      { activityId: "match", actorId: "matcher", fromState: "validated", toState: "match-exception", durationMs: 8_000, waitMinutes: 1, status: "exception", reasonCode: "PO_NOT_FOUND" },
      { activityId: "resolve", actorId: "analyst", fromState: "match-exception", toState: "po-linked", durationMs: 540_000, waitMinutes: 840 },
      { activityId: "match", actorId: "matcher", fromState: "po-linked", toState: "matched", durationMs: 8_000, waitMinutes: 2, status: "retry", reasonCode: "MATCH_RETRIED" },
      ...standardSteps.slice(4),
    ],
  },
  {
    caseId: "northstar-invoice-2406",
    start: "2026-06-23T13:15:00Z",
    steps: standardSteps.map((step) => ({
      ...step,
      waitMinutes: step.activityId === "approve" ? 22 : step.waitMinutes,
    })),
  },
  {
    caseId: "northstar-invoice-2407",
    start: "2026-06-24T18:10:00Z",
    steps: standardSteps.map((step) => ({
      ...step,
      waitMinutes: step.activityId === "approve" ? 310 : step.waitMinutes,
    })),
  },
  {
    caseId: "northstar-invoice-2408",
    start: "2026-06-25T14:40:00Z",
    steps: [
      ...standardSteps.slice(0, 2),
      { activityId: "validate", actorId: "rules", fromState: "extracted", toState: "validation-exception", durationMs: 5_000, waitMinutes: 1, status: "exception", reasonCode: "DUPLICATE_INVOICE" },
      { activityId: "resolve", actorId: "analyst", fromState: "validation-exception", toState: "cancelled-duplicate", durationMs: 180_000, waitMinutes: 35, status: "cancelled", reasonCode: "DUPLICATE_CONFIRMED" },
    ],
  },
];

function resourcesFor(
  activityId: keyof typeof ACTIVITIES,
  eventId: string,
): ResourceMeasurement[] | undefined {
  if (activityId === "extract") {
    return [
      { kind: "input-tokens", value: 1_180, unit: "token", measurementClass: "provider-reported", sourceRef: `demo://model-usage/${eventId}` },
      { kind: "output-tokens", value: 176, unit: "token", measurementClass: "provider-reported", sourceRef: `demo://model-usage/${eventId}` },
      { kind: "financial", value: 0.004, unit: "USD", measurementClass: "provider-reported", sourceRef: `demo://model-usage/${eventId}` },
      {
        kind: "electricity",
        value: 0.0008,
        unit: "kWh",
        measurementClass: "estimated",
        sourceRef: `demo://resource-estimate/${eventId}`,
        allocationMethod: "Fictional scenario estimate for demonstrating measurement safeguards.",
        confidence: 0.25,
      },
      {
        kind: "water",
        value: null,
        unit: "L",
        measurementClass: "unknown",
        sourceRef: `demo://resource-unknown/${eventId}`,
        notes: "Unknown by design; never presented as measured.",
      },
    ];
  }
  if (["resolve", "approve"].includes(activityId)) {
    const minutes = activityId === "resolve" ? 7 : 3;
    return [
      { kind: "human-time", value: minutes, unit: "minute", measurementClass: "metered", sourceRef: `demo://timer/${eventId}` },
      {
        kind: "financial",
        value: activityId === "resolve" ? 4.67 : 2.25,
        unit: "USD",
        measurementClass: "allocated",
        sourceRef: `demo://labour-allocation/${eventId}`,
        allocationMethod: `${minutes} fictional minutes at the scenario loaded hourly rate.`,
        confidence: 0.8,
      },
    ];
  }
  if (["receive", "post", "schedule"].includes(activityId)) {
    return [
      {
        kind: "financial",
        value: activityId === "receive" ? 0.001 : 0.002,
        unit: "USD",
        measurementClass: "allocated",
        sourceRef: `demo://system-allocation/${eventId}`,
        allocationMethod: "Fictional system cost divided by scenario transaction volume.",
        confidence: 0.55,
      },
    ];
  }
  return undefined;
}

function buildCase(demoCase: DemoCase): WorkEvent[] {
  let elapsedMinutes = 0;
  return demoCase.steps.map((step, index) => {
    elapsedMinutes += step.waitMinutes;
    const timestamp = new Date(
      Date.parse(demoCase.start) + elapsedMinutes * 60_000,
    ).toISOString();
    const activity = {
      ...ACTIVITIES[step.activityId],
      primitiveVersion: "1.0.0",
    };
    const eventId = `${demoCase.caseId}-event-${String(index + 1).padStart(2, "0")}`;
    const status = step.status ?? "success";
    const hasDecision = ["validate", "match", "approve"].includes(step.activityId);
    const evidence = step.activityId === "receive"
      ? undefined
      : [{
          id: `${eventId}-evidence`,
          sourceRef: `demo://evidence/${eventId}`,
          label: `Fictional ${activity.label.toLowerCase()} evidence`,
          classification: "synthetic-demo",
        }];

    elapsedMinutes += step.durationMs / 60_000;
    return {
      eventId,
      caseId: demoCase.caseId,
      traceId: `trace-${demoCase.caseId}`,
      parentEventId: index > 0
        ? `${demoCase.caseId}-event-${String(index).padStart(2, "0")}`
        : undefined,
      timestamp,
      sequence: index + 1,
      durationMs: step.durationMs,
      intent: "Pay a valid supplier invoice accurately, with evidence and accountable approval.",
      activity,
      transition: { fromState: step.fromState, toState: step.toState },
      actor: ACTORS[step.actorId],
      system: step.actorId === "mailbox" || step.actorId === "rules" || step.actorId === "router"
        ? { id: `${step.actorId}-system`, label: ACTORS[step.actorId].label, version: "showcase-1" }
        : undefined,
      objects: [{
        id: `invoice-${demoCase.caseId}`,
        type: "supplier-invoice",
        role: step.activityId === "receive" ? "subject" : "input",
        classification: "synthetic-demo",
      }],
      decision: hasDecision
        ? {
            id: `${eventId}-decision`,
            selectedPath: status === "exception" || status === "failure" ? "exception" : "pass",
            rationale: step.reasonCode
              ? `Scenario condition: ${step.reasonCode}.`
              : `Fictional ${activity.label.toLowerCase()} rule passed.`,
            ruleRef: `demo://policy/${step.activityId}-v1`,
            decidingAuthority: ACTORS[step.actorId].id,
          }
        : undefined,
      result: {
        status,
        reasonCode: step.reasonCode,
        retryCount: status === "retry" ? 1 : undefined,
      },
      evidence,
      resources: resourcesFor(step.activityId, eventId),
      acceptedOutcome: step.acceptedOutcome ?? false,
      truthState: "observed",
      provenance: {
        sourceType: "file-import",
        sourceRef: "demo://northstar-operations/ap-showcase-v1",
        ingestedAt: "2026-07-04T05:00:00Z",
        transformation: "Deterministic fictional showcase dataset; contains no real organization or supplier data.",
      },
      tags: ["showcase-demo", "synthetic", "accounts-payable"],
    };
  });
}

export const showcaseWorkEvents: WorkEventCollection = {
  schemaVersion: "1.0.0",
  exportedAt: "2026-07-04T05:00:00Z",
  events: cases.flatMap(buildCase),
};
