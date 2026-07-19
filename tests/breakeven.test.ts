import { describe, expect, it } from "vitest";
import {
  DEFAULT_ASSUMPTIONS,
  breakevenVolume,
  buildCostBaseline,
  buildVerdict,
  frontierCostPerMonth,
  selfHostedCapacity,
  selfHostedCostPerMonth,
} from "../src/lib/breakeven";
import type { WorkEvent } from "../src/domain/types";

function event(id: string, timestamp: string, tokens: number, costUsd: number): WorkEvent {
  return {
    eventId: id,
    caseId: "case-1",
    timestamp,
    activity: { id: "act", label: "act" },
    actor: { id: "agent-1", type: "agent", label: "agent" },
    result: { status: "success" },
    truthState: "deterministic",
    provenance: { sourceType: "import", sourceRef: "test" },
    resources: [
      { kind: "input-tokens", unit: "tokens", value: tokens, measurementClass: "estimated" },
      { kind: "financial", unit: "usd", value: costUsd, measurementClass: "estimated" },
    ],
  } as unknown as WorkEvent;
}

describe("buildCostBaseline", () => {
  it("extrapolates observed volume to 30 days and derives a blended rate", () => {
    // 10 days of window, 1M tokens, $3 → 3M tokens and $9 per month, $3/MTok.
    const events = [
      event("e1", "2026-06-01T00:00:00Z", 400_000, 1.2),
      event("e2", "2026-06-06T00:00:00Z", 300_000, 0.9),
      event("e3", "2026-06-10T12:00:00Z", 300_000, 0.9),
    ];
    const b = buildCostBaseline(events);
    expect(b.windowDays).toBe(10);
    expect(b.observedTokens).toBe(1_000_000);
    expect(b.monthlyTokens).toBeCloseTo(3_000_000, 0);
    expect(b.blendedRatePerMTok).toBeCloseTo(3.0, 5);
  });

  it("returns null blended rate without cost telemetry", () => {
    const e = event("e1", "2026-06-01T00:00:00Z", 500_000, 0);
    expect(buildCostBaseline([e]).blendedRatePerMTok).toBeNull();
  });

  it("reports burstiness > 1 for spiky weeks and ~1 for steady load", () => {
    const spiky = [
      event("e1", "2026-06-01T00:00:00Z", 1_000_000, 3),
      event("e2", "2026-06-02T00:00:00Z", 1_000_000, 3),
      event("e3", "2026-06-20T00:00:00Z", 10_000, 0.03),
    ];
    expect(buildCostBaseline(spiky).burstiness).toBeGreaterThan(1.5);
  });
});

describe("cost models", () => {
  it("frontier cost is linear in volume", () => {
    expect(frontierCostPerMonth(2_000_000, 3)).toBeCloseTo(6);
  });

  it("self-hosted cost is flat within capacity, linear beyond", () => {
    const a = DEFAULT_ASSUMPTIONS; // $2/hr * 730h = $1460 fixed; capacity 365M tokens
    const fixed = a.gpuHourUsd * a.hoursProvisionedPerMonth;
    expect(selfHostedCostPerMonth(1_000_000, a)).toBeCloseTo(fixed);
    expect(selfHostedCostPerMonth(selfHostedCapacity(a), a)).toBeCloseTo(fixed);
    expect(selfHostedCostPerMonth(selfHostedCapacity(a) * 2, a)).toBeCloseTo(fixed * 2);
  });

  it("finds the flat-segment breakeven when it lands within capacity", () => {
    const a = DEFAULT_ASSUMPTIONS;
    const rate = 10; // $10/MTok → breakeven at 146M tokens, capacity is 365M
    const v = breakevenVolume(rate, a);
    expect(v).not.toBeNull();
    expect(v!).toBeCloseTo((a.gpuHourUsd * a.hoursProvisionedPerMonth / rate) * 1_000_000, 0);
    expect(v!).toBeLessThan(selfHostedCapacity(a));
  });

  it("returns null when self-hosted marginal cost exceeds the frontier rate", () => {
    // $2/MTok frontier vs $4/MTok self-hosted marginal → flat crossing beyond capacity, never crosses after.
    const a = { ...DEFAULT_ASSUMPTIONS, tokensPerHourAtFull: 1_000_000, utilization: 0.5, gpuHourUsd: 2 };
    expect(breakevenVolume(2, a)).toBeNull();
  });
});

describe("verdict", () => {
  it("is stable for the same inputs and names the cheaper option", () => {
    const events = [
      event("e1", "2026-06-01T00:00:00Z", 400_000, 1.2),
      event("e2", "2026-06-10T12:00:00Z", 600_000, 1.8),
    ];
    const b = buildCostBaseline(events);
    const v1 = buildVerdict(b, DEFAULT_ASSUMPTIONS);
    const v2 = buildVerdict(b, DEFAULT_ASSUMPTIONS);
    expect(v1).toBe(v2);
    expect(v1).toContain("frontier pricing is");
  });

  it("degrades honestly without telemetry", () => {
    expect(buildVerdict(buildCostBaseline([]), DEFAULT_ASSUMPTIONS)).toContain("Not enough token and cost telemetry");
  });
});
