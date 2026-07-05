import type { ActivityLogEntry, WorkEventCollection } from '../domain/types';

interface Props {
  events?: WorkEventCollection;
  activityLog: ActivityLogEntry[];
  demoCounter: number;
  onRunDemo: () => void;
  onResetDemo: () => void;
  onImport: (file: File) => void;
}

const DEMO_ACTIVITIES = [
  'Draft LinkedIn post',
  'Commit code change',
  'Review and approve',
  'Publish post',
];

export function DataSources({
  events,
  activityLog,
  demoCounter,
  onRunDemo,
  onResetDemo,
  onImport,
}: Props) {
  const nextActivity = DEMO_ACTIVITIES[demoCounter % 4];
  const demoEventCount = activityLog.filter(e => e.isDemo).length;

  return (
    <div className="module-content">
      <div className="module-heading">
        <h2>Data Sources</h2>
        <p>Manage incoming process event streams and workspace imports.</p>
      </div>

      {/* Demo Source Card */}
      <div className="source-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span className="badge demo-badge">DEMO</span>
              <h3 style={{ margin: 0 }}>Northstar Showcase (Demo)</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
              Fictional 4-step LinkedIn → code → review → publish workflow. No real data.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button className="btn primary" type="button" onClick={onRunDemo}>
              Run demo activity
            </button>
            <button className="btn danger ghost" type="button" onClick={onResetDemo}>
              Reset demo state
            </button>
          </div>
        </div>

        {/* Activity cycle display */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.72rem', margin: '0 0 0.5rem' }}>
            Activity cycle ({demoCounter % 4 + 1}/4 — next: <strong style={{ color: 'var(--accent)' }}>{nextActivity}</strong>)
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {DEMO_ACTIVITIES.map((act, i) => (
              <span
                key={act}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.72rem',
                  background: i === demoCounter % 4 ? 'var(--accent-dim)' : 'var(--surface-2)',
                  border: `1px solid ${i === demoCounter % 4 ? 'rgba(245,200,66,0.3)' : 'var(--border)'}`,
                  color: i === demoCounter % 4 ? 'var(--accent)' : 'var(--text-muted)',
                  fontWeight: i === demoCounter % 4 ? 600 : 400,
                }}
              >
                {i + 1}. {act}
              </span>
            ))}
          </div>
        </div>

        {/* Demo stats */}
        <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span>Demo events emitted: <strong style={{ color: 'var(--text)' }}>{demoCounter}</strong></span>
          <span>In activity log: <strong style={{ color: 'var(--text)' }}>{demoEventCount}</strong></span>
        </div>
      </div>

      {/* Manual Import Card */}
      <div className="source-card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: '0 0 0.4rem' }}>Manual Import</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
              Import a Flowsensa-compatible JSON event collection from file.
            </p>
          </div>
          <label style={{ flexShrink: 0 }}>
            <input
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = '';
              }}
            />
            <span className="btn" style={{ cursor: 'pointer' }}>
              Choose file
            </span>
          </label>
        </div>
      </div>

      {/* Workspace Stats */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-header">
          <h3>Current Workspace</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '1rem' }}>
          {[
            { label: 'Total Events', value: String(events?.events.length ?? 0) },
            { label: 'Activity Log Entries', value: String(activityLog.length) },
            { label: 'Schema Version', value: events?.schemaVersion ?? '—' },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem', marginBottom: '0.2rem' }}>{stat.label}</div>
              <div style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>{stat.value}</div>
            </div>
          ))}
        </div>
        {events?.exportedAt && (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.68rem', margin: '0.75rem 0 0' }}>
            Last imported: {new Date(events.exportedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
