import { describe, expect, it } from "vitest";
import { layoutProcessMap, failureColor, LANE_ORDER } from "../src/lib/mapLayout";
import type { GraphEdge, GraphNode, ProcessGraph } from "../src/domain/types";

function node(id: string, actor: GraphNode["actorTypes"][number], over: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    label: id,
    activityType: "task",
    frequency: 3,
    actorIds: [actor],
    actorTypes: [actor],
    eventIds: [`${id}-e1`],
    acceptedOutcomes: 3,
    exceptions: 0,
    repeats: 0,
    totalDurationMs: 30_000,
    truthState: "deterministic",
    confidence: 1,
    status: "proposed",
    ...over,
  } as GraphNode;
}

function edge(from: string, to: string, over: Partial<GraphEdge> = {}): GraphEdge {
  return {
    id: `${from}->${to}`,
    from,
    to,
    frequency: 3,
    caseIds: ["c1"],
    handoffs: 1,
    waitMs: [1000],
    eventIds: [`${from}-${to}`],
    truthState: "deterministic",
    status: "proposed",
    ...over,
  } as GraphEdge;
}

function graph(nodes: GraphNode[], edges: GraphEdge[]): ProcessGraph {
  return {
    schemaVersion: "1.0.0",
    generatedAt: "2026-07-13T00:00:00Z",
    nodes,
    edges,
    variants: [],
    ambiguousOrderCaseIds: [],
    sourceEventIds: [],
  };
}

const sample = graph(
  [
    node("research", "human", { totalDurationMs: 30_000 }),
    node("draft", "agent", { totalDurationMs: 120_000 }),
    node("review", "human", { totalDurationMs: 84_000, frequency: 4 }),
    node("revise", "agent", { totalDurationMs: 150_000, frequency: 5, repeats: 2 }),
    node("publish", "system", { totalDurationMs: 6_000 }),
  ],
  [
    edge("research", "draft"),
    edge("draft", "review", { frequency: 4 }),
    edge("review", "revise", { frequency: 5 }),
    edge("revise", "review", { frequency: 2 }), // retry cycle (back-edge)
    edge("review", "publish"),
    edge("revise", "revise", { frequency: 1 }), // self-loop
  ],
);

describe("layoutProcessMap", () => {
  it("is deterministic for identical graphs", () => {
    const a = layoutProcessMap(sample);
    const b = layoutProcessMap(sample);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("places nodes into their actor's swimlane, in fixed order", () => {
    const { nodes, lanes } = layoutProcessMap(sample);
    expect(lanes.map((l) => l.key)).toEqual(["human", "agent", "system"]);
    // lanes ordered per LANE_ORDER
    const laneRank = (k: string) => LANE_ORDER.indexOf(k as (typeof LANE_ORDER)[number]);
    for (let i = 1; i < lanes.length; i++) {
      expect(laneRank(lanes[i].key)).toBeGreaterThan(laneRank(lanes[i - 1].key));
    }
    expect(nodes.find((n) => n.id === "draft")!.lane).toBe("agent");
    expect(nodes.find((n) => n.id === "publish")!.lane).toBe("system");
  });

  it("never overlaps two nodes in the same lane", () => {
    const { nodes } = layoutProcessMap(sample);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.lane !== b.lane) continue;
        const overlap = Math.abs(a.x - b.x) < a.w && Math.abs(a.y - b.y) < a.h;
        expect(overlap).toBe(false);
      }
    }
  });

  it("marks a forward critical path and skips retry back-edges", () => {
    const { nodes, edges } = layoutProcessMap(sample);
    const critical = nodes.filter((n) => n.onCriticalPath).map((n) => n.id);
    expect(critical.length).toBeGreaterThanOrEqual(2);
    // The self-loop and the revise->review back-edge must not be critical.
    const backEdge = edges.find((e) => e.id === "revise->review")!;
    const selfLoop = edges.find((e) => e.selfLoop)!;
    expect(backEdge.onCriticalPath).toBe(false);
    expect(selfLoop.onCriticalPath).toBe(false);
  });

  it("scales edge stroke width by frequency", () => {
    const { edges } = layoutProcessMap(sample);
    const thin = edges.find((e) => e.frequency === 3)!;
    const thick = edges.find((e) => e.frequency === 5)!;
    expect(thick.strokeWidth).toBeGreaterThan(thin.strokeWidth);
  });

  it("computes a node failure rate from exceptions and repeats", () => {
    const { nodes } = layoutProcessMap(sample);
    const revise = nodes.find((n) => n.id === "revise")!; // repeats 2 / freq 5
    expect(revise.failureRate).toBeCloseTo(0.4, 5);
    expect(nodes.find((n) => n.id === "research")!.failureRate).toBe(0);
  });
});

describe("failureColor", () => {
  it("maps clean to success and high failure to danger", () => {
    expect(failureColor(0)).toBe("var(--success)");
    expect(failureColor(0.5)).toBe("var(--danger)");
  });
});
