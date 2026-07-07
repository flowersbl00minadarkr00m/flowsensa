import type { ResourceUsageSummary, ResourceDriverRow, ModelUsageRow } from "../domain/resourceUsage";

interface Props {
  usage: ResourceUsageSummary;
  onOpenEvent: (id: string) => void;
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: value < 10 ? 2 : 0 });
}

function formatCost(actual: number, estimated: number): string {
  const total = actual + estimated;
  if (total === 0) return "$0";
  return `$${total.toLocaleString(undefined, { minimumFractionDigits: total < 1 ? 4 : 2, maximumFractionDigits: total < 1 ? 4 : 2 })}`;
}

function formatMinutes(actual: number, estimated: number): string {
  const total = actual + estimated;
  if (total === 0) return "0m";
  if (total >= 60) return `${Math.floor(total / 60)}h ${Math.round(total % 60)}m`;
  return `${formatNumber(total)}m`;
}

function EvidenceButton({ eventIds, onOpenEvent }: { eventIds: string[]; onOpenEvent: (id: string) => void }) {
  const firstEvent = eventIds[0];
  if (!firstEvent) return <span style={{ color: "var(--text-dim)" }}>-</span>;
  return (
    <button className="btn ghost" type="button" style={{ padding: 0, fontSize: "0.72rem" }} onClick={() => onOpenEvent(firstEvent)}>
      Open evidence
    </button>
  );
}

function ConfidenceBreakdown({ row }: { row: ResourceDriverRow }) {
  const actual = row.tokens.actual + row.cost.actual + row.humanTimeMinutes.actual;
  const estimated = row.tokens.estimated + row.cost.estimated + row.humanTimeMinutes.estimated;
  if (actual > 0 && estimated === 0) return <span className="status-chip connected">Actual telemetry</span>;
  if (actual > 0 && estimated > 0) return <span className="status-chip">Actual + estimated</span>;
  if (estimated > 0) return <span className="advisory-label">Estimated</span>;
  return <span className="source-pill">Missing</span>;
}

function DriverTable({
  title,
  subtitle,
  rows,
  onOpenEvent,
}: {
  title: string;
  subtitle: string;
  rows: ResourceDriverRow[];
  onOpenEvent: (id: string) => void;
}) {
  return (
    <div className="card" style={{ marginBottom: "1.2rem" }}>
      <div className="card-header">
        <h3>{title}</h3>
        <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>{subtitle}</span>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state" style={{ padding: "1.5rem" }}>
          <p>No resource telemetry found for this view.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Events</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Human time</th>
                <th>Quality</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.label}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{row.eventCount}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{formatNumber(row.tokens.actual + row.tokens.estimated)}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{formatCost(row.cost.actual, row.cost.estimated)}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{formatMinutes(row.humanTimeMinutes.actual, row.humanTimeMinutes.estimated)}</td>
                  <td><ConfidenceBreakdown row={row} /></td>
                  <td><EvidenceButton eventIds={row.eventIds} onOpenEvent={onOpenEvent} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModelTable({ rows, onOpenEvent }: { rows: ModelUsageRow[]; onOpenEvent: (id: string) => void }) {
  return (
    <div className="card" style={{ marginBottom: "1.2rem" }}>
      <div className="card-header">
        <h3>LLM and tool usage</h3>
        <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>Grouped by model, tool, or agent where telemetry exists</span>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state" style={{ padding: "1.5rem" }}>
          <p>No agent or model events were found in this process.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Model / tool</th>
                <th>Events</th>
                <th>Missing resources</th>
                <th>Tokens</th>
                <th>Cost</th>
                <th>Quality</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.model ?? row.label}</strong>
                    <small style={{ display: "block", color: "var(--text-dim)" }}>
                      {[row.tool, row.systemLabel].filter(Boolean).join(" · ") || "Agent activity"}
                    </small>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{row.eventCount}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: row.missingResourceEvents ? "var(--warning)" : "var(--success)" }}>{row.missingResourceEvents}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{formatNumber(row.tokens.actual + row.tokens.estimated)}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{formatCost(row.cost.actual, row.cost.estimated)}</td>
                  <td><ConfidenceBreakdown row={row} /></td>
                  <td><EvidenceButton eventIds={row.eventIds} onOpenEvent={onOpenEvent} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ResourceUsage({ usage, onOpenEvent }: Props) {
  const resourceCoverage = usage.totalEvents ? Math.round((usage.resourceEventCount / usage.totalEvents) * 100) : 0;
  const llmCoverage = usage.agentOrModelEventCount
    ? Math.round(((usage.agentOrModelEventCount - usage.agentOrModelMissingResourceCount) / usage.agentOrModelEventCount) * 100)
    : 0;

  return (
    <div className="module-content">
      <div className="module-heading">
        <h2>Resource Usage</h2>
        <p>Token, cost, and human-time telemetry for the selected process. Actual logged values stay separate from estimates.</p>
      </div>

      <div className="kpi-strip" style={{ gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="kpi-card">
          <span className="kpi-label">Token Usage</span>
          <span className="kpi-value" style={{ fontSize: "1.7rem" }}>{formatNumber(usage.overallTokens.actual + usage.overallTokens.estimated)}</span>
          <span className="kpi-sublabel">{formatNumber(usage.overallTokens.actual)} actual · {formatNumber(usage.overallTokens.estimated)} estimated</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Cost</span>
          <span className="kpi-value" style={{ fontSize: "1.7rem" }}>{formatCost(usage.overallCost.actual, usage.overallCost.estimated)}</span>
          <span className="kpi-sublabel">${usage.overallCost.actual.toFixed(2)} actual · ${usage.overallCost.estimated.toFixed(2)} estimated</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Human Time</span>
          <span className="kpi-value" style={{ fontSize: "1.7rem" }}>{formatMinutes(usage.overallHumanTimeMinutes.actual, usage.overallHumanTimeMinutes.estimated)}</span>
          <span className="kpi-sublabel">{formatNumber(usage.overallHumanTimeMinutes.actual)}m actual · {formatNumber(usage.overallHumanTimeMinutes.estimated)}m estimated</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Coverage</span>
          <span className="kpi-value" style={{ fontSize: "1.7rem" }}>{resourceCoverage}%</span>
          <span className="kpi-sublabel">{usage.resourceEventCount} of {usage.totalEvents} events include resources</span>
        </div>
      </div>

      <div className="workspace-import-status" role="status" style={{ marginBottom: "1.2rem" }}>
        <strong>Telemetry quality:</strong> {usage.agentOrModelMissingResourceCount} of {usage.agentOrModelEventCount} agent/model events are missing token or cost resources. LLM coverage is {llmCoverage}%.
      </div>

      <ModelTable rows={usage.byModel.slice(0, 8)} onOpenEvent={onOpenEvent} />
      <DriverTable title="Top resource-driving tasks" subtitle="Tasks ranked by tokens, cost, and human time" rows={usage.byTask.slice(0, 10)} onOpenEvent={onOpenEvent} />
      <DriverTable title="Case totals" subtitle="Resource usage by process case" rows={usage.byCase.slice(0, 10)} onOpenEvent={onOpenEvent} />
      <DriverTable title="Actor type totals" subtitle="Human, agent, system, and external resource split" rows={usage.byActorType} onOpenEvent={onOpenEvent} />
    </div>
  );
}
