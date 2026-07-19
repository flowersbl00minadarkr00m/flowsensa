import { describe, expect, it } from "vitest";
import { buildProcessReportHtml } from "../src/lib/reportExport";
import type {
  KPISnapshot,
  ProcessGraph,
  ProcessMetadata,
  ProcessRisk,
  Recommendation,
} from "../src/domain/types";
import type { ResourceUsageSummary } from "../src/domain/resourceUsage";

const graph: ProcessGraph = {
  schemaVersion: "1.0.0",
  generatedAt: "2026-07-16T00:00:00Z",
  nodes: [
    {
      id: "research", label: "Research topic", activityType: "other", frequency: 3,
      actorIds: ["human"], actorTypes: ["human"], eventIds: ["e1"], acceptedOutcomes: 3,
      exceptions: 0, repeats: 0, totalDurationMs: 30000, truthState: "observed",
      confidence: 1, status: "proposed",
    },
    {
      id: "impl", label: "Implement code", activityType: "other", frequency: 3,
      actorIds: ["agent"], actorTypes: ["agent"], eventIds: ["e2"], acceptedOutcomes: 2,
      exceptions: 1, repeats: 1, totalDurationMs: 120000, truthState: "observed",
      confidence: 1, status: "proposed",
    },
  ] as ProcessGraph["nodes"],
  edges: [
    { id: "research->impl", from: "research", to: "impl", frequency: 3, caseIds: ["c1"], handoffs: 1, waitMs: [1000], eventIds: ["e12"], truthState: "observed", status: "proposed" },
  ] as ProcessGraph["edges"],
  variants: [], ambiguousOrderCaseIds: [], sourceEventIds: [],
};

const metadata = { id: "p1", displayName: "Sample workspace", source: "import", confidence: 1, taskDisplayNames: {}, originalTaskLabels: {} } as unknown as ProcessMetadata;
const kpis: KPISnapshot = { caseCount: 6, medianThroughputMs: 11_520_000, exceptionRate: 0.1, reworkRate: 0.05, automationCoverageRate: 0, calculatedAt: "2026-07-16T00:00:00Z" };
const risks: ProcessRisk[] = [
  { id: "r1", processId: "p1", processName: "Sample workspace", nodeId: "impl", taskName: "Implement code", riskIdentified: "Retry signals indicate instability.", riskMitigation: "Add a recovery path.", severity: "high", source: "deterministic", evidenceEventIds: ["e2"] },
  { id: "r2", processId: "p1", processName: "Sample workspace", nodeId: "research", taskName: "Research topic", riskIdentified: "No owner confirmed.", riskMitigation: "Assign an owner.", severity: "medium", source: "deterministic", evidenceEventIds: ["e1"] },
];
const recommendations: Recommendation[] = [
  { nodeId: "impl", recommendationClass: "Hybrid deterministic/probabilistic workflow", automationFamily: "Hybrid / agent with harness", executionPattern: "bounded-loop", confidence: 0.8, uncertainty: "", evidenceEventIds: ["e2"], factors: [], expectedFailureModes: [], requiredControls: [], truthState: "observed" },
] as unknown as Recommendation[];
const usage = {
  totalEvents: 6, resourceEventCount: 6, missingResourceEventCount: 0, agentOrModelEventCount: 3, agentOrModelMissingResourceCount: 0,
  totals: [], overallTokens: { actual: 0, estimated: 75543, unknownCount: 0, eventIds: [] },
  overallCost: { actual: 0, estimated: 0.3132, unknownCount: 0, eventIds: [] },
  overallHumanTimeMinutes: { actual: 0, estimated: 56, unknownCount: 0, eventIds: [] },
  byTask: [], byCase: [], byActorType: [],
  byModel: [{ id: "m1", label: "openai/gpt-4.1", model: "openai/gpt-4.1", eventIds: ["e2"], eventCount: 3, tokens: { actual: 0, estimated: 18909, unknownCount: 0, eventIds: [] }, cost: { actual: 0, estimated: 0.0778, unknownCount: 0, eventIds: [] }, humanTimeMinutes: { actual: 0, estimated: 0, unknownCount: 0, eventIds: [] }, missingResourceEvents: 0 }],
} as unknown as ResourceUsageSummary;

const input = { metadata, graph, kpis, risks, recommendations, usage };

describe("buildProcessReportHtml", () => {
  const html = buildProcessReportHtml(input);

  it("is a self-contained HTML document with no external requests", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<style>");
    // No resource loads — the only URI is the SVG xmlns identifier (not a fetch).
    expect(html).not.toMatch(/(src|href)\s*=\s*["']https?:/i);
    expect(html).not.toMatch(/url\(\s*['"]?https?:/i);
    expect(html).not.toMatch(/@import/i);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link\b/i);
  });

  it("embeds the process name, KPIs, and an inline SVG map", () => {
    expect(html).toContain("Sample workspace");
    expect(html).toContain("10.0%"); // exception rate
    expect(html).toContain("<svg");
    expect(html).toContain("Research topic");
  });

  it("lists risks severity-first and top enhancements", () => {
    const highIdx = html.indexOf("sev-high");
    const medIdx = html.indexOf("sev-medium");
    expect(highIdx).toBeGreaterThan(-1);
    expect(highIdx).toBeLessThan(medIdx);
    expect(html).toContain("Hybrid / agent with harness");
    expect(html).toContain("80%");
  });

  it("reports resource totals and per-model rows", () => {
    expect(html).toContain("75,543");
    expect(html).toContain("$0.3132");
    expect(html).toContain("openai/gpt-4.1");
  });

  it("escapes HTML in labels", () => {
    const evil = { ...metadata, displayName: 'A <script>alert(1)</script> B' } as ProcessMetadata;
    const out = buildProcessReportHtml({ ...input, metadata: evil });
    expect(out).not.toContain("<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;");
  });
});
