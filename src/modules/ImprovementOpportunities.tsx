import { useState } from 'react';
import type { Gap, GraphNode, Recommendation, RecommendationClass } from '../domain/types';
import { EvidenceLinks } from '../components/EvidenceLinks';
import { RECOMMENDATION_CLASSES } from '../components/EngineerView';

interface Props {
  nodes: GraphNode[];
  recommendations: Recommendation[];
  gaps: Gap[];
  onRecommendationChange: (id: string, cls: RecommendationClass) => void;
  onOpenEvent: (id: string) => void;
}

type Family = 'Automation' | 'LLM' | 'Hybrid' | 'Keep Manual' | 'Insufficient evidence';

function familyFor(cls: RecommendationClass): Family {
  if (cls === 'Deterministic automation') return 'Automation';
  if (
    cls === 'Probabilistic AI assistance with human execution' ||
    cls === 'Probabilistic AI proposal with human approval'
  )
    return 'LLM';
  if (
    cls === 'Bounded probabilistic execution with deterministic controls' ||
    cls === 'Hybrid deterministic/probabilistic workflow'
  )
    return 'Hybrid';
  if (cls === 'Keep manual' || cls === 'Simplify or eliminate before automating')
    return 'Keep Manual';
  return 'Insufficient evidence';
}

const FAMILY_BADGE_CLASS: Record<Family, string> = {
  Automation: 'badge family-automation',
  LLM: 'badge family-llm',
  Hybrid: 'badge family-hybrid',
  'Keep Manual': 'badge family-manual',
  'Insufficient evidence': 'badge family-insufficient',
};

/** Plain-language meaning of each recommended treatment family. */
const FAMILY_MEANING: Record<Family, { headline: string; what: string }> = {
  Automation: {
    headline: 'Automate this step',
    what: 'It runs consistently with predictable inputs and outputs, so deterministic rules or code can take it over.',
  },
  LLM: {
    headline: 'Add AI assistance',
    what: 'An AI model can draft or propose the output, but a person still reviews or approves before it counts.',
  },
  Hybrid: {
    headline: 'Automate with guardrails',
    what: 'Combine automated execution with deterministic checks that catch and contain errors.',
  },
  'Keep Manual': {
    headline: 'Keep this step human',
    what: 'The evidence does not support automating it yet — keep it manual, or simplify it before automating.',
  },
  'Insufficient evidence': {
    headline: 'Needs more evidence',
    what: 'There are not enough observed runs of this step to recommend a direction with confidence.',
  },
};

function generateBrief(family: Family, rec: Recommendation): string {
  const header = `# Improvement Brief — ${rec.nodeId}\nFamily: ${family}\nConfidence: ${Math.round(rec.confidence * 100)}%\n\n`;
  if (family === 'Automation') {
    return header + `## Deterministic Automation Proposal\nThis step is a candidate for full deterministic automation.\n\n### Trigger\n[Define trigger condition]\n\n### Logic\n[Specify deterministic rules / code]\n\n### Controls\n${rec.requiredControls.join('\n- ')}\n\n### Expected Failure Modes\n${rec.expectedFailureModes.join('\n- ')}\n`;
  }
  if (family === 'LLM') {
    return header + `## LLM-Assisted Proposal\nAn LLM can augment or propose outputs for this step.\n\n### Advisory Notice\nAll LLM outputs are advisory until human-approved.\n\n### Prompt Template\n[Define structured prompt]\n\n### Human Review Gate\n[Define approval criteria]\n\n### Controls\n${rec.requiredControls.join('\n- ')}\n`;
  }
  if (family === 'Hybrid') {
    return header + `## Hybrid Automation Proposal\nCombine deterministic controls with probabilistic capabilities.\n\n### Deterministic Layer\n[Specify rules]\n\n### Probabilistic Layer\n[Specify AI component]\n\n### Controls\n${rec.requiredControls.join('\n- ')}\n`;
  }
  return header + `## Keep Manual / Simplify\nThis step should remain manual or be simplified before automation is considered.\n\n### Rationale\n${rec.uncertainty}\n\n### Simplification Opportunities\n[Identify waste and non-value steps]\n`;
}

function MnemosyncModal({ rec, onClose }: { rec: Recommendation; onClose: () => void }) {
  const text = `flowsensa-improvement\nnode: ${rec.nodeId}\nrecommendation: ${rec.recommendationClass}\nconfidence: ${Math.round(rec.confidence * 100)}%\nevidence: ${rec.evidenceEventIds.slice(0, 3).join(', ')}\n`;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: '1.5rem', maxWidth: '500px', width: '90%',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ color: 'var(--text)', marginTop: 0 }}>Track in Mnemosync</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Copy and paste into your Mnemosync workspace:</p>
        <pre style={{
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '0.75rem', fontSize: '0.78rem', color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: '1rem',
        }}>
          {text}
        </pre>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn primary" type="button" onClick={() => { void navigator.clipboard.writeText(text); }}>
            Copy
          </button>
          <button className="btn ghost" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export function ImprovementOpportunities({
  nodes,
  recommendations,
  gaps,
  onRecommendationChange,
  onOpenEvent,
}: Props) {
  const [familyFilter, setFamilyFilter] = useState<Family | ''>('');
  const [minConfidence, setMinConfidence] = useState(0);
  const [mnemosyncRec, setMnemosyncRec] = useState<Recommendation | null>(null);

  const filtered = recommendations.filter(rec => {
    const f = familyFor(rec.recommendationClass);
    if (familyFilter && f !== familyFilter) return false;
    if (rec.confidence < minConfidence / 100) return false;
    return true;
  });

  const families: Family[] = ['Automation', 'LLM', 'Hybrid', 'Keep Manual', 'Insufficient evidence'];

  return (
    <div className="module-content">
      <div className="module-heading">
        <h2>Improvement Opportunities</h2>
        <p>
          For every step FlowSensa observed in your process, it recommends how to
          improve it — automate it, add AI assistance, use a guarded hybrid, or
          keep it manual — and shows the evidence behind that call. Each card is a
          recommendation you can accept or override.
        </p>
      </div>

      <div className="filter-bar">
        <label>
          Family
          <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value as Family | '')}>
            <option value="">All</option>
            {families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          Min confidence: {minConfidence}%
          <input
            type="range"
            min={0}
            max={100}
            value={minConfidence}
            onChange={e => setMinConfidence(Number(e.target.value))}
            style={{ width: '120px' }}
          />
        </label>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginLeft: 'auto' }}>
          {filtered.length} of {recommendations.length} shown
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No recommendations match the current filter. Import process events to generate recommendations.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map(rec => {
            const node = nodes.find(n => n.id === rec.nodeId);
            const family = familyFor(rec.recommendationClass);
            return (
              <div key={rec.nodeId} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                      {node?.activityType ?? 'activity'} step
                    </span>
                    <h3 style={{ color: 'var(--text)', margin: '0.1rem 0 0', fontSize: '1rem' }}>
                      {node?.label ?? rec.nodeId}
                    </h3>
                  </div>
                  <span className={FAMILY_BADGE_CLASS[family]}>{family}</span>
                </div>

                {/* Plain-language recommendation */}
                <div className="rec-summary">
                  <p className="rec-headline">
                    <span className="rec-label">Recommendation</span>
                    {FAMILY_MEANING[family].headline}
                  </p>
                  <p className="rec-what">{FAMILY_MEANING[family].what}</p>
                  {rec.uncertainty && (
                    <p className="rec-why"><strong>Why:</strong> {rec.uncertainty}</p>
                  )}
                </div>

                {/* Confidence bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', minWidth: '110px' }}>
                    {Math.round(rec.confidence * 100)}% confidence
                  </span>
                  <div className="confidence-bar-wrap">
                    <div className="confidence-bar-fill" style={{ width: `${rec.confidence * 100}%` }} />
                  </div>
                </div>

                {/* Failure modes + controls, if present */}
                {(rec.expectedFailureModes.length > 0 || rec.requiredControls.length > 0) && (
                  <details className="rec-details">
                    <summary>What to watch for before you change this</summary>
                    <div className="rec-details-grid">
                      {rec.expectedFailureModes.length > 0 && (
                        <div>
                          <h4>Expected failure modes</h4>
                          <ul>{rec.expectedFailureModes.map(f => <li key={f}>{f}</li>)}</ul>
                        </div>
                      )}
                      {rec.requiredControls.length > 0 && (
                        <div>
                          <h4>Required controls</h4>
                          <ul>{rec.requiredControls.map(c => <li key={c}>{c}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* Treatment selector */}
                <label style={{ display: 'grid', gap: '0.3rem', marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    Recommended treatment — change it if you disagree
                  </span>
                  <select
                    value={rec.recommendationClass}
                    onChange={e => onRecommendationChange(rec.nodeId, e.target.value as RecommendationClass)}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      borderRadius: 'var(--radius)',
                      padding: '0.4rem 0.6rem',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {RECOMMENDATION_CLASSES.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </label>

                {/* Evidence links */}
                {rec.evidenceEventIds.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                      Evidence events ({rec.evidenceEventIds.length}):
                    </span>
                    <EvidenceLinks eventIds={rec.evidenceEventIds} onOpenEvent={onOpenEvent} />
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn"
                    type="button"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => {
                      const content = generateBrief(family, rec);
                      const blob = new Blob([content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `flowsensa-brief-${rec.nodeId}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Generate brief
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setMnemosyncRec(rec)}
                  >
                    Track in Mnemosync
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gaps */}
      {gaps.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header" style={{ marginBottom: '0.75rem' }}>
            <h3>Responsibility & Control Gaps</h3>
            <span className="badge">{gaps.length}</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.6rem' }}>
            {gaps.map(gap => (
              <li
                key={gap.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '0.75rem',
                  alignItems: 'center',
                  borderLeft: `3px solid ${gap.severity === 'critical' ? 'var(--danger)' : gap.severity === 'warning' ? 'var(--warning)' : 'var(--info)'}`,
                  background: 'var(--surface-2)',
                  padding: '0.7rem 1rem',
                  borderRadius: `0 var(--radius) var(--radius) 0`,
                }}
              >
                <div>
                  <strong style={{ color: 'var(--text)', display: 'block' }}>{gap.type}</strong>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{gap.message}</p>
                </div>
                <EvidenceLinks eventIds={gap.eventIds} onOpenEvent={onOpenEvent} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {mnemosyncRec && (
        <MnemosyncModal rec={mnemosyncRec} onClose={() => setMnemosyncRec(null)} />
      )}
    </div>
  );
}
