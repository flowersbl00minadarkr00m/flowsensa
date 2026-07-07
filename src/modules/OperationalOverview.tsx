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
  if (ms === 0) return '-';
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function shortClass(label: string): string {
  if (label.includes('Deterministic')) return 'Automate';
  if (label.includes('Probabilistic')) return 'AI assist';
  if (label.includes('Hybrid') || label.includes('Bounded')) return 'Guarded hybrid';
  if (label.includes('Simplify')) return 'Simplify';
  if (label.includes('manual') || label.includes('Manual')) return 'Keep human';
  return 'More evidence';
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
  const loopNodes = graph?.nodes.slice(0, 6) ?? [];
  const provisional = confirmedNodes === 0;

  return (
    <div className="module-content observe-screen">
      <section className="work-loop-hero" aria-labelledby="observe-title">
        <div className="work-loop-copy">
          <p className="eyebrow">Human-agent work loop</p>
          <h2 id="observe-title">Observe the actual path before changing the system.</h2>
          <p>
            Flowsensa is reading the creator/project sample as evidence: post research,
            drafting, review, coding, testing, deployment, and verification. Confirm the
            map first, then choose where to automate, add AI, simplify, or keep judgment human-owned.
          </p>
          <div className="work-loop-actions" aria-label="Primary workflow actions">
            <button className="btn primary" type="button" onClick={() => onViewModule('explorer')}>
              Map + confirm
            </button>
            <button className="btn" type="button" onClick={() => onViewModule('improvements')}>
              Review interventions
            </button>
            <button className="btn ghost" type="button" onClick={onRunDemo}>
              Run demo event
            </button>
          </div>
        </div>

        <div className="work-loop-card" aria-label="Observed process path preview">
          <div className="card-header">
            <h3>Observed path</h3>
            <span className={provisional ? 'status-chip' : 'status-chip connected'}>
              {confirmedNodes}/{totalNodes} confirmed
            </span>
          </div>
          <ol className="loop-path">
            {loopNodes.map((node, index) => (
              <li key={node.id}>
                <span className="loop-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{node.label}</strong>
                  <span>{node.frequency} runs · {node.actorTypes.join(', ') || 'actor unknown'}</span>
                </div>
              </li>
            ))}
          </ol>
          {loopNodes.length === 0 && (
            <div className="empty-state">
              <p>Import work events to reconstruct the path.</p>
            </div>
          )}
        </div>
      </section>

      <div className="truth-gate card">
        <div>
          <p className="eyebrow">Truth gate</p>
          <h3>{provisional ? 'Recommendations are provisional until the map is confirmed.' : 'Confirmed truth is ready for improvement analysis.'}</h3>
          <p>
            Evidence-backed process mining is strongest when inferred activities,
            ownership, and boundaries are corrected before automation decisions.
          </p>
        </div>
        <button className="btn" type="button" onClick={() => onViewModule('explorer')}>
          Open confirmation panel
        </button>
      </div>

      <div className="kpi-strip">
        <article className="kpi-card">
          <span className="kpi-label">Cases</span>
          <span className="kpi-value">{kpis.caseCount}</span>
          <span className="kpi-sublabel">Creator/project runs</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Median Throughput</span>
          <span className="kpi-value">{formatThroughput(kpis.medianThroughputMs)}</span>
          <span className="kpi-sublabel">End-to-end per case</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Exception Rate</span>
          <span className="kpi-value">{(kpis.exceptionRate * 100).toFixed(1)}%</span>
          <span className="kpi-sublabel">Failures and retries</span>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">Truth Confirmed</span>
          <span className="kpi-value">{healthPct}%</span>
          <span className="kpi-sublabel">{confirmedNodes} of {totalNodes} steps</span>
        </article>
      </div>

      <div className="two-col-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <h3>Top interventions</h3>
            <span className="badge">{recommendations.length}</span>
          </div>
          {topRecs.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <p>No interventions yet. Import process events to begin.</p>
            </div>
          ) : (
            <ul className="intervention-list">
              {topRecs.map(rec => (
                <li key={rec.nodeId}>
                  <div>
                    <strong>{rec.nodeId}</strong>
                    <span>{shortClass(rec.recommendationClass)}</span>
                  </div>
                  <small>{Math.round(rec.confidence * 100)}%</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Evidence health</h3>
            <button className="btn ghost" type="button" onClick={() => onViewModule('activity')}>
              Open log
            </button>
          </div>
          <dl className="evidence-health">
            <div><dt>Events</dt><dd>{events.length}</dd></div>
            <div><dt>Variants</dt><dd>{graph?.variants.length ?? 0}</dd></div>
            <div><dt>Active alerts</dt><dd>{activeAlerts.length}</dd></div>
          </dl>
          {activeAlerts.length > 0 && (
            <p className="microcopy">{activeAlerts[0]?.description}</p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn primary" type="button" onClick={onRunDemo}>
          Run demo activity
        </button>
        <button className="btn ghost" type="button" onClick={() => onViewModule('sources')}>
          Manage data
        </button>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
          {events.length} events · schema v1.0.0
        </span>
      </div>
    </div>
  );
}
