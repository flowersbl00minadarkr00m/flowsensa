import { useState } from 'react';
import { AnalystView } from '../components/AnalystView';
import { sendAnalystQuery } from '../lib/openrouterClient';
import type { AnalystAnswer, Gap, KPISnapshot, OpenRouterConfig, ProcessGraph, Recommendation, WorkEvent } from '../domain/types';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  isAdvisory: boolean;
}

interface Props {
  graph?: ProcessGraph;
  events: WorkEvent[];
  gaps: Gap[];
  recommendations: Recommendation[];
  kpis: KPISnapshot;
  openRouterConfig: OpenRouterConfig | null;
  selectedQuestion: string;
  analystAnswer: AnalystAnswer;
  onQuestionChange: (q: string) => void;
  onOpenEvent: (id: string) => void;
}

function buildContext(
  graph: ProcessGraph | undefined,
  events: WorkEvent[],
  gaps: Gap[],
  recommendations: Recommendation[],
  kpis: KPISnapshot,
): string {
  return `PROCESS CONTEXT (Flowsensa)\n
Events: ${events.length} | Cases: ${kpis.caseCount}
Exception rate: ${(kpis.exceptionRate * 100).toFixed(1)}%
Rework rate: ${(kpis.reworkRate * 100).toFixed(1)}%
Automation coverage: ${(kpis.automationCoverageRate * 100).toFixed(0)}%
Nodes: ${graph?.nodes.length ?? 0} | Edges: ${graph?.edges.length ?? 0}
Gaps: ${gaps.length}
Top recommendations: ${recommendations.slice(0, 3).map(r => `${r.nodeId}: ${r.recommendationClass} (${Math.round(r.confidence * 100)}%)`).join('; ')}`;
}

export function AIAnalyst({
  graph,
  events,
  gaps,
  recommendations,
  kpis,
  openRouterConfig,
  selectedQuestion,
  analystAnswer,
  onQuestionChange,
  onOpenEvent,
}: Props) {
  const [query, setQuery] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!openRouterConfig || !query.trim() || loading) return;
    const userMsg = query.trim();
    setQuery('');
    setConversation(prev => [...prev, { role: 'user', content: userMsg, isAdvisory: false }]);
    setLoading(true);
    setError(null);
    try {
      const ctx = buildContext(graph, events, gaps, recommendations, kpis);
      const fullPrompt = `${ctx}\n\nUser question: ${userMsg}`;
      const answer = await sendAnalystQuery(openRouterConfig, fullPrompt);
      setConversation(prev => [
        ...prev,
        { role: 'assistant', content: answer, isAdvisory: true },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="module-content">
      <div className="module-heading">
        <h2>AI Analyst</h2>
        <p>Deterministic evidence-backed analysis, optionally extended with AI interpretation.</p>
      </div>

      {/* Deterministic Analysis */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ marginBottom: '0.5rem' }}>
          <h3>Deterministic Analysis</h3>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>No model · local evidence only</span>
        </div>
        <AnalystView
          selectedQuestion={selectedQuestion}
          answer={analystAnswer}
          onQuestionChange={onQuestionChange}
          onOpenEvent={onOpenEvent}
        />
      </div>

      {/* AI Chat Section */}
      {openRouterConfig ? (
        <div className="card">
          <div className="card-header" style={{ marginBottom: '0.75rem' }}>
            <h3>AI Chat</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="advisory-label">Advisory — AI interpretation, not confirmed fact</span>
              <button
                className="btn ghost"
                type="button"
                style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}
                onClick={() => setConversation([])}
              >
                Clear conversation
              </button>
            </div>
          </div>

          {/* Conversation */}
          {conversation.length > 0 && (
            <div className="conversation-list">
              {conversation.map((msg, i) => (
                <div key={i} className={`conversation-msg ${msg.role}`}>
                  {msg.isAdvisory && (
                    <div style={{ marginBottom: '0.4rem' }}>
                      <span className="advisory-label" style={{ fontSize: '0.62rem' }}>
                        Advisory — AI interpretation, not confirmed fact
                      </span>
                    </div>
                  )}
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                </div>
              ))}
              {loading && (
                <div className="conversation-msg assistant">
                  <p style={{ margin: 0, color: 'var(--text-dim)' }}>Thinking…</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239,82,96,0.1)', border: '1px solid rgba(239,82,96,0.3)',
              borderRadius: 'var(--radius)', padding: '0.75rem', color: 'var(--danger)',
              fontSize: '0.8rem', marginBottom: '0.75rem',
            }}>
              {error}
            </div>
          )}

          {/* Input */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask about this process…"
              rows={3}
              style={{
                flex: 1,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: 'var(--radius)',
                padding: '0.65rem',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-sans)',
                resize: 'vertical',
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  void handleSend();
                }
              }}
            />
            <button
              className="btn primary"
              type="button"
              disabled={!query.trim() || loading}
              onClick={() => void handleSend()}
              style={{ alignSelf: 'flex-end' }}
            >
              {loading ? '…' : 'Send'}
            </button>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.68rem', margin: '0.4rem 0 0' }}>
            Ctrl+Enter to send · Model: {openRouterConfig.model}
          </p>
        </div>
      ) : (
        <div className="config-banner">
          <span style={{ fontSize: '1.4rem' }}>🔑</span>
          <span>Configure OpenRouter in <strong>Settings</strong> to enable AI analysis and chat.</span>
        </div>
      )}
    </div>
  );
}
