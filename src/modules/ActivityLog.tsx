import { useState } from 'react';
import type { ActivityLogEntry } from '../domain/types';
import { plural, pluralize } from '../lib/plural';

/**
 * Spec 010 FR-003: the log was 11 columns wide at 1440px, so every cell
 * wrapped to three lines. Related fields are now paired into six columns and
 * the repeated day stamp only prints when the day actually changes.
 */
function truncateSource(sourceRef: string): string {
  const trimmed = sourceRef.replace(/[/\\]+$/, '');
  const segments = trimmed.split(/[/\\]/);
  return segments[segments.length - 1] || sourceRef;
}

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
        <h2>Evidence Log</h2>
        <p>{pluralize(activityLog.length, 'entry', 'entries')} · {filtered.length} shown</p>
      </div>

      {evidenceFilter && (
        <div className="evidence-filter-banner" role="status">
          <span>
            Showing <strong>{filtered.length}</strong> evidence {plural(filtered.length, 'record')} for:{' '}
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
                <th>Time</th>
                <th>Event / case</th>
                <th>Actor</th>
                <th>Activity</th>
                <th>Result</th>
                <th>Resources / source</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((row, index) => {
                const ingested = new Date(row.ingestedAt);
                const day = ingested.toLocaleDateString();
                const previous = index > 0 ? displayed[index - 1] : null;
                const isNewDay = !previous || new Date(previous.ingestedAt).toLocaleDateString() !== day;
                const system = row.systemModel ?? row.systemTool ?? row.systemLabel;
                const systemDetail = [row.systemTool, row.systemLabel].filter(Boolean).join(' · ');

                return (
                <tr
                  key={row.eventId}
                  className={`activity-log-row${row.isDemo ? ' is-demo' : ''}${evidenceIds?.has(row.eventId) ? ' evidence-hit' : ''}`}
                >
                  <td className="log-cell-time">
                    {isNewDay && <small className="log-day">{day}</small>}
                    <span>{ingested.toLocaleTimeString()}</span>
                  </td>
                  <td className="log-cell-id">
                    <button
                      className="btn ghost log-event-link"
                      type="button"
                      title={row.eventId}
                      onClick={() => onOpenEvent(row.eventId)}
                    >
                      {row.eventId.slice(0, 14)}…
                    </button>
                    {row.isDemo && (
                      <span className="badge demo-badge" style={{ marginLeft: '0.35rem' }}>DEMO</span>
                    )}
                    <small className="log-sub" title={row.caseId}>{row.caseId}</small>
                  </td>
                  <td className="log-cell-actor">
                    <strong>{row.actorLabel || row.actorId}</strong>
                    <small className="log-sub">{row.actorType} · {row.actorId}</small>
                  </td>
                  <td className="log-cell-activity">
                    <span>{row.activityLabel}</span>
                    {system && <small className="log-sub">{system}{systemDetail ? ` · ${systemDetail}` : ''}</small>}
                  </td>
                  <td className="log-cell-result">
                    <span
                      className={`log-truth-dot truth-${row.truthState}`}
                      title={`Truth state: ${row.truthState}`}
                      aria-label={`Truth state: ${row.truthState}`}
                    />
                    <span style={{
                      color: row.resultStatus === 'success' ? 'var(--success)' :
                        ['failure', 'exception'].includes(row.resultStatus) ? 'var(--danger)' :
                          'var(--warning)',
                    }}>
                      {row.resultStatus}
                    </span>
                    <small className="log-sub">
                      {row.durationMs !== undefined ? `${Math.round(row.durationMs / 1000)}s` : '—'}
                    </small>
                  </td>
                  <td className="log-cell-resources">
                    <span title={row.resourceSummary}>{row.resourceSummary ?? '—'}</span>
                    <small className="log-sub" title={row.sourceRef}>{truncateSource(row.sourceRef)}</small>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
