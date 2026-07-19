/**
 * Compute-cost breakeven engine (spec 007).
 * Pure functions: observed telemetry in, deterministic cost projections out.
 * Frontier pricing is derived from the workspace's own logged token/cost
 * telemetry (blended $/1M tokens) rather than a hardcoded rate table, so
 * every curve traces back to local records or an explicit assumption.
 */
import type { WorkEvent } from "../domain/types";

const TOKEN_KINDS = new Set(["input-tokens", "output-tokens", "cached-tokens", "reasoning-tokens"]);
const DAY_MS = 86_400_000;

export interface CostBaseline {
  /** Days between first and last observed event (min 1). */
  windowDays: number;
  observedTokens: number;
  observedCostUsd: number;
  /** Observed volume extrapolated to 30 days. */
  monthlyTokens: number;
  monthlyCostUsd: number;
  /** Blended effective $ per 1M tokens from observed telemetry; null when tokens or cost are absent. */
  blendedRatePerMTok: number | null;
  /** Peak 7-day token volume over mean 7-day volume (>=1); 1 = perfectly steady. */
  burstiness: number;
  eventCount: number;
}

export interface SelfHostAssumptions {
  /** $ per GPU-hour (rental-class proxy). */
  gpuHourUsd: number;
  /** Hours provisioned per month (billed whether used or not). */
  hoursProvisionedPerMonth: number;
  /** Effective utilization of provisioned hours, 0..1. */
  utilization: number;
  /** Tokens per fully-utilized GPU-hour. */
  tokensPerHourAtFull: number;
}

export const DEFAULT_ASSUMPTIONS: SelfHostAssumptions = {
  gpuHourUsd: 2.0,
  hoursProvisionedPerMonth: 730,
  utilization: 0.5,
  tokensPerHourAtFull: 1_000_000,
};

/** Last human review of the default assumption levels. */
export const ASSUMPTIONS_REVIEWED = "2026-07";

export function buildCostBaseline(events: WorkEvent[]): CostBaseline {
  let tokens = 0;
  let costUsd = 0;
  let minTs = Number.POSITIVE_INFINITY;
  let maxTs = Number.NEGATIVE_INFINITY;
  const tokensByDay = new Map<number, number>();

  for (const event of events) {
    const ts = Date.parse(event.timestamp);
    if (Number.isFinite(ts)) {
      if (ts < minTs) minTs = ts;
      if (ts > maxTs) maxTs = ts;
    }
    for (const resource of event.resources ?? []) {
      if (resource.value === null) continue;
      if (TOKEN_KINDS.has(resource.kind)) {
        tokens += resource.value;
        if (Number.isFinite(ts)) {
          const day = Math.floor(ts / DAY_MS);
          tokensByDay.set(day, (tokensByDay.get(day) ?? 0) + resource.value);
        }
      } else if (resource.kind === "financial") {
        costUsd += resource.value;
      }
    }
  }

  const windowDays = Number.isFinite(minTs) && Number.isFinite(maxTs)
    ? Math.max(1, Math.ceil((maxTs - minTs) / DAY_MS))
    : 1;

  // Burstiness: peak 7-day token volume vs mean 7-day volume across the window.
  let burstiness = 1;
  if (tokensByDay.size > 0 && windowDays > 7) {
    const days = [...tokensByDay.keys()].sort((a, b) => a - b);
    const first = days[0];
    const weekTotals = new Map<number, number>();
    for (const [day, value] of tokensByDay) {
      const week = Math.floor((day - first) / 7);
      weekTotals.set(week, (weekTotals.get(week) ?? 0) + value);
    }
    const weekCount = Math.max(1, Math.ceil(windowDays / 7));
    const mean = tokens / weekCount;
    const peak = Math.max(...weekTotals.values());
    if (mean > 0) burstiness = Math.max(1, peak / mean);
  }

  const scale = 30 / windowDays;
  const monthlyTokens = tokens * scale;
  const monthlyCostUsd = costUsd * scale;

  return {
    windowDays,
    observedTokens: tokens,
    observedCostUsd: costUsd,
    monthlyTokens,
    monthlyCostUsd,
    blendedRatePerMTok: tokens > 0 && costUsd > 0 ? (costUsd / tokens) * 1_000_000 : null,
    burstiness,
    eventCount: events.length,
  };
}

/** Frontier pay-per-token cost for a monthly volume. */
export function frontierCostPerMonth(volumeTokens: number, ratePerMTok: number): number {
  return (volumeTokens / 1_000_000) * ratePerMTok;
}

/** Effective monthly token capacity of the provisioned self-hosted setup. */
export function selfHostedCapacity(a: SelfHostAssumptions): number {
  return a.hoursProvisionedPerMonth * a.tokensPerHourAtFull * a.utilization;
}

/**
 * Self-hosted pay-per-compute cost: flat while volume fits provisioned
 * capacity, then linear (extra hours at the same effective throughput).
 */
export function selfHostedCostPerMonth(volumeTokens: number, a: SelfHostAssumptions): number {
  const fixed = a.gpuHourUsd * a.hoursProvisionedPerMonth;
  const capacity = selfHostedCapacity(a);
  if (volumeTokens <= capacity || capacity <= 0) return fixed;
  const extraTokens = volumeTokens - capacity;
  const extraHours = extraTokens / (a.tokensPerHourAtFull * a.utilization);
  return fixed + extraHours * a.gpuHourUsd;
}

/**
 * Monthly token volume where frontier and self-hosted costs cross.
 * Returns null when they never cross (self-hosted marginal cost >= frontier
 * rate, so the flat-fee crossing is the only candidate and it must land
 * within or beyond capacity consistently).
 */
export function breakevenVolume(ratePerMTok: number, a: SelfHostAssumptions): number | null {
  if (ratePerMTok <= 0) return null;
  const fixed = a.gpuHourUsd * a.hoursProvisionedPerMonth;
  const capacity = selfHostedCapacity(a);
  // Candidate 1: crossing on the flat segment.
  const flatCross = (fixed / ratePerMTok) * 1_000_000;
  if (flatCross <= capacity) return flatCross;
  // Beyond capacity both are linear; they cross only if self-hosted marginal
  // cost per token is below frontier's.
  const selfMarginalPerMTok = (a.gpuHourUsd / (a.tokensPerHourAtFull * a.utilization)) * 1_000_000;
  if (selfMarginalPerMTok >= ratePerMTok) return null;
  // frontier(v) = fixed + (v - capacity) * selfMarginal  =>  solve for v.
  const v =
    (fixed - capacity * (selfMarginalPerMTok / 1_000_000)) /
    ((ratePerMTok - selfMarginalPerMTok) / 1_000_000);
  return v > capacity ? v : null;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

/** Deterministic one-line verdict (R6). */
export function buildVerdict(baseline: CostBaseline, a: SelfHostAssumptions): string {
  if (baseline.blendedRatePerMTok === null || baseline.monthlyTokens <= 0) {
    return "Not enough token and cost telemetry to compare sourcing models yet — import events that include token and financial resources.";
  }
  const rate = baseline.blendedRatePerMTok;
  const frontier = frontierCostPerMonth(baseline.monthlyTokens, rate);
  const selfHosted = selfHostedCostPerMonth(baseline.monthlyTokens, a);
  const crossover = breakevenVolume(rate, a);
  const usage = baseline.burstiness >= 1.5 ? "spiky" : "steady";
  const volume = fmtTokens(baseline.monthlyTokens);
  if (frontier < selfHosted) {
    const ratio = selfHosted / Math.max(frontier, 0.01);
    const cross = crossover === null
      ? "no breakeven at these assumptions"
      : `breakeven near ${fmtTokens(crossover)} tokens/month at ${Math.round(a.utilization * 100)}% utilization`;
    return `At ${volume} tokens/month with ${usage} usage, frontier pricing is ~${ratio.toFixed(1)}x cheaper; ${cross}.`;
  }
  const ratio = frontier / Math.max(selfHosted, 0.01);
  return `At ${volume} tokens/month with ${usage} usage, self-hosted compute is ~${ratio.toFixed(1)}x cheaper at these assumptions; below ${crossover === null ? "current volume" : `${fmtTokens(crossover)} tokens/month`} frontier pricing wins.`;
}
