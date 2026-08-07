import { useMemo, useState } from 'react';
import type { KPISnapshot, ProcessGraph, WorkEvent } from '../domain/types';
import { pluralize } from '../lib/plural';
import { StatCard, StatGrid } from '../components/StatCard';

interface Props {
  graph?: ProcessGraph;
  events: WorkEvent[];
  kpis: KPISnapshot;
}

type Period = 'all' | '30d' | '7d';

function formatDuration(ms: number): string {
  if (ms === 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// Spec 010 FR-008: the four hardcoded sparkline paths that used to live here
// were decorative — every card got the same invented shape regardless of its
// data, so a 0% Automation Coverage metric rendered next to a rising trend
// line. There is no per-KPI time series in the model, so the sparklines are
// omitted rather than faked. Reinstate them only with a real series and an
// explicit window label (e.g. "last 30d") via <StatCard spark=…>.

export function PerformanceAnalysis({ graph, events, kpis }: Props) {
  const [period, setPeriod] = useState<Period>('all');

  const filteredEvents = useMemo(() => {
    if (period === 'all') return events;
    const cutoff = Date.now() - (period === '30d' ? 30 : 7) * 24 * 60 * 60 * 1000;
    return events.filter(e => Date.parse(e.timestamp) >= cutoff);
  }, [events, period]);

  const bottlenecks = useMemo(() => {
    if (!graph) return [];
    return [...graph.nodes]
      .filter(n => n.totalDurationMs > 0)
      .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
      .slice(0, 5);
  }, [graph]);

  const kpiCards = [
    {
      key: 'cases',
      label: 'Cases Observed',
      value: String(kpis.caseCount),
      sub: 'Unique case IDs',
    },
    {
      key: 'throughput',
      label: 'Median Throughput',
      value: formatDuration(kpis.medianThroughputMs),
      sub: 'End-to-end per case',
    },
    {
      key: 'exception',
      label: 'Exception Rate',
      value: `${(kpis.exceptionRate * 100).toFixed(1)}%`,
      sub: 'Failures / retries',
    },
    {
      key: 'automation',
      label: 'Automation Coverage',
      value: `${(kpis.automationCoverageRate * 100).toFixed(0)}%`,
      sub: 'Confirmed nodes',
    },
  ];

  return (
    <div className="module-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="module-heading" style={{ marginBottom: 0 }}>
          <h2>Performance Analysis</h2>
          <p>
            {pluralize(filteredEvents.length, 'event')} in view · period: {period === 'all' ? 'All time' : period === '30d' ? 'Last 30 days' : 'Last 7 days'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {(['all', '30d', '7d'] as Period[]).map(p => (
            <button
              key={p}
              className={`btn${period === p ? ' primary' : ''}`}
              type="button"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
              onClick={() => setPeriod(p)}
            >
              {p === 'all' ? 'All' : p === '30d' ? 'Last 30 days' : 'Last 7 days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <StatGrid>
        {kpiCards.map(card => (
          <StatCard key={card.key} label={card.label} value={card.value} sublabel={card.sub} />
        ))}
      </StatGrid>

      {/* Bottleneck Table */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h3>Bottlenecks by Duration</h3>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>Top 5 nodes by total duration</span>
        </div>
        {bottlenecks.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p>No duration data available.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Node Label</th>
                  <th>Frequency</th>
                  <th>Total Duration</th>
                  <th>Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {bottlenecks.map((node, i) => (
                  <tr key={node.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', minWidth: '1.2rem' }}>
                          {i + 1}
                        </span>
                        <span>{node.label}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{node.frequency}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>
                      {formatDuration(node.totalDurationMs)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {formatDuration(node.frequency > 0 ? Math.round(node.totalDurationMs / node.frequency) : 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
