import { describe, expect, it } from "vitest";
import { answerQuestion } from "../src/domain/analyst";
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
    expect(result.acceptedCount).toBeGreaterThan(50);
    expect(new Set(showcaseWorkEvents.events.map((event) => event.caseId)).size).toBe(8);
    expect(graph.variants.length).toBeGreaterThanOrEqual(5);
    expect(graph.nodes.length).toBe(9);
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
