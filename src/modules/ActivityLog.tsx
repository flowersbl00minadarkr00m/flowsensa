import { useState } from 'react';
import type { ActivityLogEntry } from '../domain/types';

export interface EvidenceFilter {
  eventIds: string[];
  label: string;
}

interface Props {
  activityLog: ActivityLogEntry[];
  onOpenEvent: (id: string) => void;
  /** Spec 006 R5: active drill-through filter set by evidence links elsewhere. */
  evidenceFilter?: EvidenceFilter | null;
  onClearEvidenceFilter?: () => void;
}

export function ActivityLog({ activityLog, onOpenEvent, evidenceFilter, onClearEvidenceFilter }: Props) {
  const [actorFilter, setActorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paused, setPaused] = useState(false);

  const evidenceIds = evidenceFilter ? new Set(evidenceFilter.eventIds) : null;

  const filtered = activityLog.filter(row => {
    if (evidenceIds && !evidenceIds.has(row.eventId)) return false;
    if (actorFilter && row.actorType !== actorFilter) return false;
    if (statusFilter && row.resultStatus !== statusFilter) return false;
    return true;
  });

  const displayed = paused ? filtered : filtered;

  const actorTypes = [...new Set(activityLog.map(e => e.actorType))].sort();
  const statusTypes = [...new Set(activityLog.map(e => e.resultStatus))].sort();

  return (
    <div className="module-content">
      <div className="module-heading">
        <h2>Activity Log</h2>
        <p>{activityLog.length} entries · {filtered.length} shown</p>
      </div>

      {evidenceFilter && (
        <div className="evidence-filter-banner" role="status">
          <span>
            Showing <strong>{filtered.length}</strong> evidence record{filtered.length === 1 ? '' : 's'} for:{' '}
            <strong>{evidenceFilter.label}</strong>
          </span>
          <button className="btn ghost" type="button" onClick={onClearEvidenceFilter}>
            Clear filter
          </button>
        </div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        <label>
          Actor type
          <select value={actorFilter} onChange={e => setActorFilter(e.target.value)}>
            <option value="">All</option>
            {actorTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Result status
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {statusTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <button
          className="btn"
          type="button"
          onClick={() => setPaused(p => !p)}
          style={{ marginLeft: 'auto', fontSize: '0.75rem' }}
        >
          {paused ? '▶ Resume scroll' : '⏸ Pause scroll'}
        </button>
      </div>

      {/* Table */}
      {displayed.length === 0 ? (
        <div className="empty-state">
          <p>
            {evidenceFilter
              ? 'None of the linked evidence records are in the current log. Clear the filter to see all entries.'
              : 'No activity log entries yet. Import events or run a demo activity.'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event ID</th>
                <th>Case ID</th>
                <th>Actor</th>
                <th>System / model</th>
                <th>Duration</th>
                <th>Resources</th>
                <th>Activity</th>
                <th>Result</th>
                <th>Truth</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(row => (
                <tr
                  key={row.eventId}
                  className={`activity-log-row${row.isDemo ? ' is-demo' : ''}${evidenceIds?.has(row.eventId) ? ' evidence-hit' : ''}`}
                >
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    {new Date(row.ingestedAt).toLocaleTimeString()}
                  </td>
                  <td>
                    <button
                      className="btn ghost"
                      style={{ padding: 0, fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--info)' }}
                      type="button"
                      onClick={() => onOpenEvent(row.eventId)}
                    >
                      {row.eventId.slice(0, 14)}…
                    </button>
                    {row.isDemo && (
                      <span className="badge demo-badge" style={{ marginLeft: '0.35rem' }}>DEMO</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {row.caseId}
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{row.actorLabel || row.actorId}</strong>
                    <small style={{ display: 'block', color: 'var(--text-dim)' }}>{row.actorType} · {row.actorId}</small>
                  </td>
                  <td style={{ maxWidth: '180px', wordBreak: 'break-word' }}>
                    {row.systemModel || row.systemTool || row.systemLabel ? (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{row.systemModel ?? row.systemTool ?? row.systemLabel}</span>
                        <small style={{ display: 'block', color: 'var(--text-dim)' }}>{[row.systemTool, row.systemLabel].filter(Boolean).join(' · ')}</small>
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-dim)' }}>-</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {row.durationMs !== undefined ? `${Math.round(row.durationMs / 1000)}s` : '-'}
                  </td>
                  <td style={{ maxWidth: '220px', wordBreak: 'break-word', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    {row.resourceSummary ?? '-'}
                  </td>
                  <td style={{ maxWidth: '200px', wordBreak: 'break-word' }}>{row.activityLabel}</td>
                  <td>
                    <span style={{
                      color: row.resultStatus === 'success' ? 'var(--success)' :
                        ['failure', 'exception'].includes(row.resultStatus) ? 'var(--danger)' :
                          'var(--warning)',
                      fontSize: '0.78rem',
                    }}>
                      {row.resultStatus}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{row.truthState}</td>
                  <td style={{ fontSize: '0.68rem', color: 'var(--text-dim)', maxWidth: '180px', wordBreak: 'break-all' }}>
                    {row.sourceRef}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
