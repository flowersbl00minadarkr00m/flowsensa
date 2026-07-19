import { useMemo, useState } from "react";
import type { WorkEvent } from "../domain/types";
import {
  ASSUMPTIONS_REVIEWED,
  DEFAULT_ASSUMPTIONS,
  type SelfHostAssumptions,
  breakevenVolume,
  buildCostBaseline,
  buildVerdict,
  frontierCostPerMonth,
  selfHostedCostPerMonth,
} from "../lib/breakeven";

interface Props {
  events: WorkEvent[];
}

const W = 640;
const H = 260;
const PAD = { l: 56, r: 16, t: 14, b: 34 };
const SAMPLES = 100;

function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function AssumptionField({
  label,
  value,
  step,
  min,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.72rem", color: "var(--text-muted, #6b7280)" }}>
      <span>
        {label} <span className="advisory-label" style={{ marginLeft: "0.25rem" }}>Assumption</span>
      </span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        style={{ maxWidth: "9rem" }}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= min) onChange(v);
        }}
      />
    </label>
  );
}

export function BreakevenPanel({ events }: Props) {
  const baseline = useMemo(() => buildCostBaseline(events), [events]);
  const [assumptions, setAssumptions] = useState<SelfHostAssumptions>(DEFAULT_ASSUMPTIONS);

  const rate = baseline.blendedRatePerMTok;
  const chart = useMemo(() => {
    if (rate === null || baseline.monthlyTokens <= 0) return null;
    const crossover = breakevenVolume(rate, assumptions);
    const maxVolume = Math.max(
      baseline.monthlyTokens * 3,
      crossover !== null ? crossover * 1.4 : 0,
      assumptions.hoursProvisionedPerMonth * assumptions.tokensPerHourAtFull * assumptions.utilization * 1.2
    );
    const utilLow = { ...assumptions, utilization: Math.max(0.05, assumptions.utilization - 0.2) };
    const utilHigh = { ...assumptions, utilization: Math.min(0.95, assumptions.utilization + 0.2) };

    const xs: number[] = [];
    for (let i = 0; i <= SAMPLES; i++) xs.push((maxVolume * i) / SAMPLES);
    const frontier = xs.map((v) => frontierCostPerMonth(v, rate));
    const selfHost = xs.map((v) => selfHostedCostPerMonth(v, assumptions));
    const bandLow = xs.map((v) => selfHostedCostPerMonth(v, utilHigh)); // higher utilization = cheaper
    const bandHigh = xs.map((v) => selfHostedCostPerMonth(v, utilLow));
    const maxCost = Math.max(...frontier, ...bandHigh) * 1.05;

    const x = (v: number) => PAD.l + (v / maxVolume) * (W - PAD.l - PAD.r);
    const y = (c: number) => H - PAD.b - (c / maxCost) * (H - PAD.t - PAD.b);
    const path = (values: number[]) => values.map((c, i) => `${i ? "L" : "M"}${x(xs[i]).toFixed(1)},${y(c).toFixed(1)}`).join(" ");
    const band =
      `${bandHigh.map((c, i) => `${i ? "L" : "M"}${x(xs[i]).toFixed(1)},${y(c).toFixed(1)}`).join(" ")} ` +
      `${[...bandLow].reverse().map((c, i) => `L${x(xs[SAMPLES - i]).toFixed(1)},${y(c).toFixed(1)}`).join(" ")} Z`;

    return { maxVolume, maxCost, x, y, frontierPath: path(frontier), selfHostPath: path(selfHost), bandPath: band, crossover };
  }, [rate, baseline.monthlyTokens, assumptions]);

  const verdict = buildVerdict(baseline, assumptions);

  return (
    <div className="card" style={{ marginBottom: "1.2rem" }}>
      <div className="card-header">
        <h3>Sourcing breakeven: pay-per-token vs pay-per-compute</h3>
        <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
          Frontier rate derived from this workspace's telemetry · self-hosting assumptions editable · defaults reviewed {ASSUMPTIONS_REVIEWED}
        </span>
      </div>

      {chart === null ? (
        <div className="empty-state" style={{ padding: "1.5rem" }}>
          <p>{verdict}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem", padding: "0.4rem 0" }}>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            <strong>Verdict:</strong> {verdict}{" "}
            <span className="advisory-label">Estimated</span>
          </p>
          <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.72rem" }}>
            Based on {baseline.windowDays} observed day{baseline.windowDays === 1 ? "" : "s"} · {fmtTokens(baseline.observedTokens)} tokens · ${baseline.observedCostUsd.toFixed(2)} logged cost · blended rate ${rate!.toFixed(2)}/1M tokens · burstiness {baseline.burstiness.toFixed(1)}× (peak week vs mean)
          </p>

          <div style={{ overflowX: "auto" }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Monthly cost versus monthly token volume for frontier API pricing and self-hosted compute">
              {[0.25, 0.5, 0.75, 1].map((r) => (
                <g key={r}>
                  <line x1={PAD.l} x2={W - PAD.r} y1={chart.y(chart.maxCost * r)} y2={chart.y(chart.maxCost * r)} stroke="var(--border, #e5e7eb)" strokeWidth="1" />
                  <text x={PAD.l - 6} y={chart.y(chart.maxCost * r) + 3} textAnchor="end" fontSize="10" fill="var(--text-dim, #9ca3af)">{fmtUsd(chart.maxCost * r)}</text>
                </g>
              ))}
              {[0.25, 0.5, 0.75, 1].map((r) => (
                <text key={r} x={chart.x(chart.maxVolume * r)} y={H - PAD.b + 16} textAnchor="middle" fontSize="10" fill="var(--text-dim, #9ca3af)">{fmtTokens(chart.maxVolume * r)}</text>
              ))}
              <text x={W - PAD.r} y={H - 4} textAnchor="end" fontSize="10" fill="var(--text-dim, #9ca3af)">tokens / month</text>

              <path d={chart.bandPath} fill="var(--accent-dim, rgba(109,91,208,0.12))" stroke="none" />
              <path d={chart.selfHostPath} fill="none" stroke="var(--info, #4f8ee8)" strokeWidth="2" />
              <path d={chart.frontierPath} fill="none" stroke="var(--warning, #f59342)" strokeWidth="2" />

              {chart.crossover !== null && chart.crossover <= chart.maxVolume && (
                <g>
                  <line x1={chart.x(chart.crossover)} x2={chart.x(chart.crossover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--text-dim, #9ca3af)" strokeDasharray="4 3" strokeWidth="1" />
                  <text x={chart.x(chart.crossover)} y={PAD.t + 10} textAnchor="middle" fontSize="10" fill="var(--text-dim, #6b7280)">breakeven {fmtTokens(chart.crossover)}</text>
                </g>
              )}

              <g>
                <circle cx={chart.x(baseline.monthlyTokens)} cy={chart.y(frontierCostPerMonth(baseline.monthlyTokens, rate!))} r="5" fill="var(--warning, #f59342)" stroke="#fff" strokeWidth="1.5" />
                <text x={chart.x(baseline.monthlyTokens)} y={chart.y(frontierCostPerMonth(baseline.monthlyTokens, rate!)) - 10} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text, #1f2937)">you are here</text>
              </g>

              <g fontSize="10">
                <rect x={PAD.l + 8} y={PAD.t} width="10" height="3" fill="var(--warning, #f59342)" />
                <text x={PAD.l + 22} y={PAD.t + 4} fill="var(--text-dim, #6b7280)">Frontier (pay-per-token)</text>
                <rect x={PAD.l + 158} y={PAD.t} width="10" height="3" fill="var(--info, #4f8ee8)" />
                <text x={PAD.l + 172} y={PAD.t + 4} fill="var(--text-dim, #6b7280)">Self-hosted (pay-per-compute, ±20pp utilization band)</text>
              </g>
            </svg>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "end" }}>
            <AssumptionField label="GPU $/hour" value={assumptions.gpuHourUsd} step={0.25} min={0.05} onChange={(v) => setAssumptions((a) => ({ ...a, gpuHourUsd: v }))} />
            <AssumptionField label="Hours provisioned / month" value={assumptions.hoursProvisionedPerMonth} step={10} min={1} onChange={(v) => setAssumptions((a) => ({ ...a, hoursProvisionedPerMonth: v }))} />
            <AssumptionField label="Utilization (0-1)" value={assumptions.utilization} step={0.05} min={0.05} onChange={(v) => setAssumptions((a) => ({ ...a, utilization: Math.min(0.95, v) }))} />
            <AssumptionField label="Tokens / GPU-hour (full)" value={assumptions.tokensPerHourAtFull} step={100000} min={1000} onChange={(v) => setAssumptions((a) => ({ ...a, tokensPerHourAtFull: v }))} />
            <button className="btn ghost" type="button" style={{ fontSize: "0.72rem" }} onClick={() => setAssumptions(DEFAULT_ASSUMPTIONS)}>
              Reset defaults
            </button>
          </div>
          <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.7rem" }}>
            Not a full TCO model: colocation, power contracts, and ops labor are out of scope — GPU-rental $/hr is the stated proxy. The tradeoff is volume and predictability as much as sovereignty.
          </p>
        </div>
      )}
    </div>
  );
}
