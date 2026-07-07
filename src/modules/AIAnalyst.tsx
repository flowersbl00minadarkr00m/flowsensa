import { useState } from 'react';
import { AnalystView } from '../components/AnalystView';
import { sendAnalystQuery } from '../lib/openrouterClient';
import type { AnalystAnswer, Gap, KPISnapshot, LLMProfile, ProcessGraph, Recommendation, WorkEvent } from '../domain/types';

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
  llmProfile: LLMProfile | null;
  selectedQuestion: string;
  analystAnswer: AnalystAnswer;
  onQuestionChange: (q: string) => void;
  onOpenEvent: (id: string) => void;
}

const SUGGESTED_PROMPTS = [
  'Where is this process most likely to bottleneck, and what telemetry proves it?',
  'Which task has the highest rework or handoff risk before automation?',
  'What compliance or quality gates are missing for this local workflow?',
  'Which enhancement would create the most leverage with the least new risk?',
  'What data should I capture next to make this process map more trustworthy?',
];

function buildContext(
  graph: ProcessGraph | undefined,
  events: WorkEvent[],
  gaps: Gap[],
  recommendations: Recommendation[],
  kpis: KPISnapshot,
): string {
  return `PROCESS CONTEXT (Flowsensa)
Events: ${events.length} | Cases: ${kpis.caseCount}
Exception rate: ${(kpis.exceptionRate * 100).toFixed(1)}%
Rework rate: ${(kpis.reworkRate * 100).toFixed(1)}%
Automation coverage: ${(kpis.automationCoverageRate * 100).toFixed(0)}%
Nodes: ${graph?.nodes.length ?? 0} | Edges: ${graph?.edges.length ?? 0}
Gaps: ${gaps.length}
Top recommendations: ${recommendations.slice(0, 3).map(r => `${r.nodeId}: ${r.recommendationClass} (${Math.round(r.confidence * 100)}%)`).join('; ')}`;
}

const RESPONSE_BOUNDARY = `Answer in four labeled sections:
1. Measured facts
2. Deterministic findings
3. Hypotheses
4. Next checks

Do not present hypotheses as confirmed facts.`;

export function AIAnalyst({
  graph,
  events,
  gaps,
  recommendations,
  kpis,
  llmProfile,
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
    if (!llmProfile || !query.trim() || loading) return;
    const userMsg = query.trim();
    setQuery('');
    setConversation(prev => [...prev, { role: 'user', content: userMsg, isAdvisory: false }]);
    setLoading(true);
    setError(null);
    try {
      const ctx = buildContext(graph, events, gaps, recommendations, kpis);
      const fullPrompt = `${ctx}\n\n${RESPONSE_BOUNDARY}\n\nUser question: ${userMsg}`;
      const answer = await sendAnalystQuery(llmProfile, fullPrompt);
      setConversation(prev => [...prev, { role: 'assistant', content: answer, isAdvisory: true }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="module-content">
      <div className="module-heading">
        <h2>AI Insights</h2>
        <p>Ask operational questions about this process. Deterministic analysis stays local; model interpretation is explicit.</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ marginBottom: '0.5rem' }}>
          <h3>Deterministic Analysis</h3>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>No model - local evidence only</span>
        </div>
        <AnalystView selectedQuestion={selectedQuestion} answer={analystAnswer} onQuestionChange={onQuestionChange} onOpenEvent={onOpenEvent} />
      </div>

      <div className="card">
        <div className="card-header" style={{ marginBottom: '0.75rem' }}>
          <h3>Prompt this process</h3>
          {llmProfile && <span className="advisory-label">Using {llmProfile.name} - AI interpretation</span>}
        </div>

        <div className="suggested-prompts">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button key={prompt} type="button" onClick={() => setQuery(prompt)}>
              {prompt}
            </button>
          ))}
        </div>

        {llmProfile ? (
          <>
            <div className="ai-context-strip">
              <span>Bound context</span>
              <strong>{events.length} events</strong>
              <strong>{kpis.caseCount} cases</strong>
              <strong>{recommendations.length} enhancements</strong>
              <small>{llmProfile.model}</small>
            </div>

            {conversation.length > 0 && (
              <div className="conversation-list">
                {conversation.map((msg, i) => (
                  <div key={`${msg.role}-${i}`} className={`conversation-msg ${msg.role}`}>
                    {msg.isAdvisory && <span className="advisory-label">AI interpretation, not confirmed fact</span>}
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  </div>
                ))}
                {loading && <div className="conversation-msg assistant"><p style={{ margin: 0, color: 'var(--text-dim)' }}>Thinking...</p></div>}
              </div>
            )}

            {error && <div className="form-error">{error}</div>}

            <div className="prompt-row">
              <textarea
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask about bottlenecks, variants, rework, risk, gates, telemetry gaps, or tool fit..."
                rows={3}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void handleSend();
                }}
              />
              <button className="btn primary" type="button" disabled={!query.trim() || loading} onClick={() => void handleSend()}>
                {loading ? 'Sending...' : 'Send'}
              </button>
            </div>
            <p className="fine-print">Ctrl+Enter to send. Only bounded process context is sent to the selected LLM profile.</p>
          </>
        ) : (
          <div className="config-banner compact">
            <span>Configure a named LLM profile in Settings to ask custom model-assisted questions. Suggested prompts can still guide deterministic review.</span>
          </div>
        )}
      </div>
    </div>
  );
}
