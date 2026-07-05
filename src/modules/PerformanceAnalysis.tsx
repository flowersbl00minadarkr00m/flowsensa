import { useMemo, useState } from 'react';
import type { KPISnapshot, ProcessGraph, WorkEvent } from '../domain/types';

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

// Simple representative sparkline path (hardcoded shape for visual polish)
const SPARKLINE_PATHS: Record<string, string> = {
  cases: 'M0,30 L10,25 L20,20 L30,22 L40,15 L50,18 L60,10 L70,12 L80,8',
  throughput: 'M0,25 L10,28 L20,22 L30,24 L40,18 L50,20 L60,15 L70,14 L80,16',
  exception: 'M0,10 L10,14 L20,12 L30,20 L40,18 L50,22 L60,25 L70,24 L80,28',
  automation: 'M0,30 L10,28 L20,24 L30,20 L40,18 L50,14 L60,12 L70,10 L80,8',
};

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
      sparkKey: 'cases',
    },
    {
      key: 'throughput',
      label: 'Median Throughput',
      value: formatDuration(kpis.medianThroughputMs),
      sub: 'End-to-end per case',
      sparkKey: 'throughput',
    },
    {
      key: 'exception',
      label: 'Exception Rate',
      value: `${(kpis.exceptionRate * 100).toFixed(1)}%`,
      sub: 'Failures / retries',
      sparkKey: 'exception',
    },
    {
      key: 'automation',
      label: 'Automation Coverage',
      value: `${(kpis.automationCoverageRate * 100).toFixed(0)}%`,
      sub: 'Confirmed nodes',
      sparkKey: 'automation',
    },
  ];

  return (
    <div className="module-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="module-heading" style={{ marginBottom: 0 }}>
          <h2>Performance Analysis</h2>
          <p>
            {filteredEvents.length} events in view · period: {period === 'all' ? 'All time' : period === '30d' ? 'Last 30 days' : 'Last 7 days'}
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
      <div className="kpi-strip" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
        {kpiCards.map(card => (
          <div key={card.key} className="kpi-card" style={{ position: 'relative', overflow: 'hidden', minHeight: '120px' }}>
            <span className="kpi-label">{card.label}</span>
            <span className="kpi-value" style={{ fontSize: '1.8rem' }}>{card.value}</span>
            <span className="kpi-sublabel">{card.sub}</span>
            <svg
              style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', opacity: 0.3 }}
              width="80"
              height="36"
              viewBox="0 0 80 36"
            >
              <path d={SPARKLINE_PATHS[card.sparkKey]} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </div>
        ))}
      </div>

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
