import { useState } from 'react';
import type { ProcessGraph, WorkEvent } from '../domain/types';

interface Props {
  graph?: ProcessGraph;
  events: WorkEvent[];
}

function formatDuration(ms: number): string {
  if (ms === 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function ProcessVariants({ graph, events }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const variants = graph?.variants ?? [];
  const nodes = graph?.nodes ?? [];

  // Build variant rows
  const rows = variants.map(v => {
    const path = v.activityIds
      .map(id => nodes.find(n => n.id === id)?.label ?? id)
      .join(' → ');

    // Find events for this variant
    const variantEvents = events.filter(e => v.caseIds.includes(e.caseId));
    const exceptions = variantEvents.filter(e =>
      ['failure', 'exception', 'retry', 'rollback'].includes(e.result.status)
    ).length;
    const exceptionPct = variantEvents.length ? ((exceptions / variantEvents.length) * 100).toFixed(1) : '0.0';
    const accepted = variantEvents.filter(e => e.acceptedOutcome).length;
    const acceptedPct = variantEvents.length ? ((accepted / variantEvents.length) * 100).toFixed(1) : '0.0';

    // Median duration
    const durations: number[] = [];
    for (const caseId of v.caseIds) {
      const caseEvents = events.filter(e => e.caseId === caseId);
      const times = caseEvents.map(e => Date.parse(e.timestamp)).filter(t => !isNaN(t)).sort((a, b) => a - b);
      if (times.length >= 2) durations.push(times[times.length - 1] - times[0]);
    }
    durations.sort((a, b) => a - b);
    const medianDuration = durations.length ? durations[Math.floor(durations.length / 2)] : 0;

    return { v, path, exceptionPct, acceptedPct, medianDuration };
  });

  if (rows.length === 0) {
    return (
      <div className="module-content">
        <div className="module-heading">
          <h2>Process Variants</h2>
        </div>
        <div className="empty-state">
          <p>No variants discovered. Import process events to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-content">
      <div className="module-heading">
        <h2>Process Variants</h2>
        <p>{rows.length} variant{rows.length !== 1 ? 's' : ''} discovered across {events.length} events.</p>
      </div>

      {/* Desktop table */}
      <div style={{ overflowX: 'auto', display: 'none' }} className="table-wrap-desktop">
        <table className="data-table">
          <thead>
            <tr>
              <th>Variant ID</th>
              <th>Cases</th>
              <th>Path</th>
              <th>Exceptions %</th>
              <th>Outcomes %</th>
              <th>Median Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ v, path, exceptionPct, acceptedPct, medianDuration }) => (
              <>
                <tr
                  key={v.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                >
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.id}</td>
                  <td>{v.caseIds.length}</td>
                  <td style={{ maxWidth: '400px', wordBreak: 'break-word', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{path}</td>
                  <td>
                    <span style={{ color: parseFloat(exceptionPct) > 10 ? 'var(--danger)' : 'var(--text)' }}>
                      {exceptionPct}%
                    </span>
                  </td>
                  <td>{acceptedPct}%</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{formatDuration(medianDuration)}</td>
                </tr>
                {expandedId === v.id && (
                  <tr key={`${v.id}-expanded`}>
                    <td colSpan={6} style={{ background: 'var(--surface-2)', padding: '0.75rem 1rem' }}>
                      <strong style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Case IDs:</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                        {v.caseIds.map(cid => (
                          <span
                            key={cid}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--info)', background: 'var(--surface)', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                          >
                            {cid}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards layout */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {rows.map(({ v, path, exceptionPct, medianDuration }) => (
          <div key={v.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>{v.id}</span>
                <p style={{ margin: '0.3rem 0', fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>{path}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: '0.9rem' }}>{v.caseIds.length}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>cases</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', color: parseFloat(exceptionPct) > 10 ? 'var(--danger)' : 'var(--text)', fontSize: '0.9rem' }}>{exceptionPct}%</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>exceptions</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: '0.9rem' }}>{formatDuration(medianDuration)}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>median</div>
                </div>
              </div>
            </div>
            {expandedId === v.id && (
              <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <strong style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Case IDs:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                  {v.caseIds.map(cid => (
                    <span
                      key={cid}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--info)', background: 'var(--surface-2)', padding: '0.1rem 0.35rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                    >
                      {cid}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
