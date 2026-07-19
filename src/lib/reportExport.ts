/**
 * Self-contained process report (spec 006 R6 / T9).
 * Emits one standalone HTML file — inline CSS, embedded static SVG map, no
 * external requests — suitable for posting or attaching to a PR. Pure string
 * building over existing analysis; no domain mutation.
 */
import type {
  KPISnapshot,
  ProcessGraph,
  ProcessMetadata,
  ProcessRisk,
  Recommendation,
} from "../domain/types";
import { taskDisplayName } from "../domain/processMetadata";
import { downloadText } from "../domain/exports";
import type { ResourceUsageSummary } from "../domain/resourceUsage";
import { failureColor, layoutProcessMap, type LaneKey } from "./mapLayout";

export interface ProcessReportInput {
  metadata: ProcessMetadata;
  graph: ProcessGraph;
  kpis: KPISnapshot;
  risks: ProcessRisk[];
  recommendations: Recommendation[];
  usage: ResourceUsageSummary;
}

const SEVERITY_RANK: Record<ProcessRisk["severity"], number> = { high: 0, medium: 1, low: 2 };

const LANE_HEX: Record<LaneKey, string> = {
  human: "#4f8ee8",
  agent: "#7755e7",
  system: "#2dd4a0",
  external: "#8b93a7",
  "service-account": "#f59342",
};

const FAILURE_HEX: Record<string, string> = {
  "var(--success)": "#2dd4a0",
  "var(--info)": "#4f8ee8",
  "var(--warning)": "#f59342",
  "var(--danger)": "#ef5260",
};

function esc(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function fmtMs(ms: number): string {
  if (!ms) return "—";
  const min = ms / 60000;
  if (min < 60) return `${Math.round(min)}m`;
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;
}

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: n < 10 ? 2 : 0 });
}

/** Render the swimlane layout to a static, theme-free SVG string. */
function mapSvg(input: ProcessReportInput): string {
  const layout = layoutProcessMap(input.graph);
  const lanes = layout.lanes
    .map(
      (lane) =>
        `<rect x="0" y="${lane.top}" width="${layout.width}" height="${lane.height}" fill="${LANE_HEX[lane.key]}" opacity="0.06"/>` +
        `<line x1="0" y1="${lane.top}" x2="${layout.width}" y2="${lane.top}" stroke="#dcdfe6" stroke-width="1"/>` +
        `<text x="8" y="${lane.top + 15}" font-size="11" font-weight="600" fill="${LANE_HEX[lane.key]}">${esc(lane.key)}</text>`,
    )
    .join("");
  const edges = layout.edges
    .map(
      (e) =>
        `<path d="${e.path}" fill="none" stroke="${e.onCriticalPath ? "#7755e7" : e.selfLoop ? "#f59342" : "#c3c8d4"}" stroke-width="${e.onCriticalPath ? Math.max(2.5, e.strokeWidth) : e.strokeWidth}"${e.selfLoop ? ' stroke-dasharray="3 3"' : ""} opacity="${e.onCriticalPath ? 0.95 : 0.5}"/>`,
    )
    .join("");
  const nodes = layout.nodes
    .map((n) => {
      const node = input.graph.nodes.find((x) => x.id === n.id)!;
      const label = taskDisplayName(input.metadata, node.id, node.label);
      const shown = label.length > 20 ? `${label.slice(0, 18)}…` : label;
      const bar = FAILURE_HEX[failureColor(n.failureRate)] ?? "#2dd4a0";
      return (
        `<g transform="translate(${n.x},${n.y})">` +
        `<rect width="${n.w}" height="${n.h}" rx="6" fill="#ffffff" stroke="${n.onCriticalPath ? "#7755e7" : "#d3d7e0"}" stroke-width="${n.onCriticalPath ? 1.75 : 1}"/>` +
        `<text x="${n.w / 2}" y="20" font-size="11" text-anchor="middle" fill="#242534">${esc(shown)}</text>` +
        `<text x="${n.w / 2}" y="35" font-size="9" text-anchor="middle" fill="#6b7280">n=${n.frequency}${n.failureRate > 0 ? ` · ${Math.round(n.failureRate * 100)}% fail/retry` : ""}</text>` +
        `<rect x="0" y="${n.h - 6}" width="${n.w}" height="6" fill="${bar}" opacity="0.85"/>` +
        `</g>`
      );
    })
    .join("");
  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Process map">${lanes}${edges}${nodes}</svg>`;
}

export function buildProcessReportHtml(input: ProcessReportInput): string {
  const { metadata, kpis, risks, recommendations, usage } = input;
  const generated = new Date().toISOString().slice(0, 16).replace("T", " ");

  const topRisks = [...risks]
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.taskName.localeCompare(b.taskName))
    .slice(0, 8);
  const topRecs = [...recommendations].sort((a, b) => b.confidence - a.confidence).slice(0, 6);

  const totalTokens = usage.overallTokens.actual + usage.overallTokens.estimated;
  const totalCost = usage.overallCost.actual + usage.overallCost.estimated;
  const totalMinutes = usage.overallHumanTimeMinutes.actual + usage.overallHumanTimeMinutes.estimated;

  const kpiTiles = [
    ["Cases observed", fmtNum(kpis.caseCount)],
    ["Median throughput", fmtMs(kpis.medianThroughputMs)],
    ["Exception rate", `${(kpis.exceptionRate * 100).toFixed(1)}%`],
    ["Rework rate", `${(kpis.reworkRate * 100).toFixed(1)}%`],
    ["Automation coverage", `${Math.round(kpis.automationCoverageRate * 100)}%`],
  ]
    .map(([label, value]) => `<div class="kpi"><strong>${value}</strong><span>${esc(label)}</span></div>`)
    .join("");

  const riskRows = topRisks.length
    ? topRisks
        .map(
          (r) =>
            `<tr><td><span class="sev sev-${r.severity}">${r.severity}</span></td><td>${esc(r.taskName)}</td><td>${esc(r.riskIdentified)}</td><td>${esc(r.riskMitigation)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">No risks identified.</td></tr>`;

  const recRows = topRecs.length
    ? topRecs
        .map(
          (rec) =>
            `<tr><td>${esc(taskDisplayName(metadata, rec.nodeId, rec.nodeId))}</td><td>${esc(rec.automationFamily)}</td><td>${esc(rec.recommendationClass)}</td><td>${Math.round(rec.confidence * 100)}%</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="4" class="muted">No enhancement candidates.</td></tr>`;

  const modelRows = usage.byModel
    .slice(0, 5)
    .map(
      (m) =>
        `<tr><td>${esc(m.model ?? m.label)}</td><td>${m.eventCount}</td><td>${fmtNum(m.tokens.actual + m.tokens.estimated)}</td><td>$${(m.cost.actual + m.cost.estimated).toFixed(4)}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(metadata.displayName)} — Flowsensa process report</title>
<style>
  :root { --ink:#1b1e24; --muted:#6b7280; --line:#e3e5ec; --accent:#7755e7; }
  * { box-sizing:border-box; }
  body { margin:0; padding:32px; background:#f4f4f7; color:var(--ink); font:15px/1.55 -apple-system,Segoe UI,system-ui,sans-serif; }
  main { max-width:960px; margin:0 auto; background:#fff; border:1px solid var(--line); border-radius:12px; padding:32px; }
  header { border-bottom:2px solid var(--ink); padding-bottom:14px; margin-bottom:22px; }
  h1 { font-size:26px; margin:0 0 4px; }
  .meta { color:var(--muted); font-size:13px; }
  h2 { font-size:16px; margin:26px 0 10px; }
  .kpis { display:grid; grid-template-columns:repeat(5,1fr); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  .kpi { background:#fff; padding:14px; display:flex; flex-direction:column; gap:4px; }
  .kpi strong { font-size:22px; font-family:ui-monospace,Consolas,monospace; }
  .kpi span { color:var(--muted); font-size:12px; }
  .map { border:1px solid var(--line); border-radius:8px; padding:10px; overflow-x:auto; background:#fbfbfd; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th,td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.03em; }
  .sev { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; text-transform:uppercase; }
  .sev-high { background:rgba(239,82,96,.14); color:#c02b38; }
  .sev-medium { background:rgba(245,147,66,.16); color:#a25309; }
  .sev-low { background:rgba(45,212,160,.16); color:#0f7a58; }
  .muted { color:var(--muted); }
  footer { margin-top:24px; padding-top:12px; border-top:1px solid var(--line); color:var(--muted); font-size:12px; }
  @media print { body { background:#fff; padding:0; } main { border:0; } }
</style></head>
<body><main>
  <header>
    <h1>${esc(metadata.displayName)}</h1>
    <p class="meta">Flowsensa process report · generated ${generated} · ${Math.round(metadata.confidence * 100)}% minimum graph confidence · all figures from local evidence</p>
  </header>

  <section><h2>Operational KPIs</h2><div class="kpis">${kpiTiles}</div></section>

  <section><h2>Process map</h2><div class="map">${mapSvg(input)}</div>
  <p class="meta">Actor swimlanes · edge weight = transition frequency · bar colour = fail/retry rate · accent = critical path.</p></section>

  <section><h2>Top risks</h2>
    <table><thead><tr><th>Severity</th><th>Task</th><th>Risk identified</th><th>Mitigation</th></tr></thead>
    <tbody>${riskRows}</tbody></table></section>

  <section><h2>Top enhancement candidates</h2>
    <table><thead><tr><th>Task</th><th>Family</th><th>Treatment</th><th>Confidence</th></tr></thead>
    <tbody>${recRows}</tbody></table></section>

  <section><h2>Resource usage</h2>
    <div class="kpis" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi"><strong>${fmtNum(totalTokens)}</strong><span>Tokens</span></div>
      <div class="kpi"><strong>$${totalCost.toFixed(4)}</strong><span>Cost</span></div>
      <div class="kpi"><strong>${fmtMs(totalMinutes * 60000)}</strong><span>Human time</span></div>
      <div class="kpi"><strong>${usage.totalEvents ? Math.round((usage.resourceEventCount / usage.totalEvents) * 100) : 0}%</strong><span>Coverage</span></div>
    </div>
    ${modelRows ? `<table style="margin-top:12px"><thead><tr><th>Model / tool</th><th>Events</th><th>Tokens</th><th>Cost</th></tr></thead><tbody>${modelRows}</tbody></table>` : ""}
  </section>

  <footer>Generated locally by Flowsensa. No process data left this browser to produce this report.</footer>
</main></body></html>`;
}

export function exportProcessReport(input: ProcessReportInput): void {
  const slug = input.metadata.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "process";
  downloadText(`flowsensa-report-${slug}.html`, buildProcessReportHtml(input), "text/html");
}
