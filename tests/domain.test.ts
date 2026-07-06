import { describe, expect, it } from "vitest";
import { answerQuestion } from "../src/domain/analyst";
import { omitNullObjectProperties } from "../src/domain/adapters";
import { discoverProcess } from "../src/domain/discovery";
import {
  createJsonExport,
  exportMarkdown,
  exportMermaid,
  validateFlowExport,
} from "../src/domain/exports";
import { detectGaps } from "../src/domain/gaps";
import { recommendTreatments } from "../src/domain/recommendations";
import {
  validatePrimitiveRegistry,
  validateWorkEvents,
} from "../src/domain/validation";
import invalidFixture from "../src/fixtures/invalid-work-events.json";
import sampleFixture from "../src/fixtures/sample-work-events.json";
import primitiveFixture from "../src/fixtures/work-primitives.json";
import { showcaseWorkEvents } from "../src/fixtures/showcase-work-events";
import type {
  PrimitiveRegistry,
  WorkEventCollection,
} from "../src/domain/types";

const validCollection = sampleFixture as WorkEventCollection;
const validRegistry = primitiveFixture as PrimitiveRegistry;

describe("schema boundaries", () => {
  it("normalizes null optional fields from SQL-backed telemetry exports", () => {
    const withNulls = structuredClone(sampleFixture) as unknown as {
      events: Array<Record<string, unknown>>;
    };
    withNulls.events[0]!.parentEventId = null;
    withNulls.events[0]!.decision = null;
    const normalized = omitNullObjectProperties(withNulls);
    const result = validateWorkEvents(normalized);
    expect(result.valid).toBe(true);
  });

  it("accepts every supplied work event and primitive", () => {
    const eventResult = validateWorkEvents(sampleFixture);
    const registryResult = validatePrimitiveRegistry(primitiveFixture);
    expect(eventResult.valid).toBe(true);
    expect(eventResult.acceptedCount).toBe(10);
    expect(eventResult.issues).toEqual([]);
    expect(registryResult.valid).toBe(true);
    expect(registryResult.acceptedCount).toBe(5);
  });

  it("validates the richer fictional showcase dataset", () => {
    const result = validateWorkEvents(showcaseWorkEvents);
    const graph = discoverProcess(showcaseWorkEvents);
    expect(result.valid).toBe(true);
    expect(result.acceptedCount).toBeGreaterThanOrEqual(50);
    expect(new Set(showcaseWorkEvents.events.map((event) => event.caseId)).size).toBeGreaterThanOrEqual(6);
    expect(graph.variants.length).toBeGreaterThanOrEqual(5);
    expect(graph.nodes.length).toBeGreaterThanOrEqual(9);
  });

  it("rejects the invalid fixture atomically with event and field errors", () => {
    const result = validateWorkEvents(invalidFixture);
    expect(result.valid).toBe(false);
    expect(result.acceptedCount).toBe(0);
    expect(result.rejectedCount).toBe(1);
    expect(result.issues.length).toBeGreaterThan(10);
    expect(result.issues.some((issue) => issue.eventId === "events[0]")).toBe(true);
    expect(result.issues.some((issue) => issue.field === "actor/authorityLevel")).toBe(true);
    expect(result.issues.some((issue) => issue.field === "resources/1/allocationMethod")).toBe(true);
  });
});

describe("deterministic process reconstruction", () => {
  const graph = discoverProcess(validCollection);

  it("derives variants, transitions, handoffs, repeats, exceptions, and outcomes", () => {
    expect(graph.variants).toHaveLength(2);
    expect(graph.nodes.find((node) => node.id === "validate-invoice")?.repeats).toBe(1);
    expect(graph.nodes.find((node) => node.id === "validate-invoice")?.exceptions).toBe(1);
    expect(graph.nodes.find((node) => node.id === "post-invoice")?.acceptedOutcomes).toBe(1);
    expect(graph.edges.some((edge) => edge.handoffs > 0)).toBe(true);
    expect(graph.nodes.every((node) => node.truthState === "inferred")).toBe(true);
  });

  it("produces transparent recommendations in Henry's three implementation families", () => {
    const recommendations = recommendTreatments(graph.nodes, validCollection.events);
    const gaps = detectGaps(graph.nodes, validCollection.events);
    const families = new Set(recommendations.map((item) => item.automationFamily));
    expect(recommendations).toHaveLength(graph.nodes.length);
    expect(recommendations.every((item) => item.factors.length === 16)).toBe(true);
    expect(recommendations.every((item) => item.expectedFailureModes.length > 0)).toBe(true);
    expect(families.has("Deterministic / vibe-code")).toBe(true);
    expect(
      families.has("Probabilistic / prompt") ||
      families.has("Hybrid / agent with harness"),
    ).toBe(true);
    expect(gaps.some((gap) => gap.type === "missing-owner")).toBe(true);
    expect(gaps.every((gap) => gap.eventIds.length > 0)).toBe(true);
  });

  it("answers every Flowsensa question with linked evidence", () => {
    const recommendations = recommendTreatments(graph.nodes, validCollection.events);
    const gaps = detectGaps(graph.nodes, validCollection.events);
    for (const questionId of [
      "elapsed",
      "handoffs",
      "repeats",
      "exceptions",
      "gaps",
      "treatment",
    ]) {
      const answer = answerQuestion(questionId, {
        graph,
        events: validCollection.events,
        gaps,
        recommendations,
      });
      expect(answer.summary).not.toContain("No supporting records");
      expect(answer.evidence.length).toBeGreaterThan(0);
      expect(answer.evidence.some((item) => item.eventIds.length > 0)).toBe(true);
    }
  });
});

describe("versioned exports", () => {
  it("round-trips process evidence without embedding a LocalCFO ledger", () => {
    const inferredGraph = discoverProcess(validCollection);
    const confirmedGraph = structuredClone(inferredGraph);
    confirmedGraph.nodes[0]!.truthState = "user-confirmed";
    confirmedGraph.nodes[0]!.status = "confirmed";
    const recommendations = recommendTreatments(
      confirmedGraph.nodes,
      validCollection.events,
    );
    const exported = createJsonExport({
      source: {
        eventSchemaVersion: "1.0.0",
        primitiveRegistryVersion: "1.0.0",
        provenance: ["fixtures/sample-work-events.json"],
      },
      events: validCollection,
      inferredGraph,
      confirmedGraph,
      recommendations,
      overrides: [{
        id: "override-test",
        targetType: "node",
        targetId: confirmedGraph.nodes[0]!.id,
        action: "confirm",
        priorValue: "inferred",
        newValue: "user-confirmed",
        rationale: "Test confirmation",
        createdAt: "2026-07-03T18:00:00Z",
        truthState: "user-confirmed",
      }],
    });
    const roundTrip = JSON.parse(JSON.stringify(exported)) as unknown;
    expect(validateFlowExport(roundTrip)).toBe(true);
    expect(JSON.stringify(roundTrip)).toContain("user-confirmed");
    expect(Object.hasOwn(exported, "resources")).toBe(false);
    expect(exportMarkdown(confirmedGraph, recommendations, validRegistry)).toContain(
      "## Automation recommendations",
    );
    expect(exportMermaid(confirmedGraph)).toContain("flowchart LR");
  });
});

// ── Closed-loop recommendation tests (FR-026) ──────────────────────────

describe("closed-loop recommendations", () => {
  const baseEvent = (overrides: Record<string, unknown>) => ({
    eventId: crypto.randomUUID(),
    caseId: "case-001",
    timestamp: "2026-07-05T12:00:00Z",
    activity: { id: "validate-invoice", label: "Validate invoice", type: "validate" as const, primitiveVersion: "1.0.0" },
    actor: { id: "agent-pi", label: "Pi", type: "agent" as const },
    result: { status: "success" as const },
    truthState: "observed" as const,
    provenance: { sourceType: "mnemosync" as const, sourceRef: "mnemosync://test", ingestedAt: "2026-07-05T12:00:00Z" },
    ...overrides,
  });

  const makeNode = (overrides: Record<string, unknown>) => ({
    id: "node-validate",
    label: "Validate invoice",
    activityType: "validate" as const,
    frequency: 5,
    actorIds: ["agent-pi"],
    actorTypes: ["agent"] as Array<"human" | "agent" | "system" | "service-account" | "external">,
    eventIds: ["ev-1", "ev-2", "ev-3"],
    acceptedOutcomes: 5,
    exceptions: 0,
    repeats: 0,
    totalDurationMs: 300000,
    truthState: "observed" as const,
    confidence: 0.85,
    status: "confirmed" as const,
    ...overrides,
  });

  it("recommends bounded-loop for validate activity with objective evaluator", () => {
    const events = [
      baseEvent({ eventId: "ev-1", result: { status: "success" }, acceptedOutcome: true }),
      baseEvent({ eventId: "ev-2", result: { status: "success" }, acceptedOutcome: true }),
      baseEvent({ eventId: "ev-3", decision: { id: "d1", selectedPath: "Approved", ruleRef: "invoice-total-rule", rationale: "Within threshold" } }),
    ];
    const node = makeNode({});
    const recs = recommendTreatments([node], events);
    expect(recs).toHaveLength(1);
    expect(recs[0].executionPattern).toBe("bounded-loop");
    expect(recs[0].loopConfig).toBeDefined();
    expect(recs[0].loopConfig!.evaluator).toBeTruthy();
    expect(recs[0].loopConfig!.cost).toBeDefined();
    expect(recs[0].loopConfig!.cost.expectedIterations).toBeGreaterThan(0);
    expect(recs[0].loopConfig!.cost.maxIterations).toBeGreaterThanOrEqual(recs[0].loopConfig!.cost.expectedIterations);
    expect(recs[0].loopConfig!.modelSelfJudges).toBe(false);
    expect(recs[0].loopConfig!.stopConditions.length).toBeGreaterThan(0);
    expect(recs[0].loopConfig!.escalationConditions.length).toBeGreaterThan(0);
  });

  it("recommends one-shot when no objective evaluator exists", () => {
    // Completion status alone is not a machine-checkable quality objective.
    const events = [
      baseEvent({ eventId: "ev-1", result: { status: "success" }, activity: { id: "review-draft", label: "Review draft", type: "review", primitiveVersion: "1.0.0" } }),
      baseEvent({ eventId: "ev-2", result: { status: "success" }, activity: { id: "review-draft", label: "Review draft", type: "review", primitiveVersion: "1.0.0" } }),
    ];
    const node = makeNode({ activityType: "review" });
    const recs = recommendTreatments([node], events);
    expect(recs).toHaveLength(1);
    expect(recs[0].executionPattern).toBe("one-shot");
    expect(recs[0].loopConfig).toBeUndefined();
  });

  it("recommends one-shot when exceptions are observed (simplify first)", () => {
    const events = [
      baseEvent({ eventId: "ev-1", result: { status: "failure", reasonCode: "validation-error" } }),
      baseEvent({ eventId: "ev-2", result: { status: "success" } }),
    ];
    const node = makeNode({ exceptions: 2, repeats: 1 });
    const recs = recommendTreatments([node], events);
    expect(recs).toHaveLength(1);
    expect(recs[0].executionPattern).toBe("one-shot");
    expect(recs[0].loopConfig).toBeUndefined();
  });

  it("recommends one-shot for high-risk execute activity", () => {
    const events = [
      baseEvent({ eventId: "ev-1", result: { status: "success" }, activity: { id: "deploy", label: "Deploy", type: "execute", primitiveVersion: "1.0.0" } }),
    ];
    const node = makeNode({ activityType: "execute", totalDurationMs: 10000 });
    const recs = recommendTreatments([node], events);
    expect(recs).toHaveLength(1);
    // Execute is not reversible, so should not get bounded-loop
    expect(recs[0].executionPattern).toBe("one-shot");
  });

  it("cost estimate is deterministic for identical input", () => {
    const events = [baseEvent({ eventId: "ev-1", result: { status: "success" }, decision: { id: "d1", selectedPath: "ok", ruleRef: "r1" } })];
    const node = makeNode({});

    const recs1 = recommendTreatments([node], events);
    const recs2 = recommendTreatments([node], events);

    expect(recs1[0].loopConfig?.cost).toEqual(recs2[0].loopConfig?.cost);
    expect(recs1[0].executionPattern).toBe(recs2[0].executionPattern);
  });

  it("cost formula computes correctly", () => {
    const events = [baseEvent({ eventId: "ev-1", result: { status: "success" }, decision: { id: "d1", selectedPath: "ok", ruleRef: "r1" } })];
    const node = makeNode({});
    const recs = recommendTreatments([node], events);

    expect(recs[0].loopConfig).toBeDefined();
    const cost = recs[0].loopConfig!.cost;

    // Verify cost formula: (inputTokens/1M)*inputPrice + (outputTokens/1M)*outputPrice + toolCost
    const iterationCost =
      (cost.inputTokensPerIteration / 1_000_000) * cost.inputPricePerM +
      (cost.outputTokensPerIteration / 1_000_000) * cost.outputPricePerM +
      cost.toolCostPerIteration;
    const expectedRun = iterationCost * cost.expectedIterations;
    const worstCase = iterationCost * cost.maxIterations;

    expect(iterationCost).toBeGreaterThan(0);
    expect(expectedRun).toBeGreaterThan(iterationCost);
    expect(worstCase).toBeGreaterThanOrEqual(expectedRun);
    expect(cost.model).toBeTruthy();
    expect(cost.estimatedAt).toBeTruthy();
  });
});
