import { useState } from 'react';
import { DEFAULT_ALERT_RULES } from '../lib/alertEngine';
import type { Alert } from '../domain/types';

interface Props {
  alerts: Alert[];
  onUpdate: (id: string, status: Alert['status']) => void;
}

export function AlertsModule({ alerts, onUpdate }: Props) {
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const active = alerts.filter(a => a.status === 'active');
  const history = alerts.filter(a => a.status !== 'active');
  const displayed = tab === 'active' ? active : history;

  function formatVal(v: number): string {
    if (v <= 1 && v >= 0) return `${(v * 100).toFixed(1)}%`;
    return String(v);
  }

  return (
    <div className="module-content">
      <div className="module-heading">
        <h2>Alerts</h2>
        <p>{active.length} active · {history.length} in history</p>
      </div>

      <div className="tab-bar" style={{ padding: 0, marginBottom: '1rem', background: 'transparent', borderBottom: '1px solid var(--border)' }}>
        <button
          className={`tab-btn${tab === 'active' ? ' active' : ''}`}
          type="button"
          onClick={() => setTab('active')}
        >
          Active ({active.length})
        </button>
        <button
          className={`tab-btn${tab === 'history' ? ' active' : ''}`}
          type="button"
          onClick={() => setTab('history')}
        >
          History ({history.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="empty-state">
          <p>
            {tab === 'active' ? 'No active alerts. All thresholds are within acceptable ranges.' : 'No alert history yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {displayed.map(alert => (
            <div key={alert.id} className={`alert-item ${alert.severity}`}>
              <div style={{ flexShrink: 0 }}>
                <span className={`alert-chip ${alert.severity}`}>{alert.severity}</span>
              </div>
              <div className="alert-item-body">
                <strong style={{ color: 'var(--text)' }}>{alert.description}</strong>
                <p>
                  Value: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{formatVal(alert.triggeredValue)}</strong>
                  {' '}· Threshold: <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatVal(alert.threshold)}</strong>
                  {' '}· <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    {new Date(alert.triggeredAt).toLocaleString()}
                  </span>
                </p>
                <p>
                  Status: <span style={{
                    color: alert.status === 'active' ? 'var(--danger)' :
                      alert.status === 'acknowledged' ? 'var(--warning)' :
                        alert.status === 'muted' ? 'var(--text-dim)' : 'var(--success)',
                    fontWeight: 600,
                  }}>{alert.status}</span>
                </p>
              </div>
              {tab === 'active' && (
                <div className="alert-actions">
                  <button
                    className="btn"
                    type="button"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                    onClick={() => onUpdate(alert.id, 'acknowledged')}
                  >
                    Acknowledge
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                    onClick={() => onUpdate(alert.id, 'muted')}
                  >
                    Mute
                  </button>
                  <button
                    className="btn danger"
                    type="button"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                    onClick={() => onUpdate(alert.id, 'resolved')}
                  >
                    Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rule Config */}
      <div className="card">
        <div className="card-header">
          <h3>Alert Rules</h3>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>Default rules (read-only MVP)</span>
        </div>
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {DEFAULT_ALERT_RULES.map(rule => (
            <div
              key={rule.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem',
                background: 'var(--surface-2)',
                borderRadius: 'var(--radius)',
                fontSize: '0.82rem',
              }}
            >
              <span className={`severity-chip ${rule.severity}`}>{rule.severity}</span>
              <span style={{ color: 'var(--text)', flex: 1 }}>{rule.description}</span>
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                {rule.metric} &gt; {(rule.threshold * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
