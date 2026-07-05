import type { Alert, KPISnapshot, ProcessGraph, Recommendation, WorkEvent } from '../domain/types';

interface Props {
  graph?: ProcessGraph;
  events?: WorkEvent[];
  recommendations: Recommendation[];
  alerts: Alert[];
  kpis: KPISnapshot;
  onRunDemo: () => void;
  onViewModule: (view: string) => void;
}

function formatThroughput(ms: number): string {
  if (ms === 0) return '—';
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function OperationalOverview({
  graph,
  events = [],
  recommendations,
  alerts,
  kpis,
  onRunDemo,
  onViewModule,
}: Props) {
  const totalNodes = graph?.nodes.length ?? 0;
  const confirmedNodes = graph?.nodes.filter(n => n.status === 'confirmed').length ?? 0;
  const healthPct = totalNodes > 0 ? Math.round((confirmedNodes / totalNodes) * 100) : 0;

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const topRecs = recommendations.slice(0, 3);

  return (
    <div className="module-content">
      <div className="module-heading">
        <h2>Operational Overview</h2>
        <p>Real-time snapshot of your process intelligence workspace.</p>
      </div>

      {/* KPI Strip */}
      <div className="kpi-strip">
        <article className="kpi-card">
          <span className="kpi-label">Cases</span>
          <span className="kpi-value">{kpis.caseCount}</span>
          <span className="kpi-sublabel">Unique case IDs</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Median Throughput</span>
          <span className="kpi-value">{formatThroughput(kpis.medianThroughputMs)}</span>
          <span className="kpi-sublabel">End-to-end per case</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Exception Rate</span>
          <span className="kpi-value">{(kpis.exceptionRate * 100).toFixed(1)}%</span>
          <span className="kpi-sublabel">Of all events</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Automation Coverage</span>
          <span className="kpi-value">{(kpis.automationCoverageRate * 100).toFixed(0)}%</span>
          <span className="kpi-sublabel">Confirmed nodes</span>
        </article>
      </div>

      {/* Process Health Bar */}
      <div className="health-bar-wrap card" style={{ marginBottom: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Process health — {confirmedNodes} / {totalNodes} nodes confirmed
          </span>
          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            {healthPct}%
          </span>
        </div>
        <div className="health-bar-track">
          <div className="health-bar-fill" style={{ width: `${healthPct}%` }} />
        </div>
      </div>

      {/* Two-column grid */}
      <div className="two-col-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Top opportunities */}
        <div className="card">
          <div className="card-header">
            <h3>Top Opportunities</h3>
            <span className="badge">{recommendations.length}</span>
          </div>
          {topRecs.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <p>No recommendations yet. Import process events to begin.</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
              {topRecs.map(rec => (
                <li
                  key={rec.nodeId}
                  style={{
                    padding: '0.6rem',
                    background: 'var(--surface-2)',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.82rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--text)' }}>{rec.nodeId}</strong>
                    <span style={{ color: 'var(--accent)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>
                      {Math.round(rec.confidence * 100)}%
                    </span>
                  </div>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {rec.recommendationClass}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Alert feed */}
        <div className="card">
          <div className="card-header">
            <h3>Alert Feed</h3>
            <button
              className="btn ghost"
              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
              type="button"
              onClick={() => onViewModule('alerts')}
            >
              View all →
            </button>
          </div>
          {activeAlerts.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <p>No active alerts.</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
              {activeAlerts.slice(0, 5).map(alert => (
                <li key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <span className={`alert-chip ${alert.severity}`}>{alert.severity}</span>
                  <span style={{ color: 'var(--text)', flex: 1 }}>{alert.description}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn primary" type="button" onClick={onRunDemo}>
          Run demo activity
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => onViewModule('alerts')}
          style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}
        >
          View full alert log
        </button>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
          {events.length} events · schema v1.0.0
        </span>
      </div>
    </div>
  );
}
