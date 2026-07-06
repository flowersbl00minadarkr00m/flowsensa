import { useState } from 'react';
import { ExportView } from '../components/ExportView';
import { RegistryView } from '../components/RegistryView';
import { sendAnalystQuery } from '../lib/openrouterClient';
import type { OpenRouterConfig, PrimitiveRegistry } from '../domain/types';

interface PreviewProps {
  preview: string;
  previewType: 'JSON' | 'Markdown' | 'Mermaid';
  roundTripValid: boolean;
  onPreview: (type: 'JSON' | 'Markdown' | 'Mermaid') => void;
  onDownload: (type: 'JSON' | 'Markdown' | 'Mermaid') => void;
}

interface Props {
  openRouterConfig: OpenRouterConfig | null;
  onOpenRouterChange: (c: OpenRouterConfig | null) => void;
  registry?: PrimitiveRegistry;
  previewProps: PreviewProps;
}

const MODEL_OPTIONS = [
  'openai/gpt-5.5',
  'openai/gpt-4o',
  'anthropic/claude-3.5-sonnet',
  'mistralai/mistral-7b-instruct',
];

const TEMPLATE_JSON = `{
  "model": "<selected model>",
  "messages": [
    {
      "role": "system",
      "content": "You are an advisory process analyst. All output is advisory only."
    },
    {
      "role": "user",
      "content": "<process context + user question>"
    }
  ],
  "max_tokens": 800
}`;

export function SettingsModule({
  openRouterConfig,
  onOpenRouterChange,
  registry,
  previewProps,
}: Props) {
  const [tab, setTab] = useState<'openrouter' | 'registry' | 'export' | 'workspace'>('openrouter');
  const [keyInput, setKeyInput] = useState(openRouterConfig?.key ?? '');
  const [modelInput, setModelInput] = useState(openRouterConfig?.model ?? 'openai/gpt-5.5');
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  async function handleTest() {
    if (!keyInput.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await sendAnalystQuery(
        { key: keyInput, model: modelInput },
        'Reply with exactly: "Connection verified."',
      );
      setTestResult(`✓ ${result}`);
    } catch (err) {
      setTestResult(`✗ ${err instanceof Error ? err.message : 'Connection failed'}`);
    } finally {
      setTestLoading(false);
    }
  }

  return (
    <div className="module-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="tab-bar">
        {(['openrouter', 'registry', 'export', 'workspace'] as const).map(t => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            type="button"
            onClick={() => setTab(t)}
          >
            {t === 'openrouter' ? 'OpenRouter' : t === 'registry' ? 'Registry' : t === 'export' ? 'Export' : 'Workspace'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '1.5rem', overflow: 'auto', background: 'var(--bg)' }}>
        {/* OpenRouter Tab */}
        {tab === 'openrouter' && (
          <div style={{ maxWidth: '540px' }}>
            <div className="module-heading">
              <h2>OpenRouter</h2>
              <p>Connect an optional AI model for process chat. Keys are never persisted to storage.</p>
            </div>

            {/* Status */}
            <div style={{ marginBottom: '1.25rem' }}>
              {openRouterConfig ? (
                <span className="status-chip connected">
                  Connected · {openRouterConfig.model}
                </span>
              ) : (
                <span className="status-chip">Not configured</span>
              )}
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <label style={{ display: 'grid', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                API Key
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    placeholder="sk-or-..."
                    style={{
                      flex: 1,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      borderRadius: 'var(--radius)',
                      padding: '0.6rem 0.75rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.82rem',
                    }}
                  />
                  <button
                    className="btn"
                    type="button"
                    style={{ flexShrink: 0 }}
                    onClick={() => setShowKey(v => !v)}
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <label style={{ display: 'grid', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Model
                <input
                  type="text"
                  list="model-options"
                  value={modelInput}
                  onChange={e => setModelInput(e.target.value)}
                  placeholder="openai/gpt-5.5 or any OpenRouter model"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    borderRadius: 'var(--radius)',
                    padding: '0.6rem 0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                  }}
                />
                <datalist id="model-options">
                  {MODEL_OPTIONS.map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </label>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn primary"
                  type="button"
                  disabled={!keyInput.trim()}
                  onClick={() => onOpenRouterChange({ key: keyInput, model: modelInput })}
                >
                  Save &amp; Connect
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={!keyInput.trim() || testLoading}
                  onClick={() => void handleTest()}
                >
                  {testLoading ? 'Testing…' : 'Test connection'}
                </button>
                {openRouterConfig && (
                  <button
                    className="btn danger ghost"
                    type="button"
                    onClick={() => {
                      onOpenRouterChange(null);
                      setKeyInput('');
                    }}
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {testResult && (
                <div style={{
                  padding: '0.65rem',
                  borderRadius: 'var(--radius)',
                  background: testResult.startsWith('✓') ? 'rgba(45,212,160,0.1)' : 'rgba(239,82,96,0.1)',
                  border: `1px solid ${testResult.startsWith('✓') ? 'rgba(45,212,160,0.3)' : 'rgba(239,82,96,0.3)'}`,
                  color: testResult.startsWith('✓') ? 'var(--success)' : 'var(--danger)',
                  fontSize: '0.8rem',
                }}>
                  {testResult}
                </div>
              )}

              {/* What gets sent collapsible */}
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.82rem', userSelect: 'none' }}>
                  What gets sent to OpenRouter?
                </summary>
                <pre style={{
                  marginTop: '0.75rem',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '0.75rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {TEMPLATE_JSON}
                </pre>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.72rem', margin: '0.4rem 0 0' }}>
                  Your API key is sent only in the Authorization header and is never stored locally.
                </p>
              </details>
            </div>
          </div>
        )}

        {/* Registry Tab */}
        {tab === 'registry' && (
          registry
            ? <RegistryView registry={registry} />
            : <div className="empty-state"><p>No registry loaded. Import a workspace first.</p></div>
        )}

        {/* Export Tab */}
        {tab === 'export' && (
          <ExportView
            preview={previewProps.preview}
            previewType={previewProps.previewType}
            roundTripValid={previewProps.roundTripValid}
            onPreview={previewProps.onPreview}
            onDownload={previewProps.onDownload}
          />
        )}

        {/* Workspace Tab */}
        {tab === 'workspace' && (
          <div style={{ maxWidth: '480px' }}>
            <div className="module-heading">
              <h2>Workspace</h2>
              <p>Manage your local IndexedDB workspace.</p>
            </div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--text)', margin: '0 0 0.6rem', fontSize: '0.95rem' }}>Danger Zone</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
                Deleting local data is irreversible. Export your work first.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem', alignSelf: 'center' }}>
                  Use "Delete local data" in the sidebar to clear workspace.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
