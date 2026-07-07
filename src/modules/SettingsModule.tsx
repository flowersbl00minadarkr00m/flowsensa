import { useState } from 'react';
import { ExportView } from '../components/ExportView';
import { RegistryView } from '../components/RegistryView';
import { createLLMProfile, DEFAULT_LLM_PROFILE } from '../domain/llmProfiles';
import { sendAnalystQuery } from '../lib/openrouterClient';
import type { LLMProfile, PrimitiveRegistry } from '../domain/types';

interface PreviewProps {
  preview: string;
  previewType: 'JSON' | 'Markdown' | 'Mermaid';
  roundTripValid: boolean;
  onPreview: (type: 'JSON' | 'Markdown' | 'Mermaid') => void;
  onDownload: (type: 'JSON' | 'Markdown' | 'Mermaid') => void;
}

interface Props {
  llmProfile: LLMProfile | null;
  onLLMProfileChange: (profile: LLMProfile | null) => void;
  registry?: PrimitiveRegistry;
  previewProps: PreviewProps;
}

const TEMPLATE_JSON = `Browser request:
POST /api/llm-proxy
Content-Type: application/json

{
  "baseUrl": "<profile base URL>",
  "apiKey": "<session key>",
  "model": "<profile model>",
  "messages": [
    { "role": "system", "content": "You are an advisory process intelligence assistant." },
    { "role": "user", "content": "<bounded process context + prompt>" }
  ],
  "maxTokens": 800
}

Server-side provider request:
POST {baseUrl}/chat/completions
Authorization: Bearer {apiKey}`;

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODEL = 'openai/gpt-4.1';

const SUGGESTED_MODELS = [
  { label: 'OpenAI GPT-4.1', value: 'openai/gpt-4.1' },
  { label: 'OpenAI GPT-4.1 mini', value: 'openai/gpt-4.1-mini' },
  { label: 'OpenAI o4-mini', value: 'openai/o4-mini' },
  { label: 'Anthropic Claude Sonnet 4', value: 'anthropic/claude-sonnet-4' },
  { label: 'Anthropic Claude 3.7 Sonnet', value: 'anthropic/claude-3.7-sonnet' },
  { label: 'Google Gemini 2.5 Pro', value: 'google/gemini-2.5-pro' },
  { label: 'Google Gemini 2.5 Flash', value: 'google/gemini-2.5-flash' },
  { label: 'Meta Llama 3.3 70B Instruct', value: 'meta-llama/llama-3.3-70b-instruct' },
  { label: 'Mistral Large', value: 'mistralai/mistral-large' },
  { label: 'DeepSeek Chat', value: 'deepseek/deepseek-chat' },
  { label: 'Qwen 2.5 72B Instruct', value: 'qwen/qwen-2.5-72b-instruct' },
  { label: 'Perplexity Sonar Pro', value: 'perplexity/sonar-pro' },
];

export function SettingsModule({
  llmProfile,
  onLLMProfileChange,
  registry,
  previewProps,
}: Props) {
  const [tab, setTab] = useState<'llm' | 'registry' | 'export' | 'workspace'>('llm');
  const [nameInput, setNameInput] = useState(llmProfile?.name ?? DEFAULT_LLM_PROFILE.name);
  const [keyInput, setKeyInput] = useState(llmProfile?.key ?? '');
  const [baseUrlInput, setBaseUrlInput] = useState(llmProfile?.baseUrl ?? DEFAULT_LLM_PROFILE.baseUrl);
  const [modelInput, setModelInput] = useState(llmProfile?.model ?? DEFAULT_LLM_PROFILE.model);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const selectedSuggestedModel = SUGGESTED_MODELS.some((model) => model.value === modelInput) ? modelInput : '';

  const canSave = nameInput.trim() && keyInput.trim() && baseUrlInput.trim() && modelInput.trim();

  function buildProfile(): LLMProfile {
    return createLLMProfile({
      name: nameInput,
      key: keyInput,
      baseUrl: baseUrlInput,
      model: modelInput,
    });
  }

  async function handleTest() {
    if (!canSave) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await sendAnalystQuery(buildProfile(), 'Reply with exactly: Connection verified.');
      setTestResult(`Connected: ${result}`);
    } catch (err) {
      setTestResult(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTestLoading(false);
    }
  }

  function useOpenRouterPreset() {
    setNameInput('My LLM profile');
    setBaseUrlInput(OPENROUTER_BASE_URL);
    setModelInput(OPENROUTER_MODEL);
    setTestResult(null);
  }

  return (
    <div className="module-content settings-shell">
      <div className="tab-bar">
        {(['llm', 'registry', 'export', 'workspace'] as const).map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} type="button" onClick={() => setTab(t)}>
            {t === 'llm' ? 'LLM Profiles' : t === 'registry' ? 'Registry' : t === 'export' ? 'Export' : 'Workspace'}
          </button>
        ))}
      </div>

      <div className="settings-body">
        {tab === 'llm' && (
          <div className="settings-panel">
            <div className="module-heading">
              <h2>LLM Profiles</h2>
              <p>Name the key you want to use for optional AI Insights or image-assisted import. Keys stay in browser memory for this session.</p>
            </div>

            {llmProfile ? (
              <span className="status-chip connected">Connected - {llmProfile.name} / {llmProfile.model}</span>
            ) : (
              <span className="status-chip">Not configured</span>
            )}

            <div className="form-grid">
              <label>
                Profile name
                <input value={nameInput} onChange={(event) => setNameInput(event.target.value)} placeholder="OpenAI GPT-4.1, local gateway, OSS model..." />
              </label>
              <label>
                Base URL
                <input value={baseUrlInput} onChange={(event) => setBaseUrlInput(event.target.value)} placeholder="https://api.openai.com/v1" />
              </label>
              <label>
                Model or deployment
                <input value={modelInput} onChange={(event) => setModelInput(event.target.value)} placeholder="gpt-4.1, llama-3.1, provider/model..." />
              </label>
              <label>
                Suggested model
                <select
                  value={selectedSuggestedModel}
                  onChange={(event) => {
                    if (event.target.value) setModelInput(event.target.value);
                  }}
                >
                  <option value="">Custom model or deployment</option>
                  {SUGGESTED_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>{model.label}</option>
                  ))}
                </select>
              </label>
              <label>
                API key
                <div className="key-row">
                  <input type={showKey ? 'text' : 'password'} value={keyInput} onChange={(event) => setKeyInput(event.target.value)} placeholder="Paste session key" />
                  <button className="btn" type="button" onClick={() => setShowKey((value) => !value)}>{showKey ? 'Hide' : 'Show'}</button>
                </div>
              </label>
            </div>

            <div className="button-row">
              <button className="btn ghost" type="button" onClick={useOpenRouterPreset}>
                Use OpenRouter preset
              </button>
              <span className="fine-print">
                OpenRouter needs base URL {OPENROUTER_BASE_URL} and a model id like {OPENROUTER_MODEL}; "OpenRouter" by itself is not a model.
              </span>
            </div>

            <div className="button-row">
              <button className="btn primary" type="button" disabled={!canSave} onClick={() => onLLMProfileChange(buildProfile())}>
                Save and connect
              </button>
              <button className="btn" type="button" disabled={!canSave || testLoading} onClick={() => void handleTest()}>
                {testLoading ? 'Testing...' : 'Test connection'}
              </button>
              {llmProfile && (
                <button className="btn danger ghost" type="button" onClick={() => { onLLMProfileChange(null); setKeyInput(''); }}>
                  Disconnect
                </button>
              )}
            </div>

            {testResult && <div className={testResult.startsWith('Connected') ? 'form-success' : 'form-error'}>{testResult}</div>}

            <details className="request-disclosure">
              <summary>What gets sent to the selected LLM profile?</summary>
              <pre>{TEMPLATE_JSON}</pre>
              <p>Your key is sent only for explicit model actions. It passes through the FlowSensa Vercel function and is forwarded to your selected provider; it is not written to source, IndexedDB, local storage, exports, or app logs.</p>
            </details>
          </div>
        )}

        {tab === 'registry' && (
          registry ? <RegistryView registry={registry} /> : <div className="empty-state"><p>No registry loaded. Import a workspace first.</p></div>
        )}

        {tab === 'export' && (
          <ExportView
            preview={previewProps.preview}
            previewType={previewProps.previewType}
            roundTripValid={previewProps.roundTripValid}
            onPreview={previewProps.onPreview}
            onDownload={previewProps.onDownload}
          />
        )}

        {tab === 'workspace' && (
          <div className="settings-panel">
            <div className="module-heading">
              <h2>Workspace</h2>
              <p>Workspace data is local to this browser profile.</p>
            </div>
            <div className="card">
              <h3>Local storage</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Process events, confirmations, and exports are stored locally. LLM keys are not persisted by default.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
