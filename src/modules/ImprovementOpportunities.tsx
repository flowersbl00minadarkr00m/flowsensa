import { useState } from 'react';
import { EvidenceLinks } from '../components/EvidenceLinks';
import { RECOMMENDATION_CLASSES } from '../components/EngineerView';
import type { Gap, GraphNode, Recommendation, RecommendationClass } from '../domain/types';

interface Props {
  nodes: GraphNode[];
  recommendations: Recommendation[];
  gaps: Gap[];
  onRecommendationChange: (id: string, cls: RecommendationClass) => void;
  onOpenEvent: (id: string) => void;
}

type Family = 'Automation' | 'LLM' | 'Hybrid' | 'Keep Manual' | 'Insufficient evidence';

interface EnhancementGuidance {
  change: string;
  addresses: string;
  implementation: string[];
  benefit: string;
}

function familyFor(cls: RecommendationClass): Family {
  if (cls === 'Deterministic automation') return 'Automation';
  if (
    cls === 'Probabilistic AI assistance with human execution' ||
    cls === 'Probabilistic AI proposal with human approval'
  ) return 'LLM';
  if (
    cls === 'Bounded probabilistic execution with deterministic controls' ||
    cls === 'Hybrid deterministic/probabilistic workflow'
  ) return 'Hybrid';
  if (cls === 'Keep manual' || cls === 'Simplify or eliminate before automating') return 'Keep Manual';
  return 'Insufficient evidence';
}

const FAMILY_BADGE_CLASS: Record<Family, string> = {
  Automation: 'badge family-automation',
  LLM: 'badge family-llm',
  Hybrid: 'badge family-hybrid',
  'Keep Manual': 'badge family-manual',
  'Insufficient evidence': 'badge family-insufficient',
};

const FAMILY_MEANING: Record<Family, { headline: string; what: string }> = {
  Automation: {
    headline: 'Automate',
    what: 'Use deterministic rules or code when the observed inputs, outputs, and checks are stable enough to verify exactly.',
  },
  LLM: {
    headline: 'AI assist',
    what: 'Use a model to draft, summarize, compare, or propose, while a person still owns review and acceptance.',
  },
  Hybrid: {
    headline: 'Guarded hybrid',
    what: 'Combine AI capability with deterministic permissions, validation, evidence retention, and stop conditions.',
  },
  'Keep Manual': {
    headline: 'Simplify or keep human-owned',
    what: 'Keep judgment with a person, or simplify the work before trying to automate it.',
  },
  'Insufficient evidence': {
    headline: 'Needs more evidence',
    what: 'There are not enough observed runs of this step to recommend a direction with confidence.',
  },
};

function describeSignals(node: GraphNode | undefined, rec: Recommendation): string[] {
  const signals: string[] = [];
  if (node?.exceptions) signals.push(`${node.exceptions} exception${node.exceptions === 1 ? '' : 's'}`);
  if (node?.repeats) signals.push(`${node.repeats} repeat${node.repeats === 1 ? '' : 's'} or rework signal${node.repeats === 1 ? '' : 's'}`);
  if ((node?.actorTypes.length ?? 0) > 1) signals.push('handoffs across human, agent, or system actors');
  if ((node?.confidence ?? rec.confidence) < 0.75) signals.push('lower-confidence telemetry');
  if (rec.expectedFailureModes.length > 0) signals.push(rec.expectedFailureModes[0].toLowerCase());
  return signals;
}

function buildGuidance(family: Family, rec: Recommendation, node: GraphNode | undefined): EnhancementGuidance {
  const task = node?.label ?? rec.nodeId;
  const signalText = describeSignals(node, rec).slice(0, 3).join(', ');
  const evidenceCount = rec.evidenceEventIds.length;
  const evidencePhrase = evidenceCount > 0
    ? `${evidenceCount} source event${evidenceCount === 1 ? '' : 's'}`
    : 'the currently available process map';
  const firstControl = rec.requiredControls[0] ?? 'Keep an evidence review before rollout.';
  const secondControl = rec.requiredControls[1] ?? 'Start with a reversible pilot before making it standard.';

  if (family === 'Automation') {
    return {
      change: `Turn "${task}" into a rule-based step that runs the same way every time.`,
      addresses: signalText
        ? `This addresses ${signalText}. The recommendation is based on ${evidencePhrase}, so start narrow and keep the output checkable.`
        : `This addresses repeatable work that appears stable enough to check with ${evidencePhrase}.`,
      implementation: [
        'Write down the exact trigger: when should this step start?',
        'List the required inputs and the one acceptable output.',
        `Add the control gate: ${firstControl}`,
        'Run it beside the current manual step for a few cases before replacing the manual path.',
      ],
      benefit: 'Less manual repetition and fewer missed handoffs, without asking a model to make judgment calls.',
    };
  }

  if (family === 'LLM') {
    return {
      change: `Use an LLM to draft or summarize "${task}", but keep the person as the decision owner.`,
      addresses: signalText
        ? `This addresses ${signalText}. The model should reduce preparation effort, not approve the work.`
        : 'This addresses work where language, summarization, or comparison may help but the final answer still needs human judgment.',
      implementation: [
        'Create a short prompt template with the evidence the model is allowed to use.',
        'Require the model to label assumptions and unanswered questions.',
        `Add the review rule: ${firstControl}`,
        'Only save the result after a person accepts, edits, or rejects it.',
      ],
      benefit: 'Faster drafting and review preparation while keeping accountability with the human owner.',
    };
  }

  if (family === 'Hybrid') {
    return {
      change: `Split "${task}" into a guarded workflow: deterministic checks first, AI help second, human approval last.`,
      addresses: signalText
        ? `This addresses ${signalText}. A hybrid pattern gives leverage without letting uncertain model output move unchecked.`
        : 'This addresses work that can benefit from AI support but still needs explicit gates, evidence, and stop conditions.',
      implementation: [
        'Define the non-negotiable checks the system must run before any model call.',
        'Use the model only for a bounded job, such as drafting, comparison, or exception explanation.',
        `Add the stop condition: ${firstControl}`,
        `Add the human gate: ${secondControl}`,
      ],
      benefit: 'More throughput on complex steps while preserving evidence, reversibility, and human control.',
    };
  }

  if (family === 'Keep Manual') {
    return {
      change: `Keep "${task}" human-owned for now, and simplify the step before introducing tools.`,
      addresses: signalText
        ? `This addresses ${signalText}. Automating now could lock in an unclear or risky process.`
        : 'This addresses work where judgment, unclear ownership, or weak telemetry makes automation premature.',
      implementation: [
        'Clarify who owns the decision and what evidence they need.',
        'Remove duplicate approvals, unclear handoffs, or unused outputs.',
        `Keep this control visible: ${firstControl}`,
        'Review again after more cases are logged.',
      ],
      benefit: 'Reduces process noise before money or effort goes into automation.',
    };
  }

  return {
    change: `Do not implement an enhancement for "${task}" yet.`,
    addresses: 'The current telemetry is not strong enough to distinguish a real improvement from a guess.',
    implementation: [
      'Capture more examples of the step across cases.',
      'Record who performs it, what evidence changes, and what counts as success.',
      'Confirm whether failures, waits, and handoffs are real patterns or one-off events.',
      'Re-run Process Enhancements after the evidence base improves.',
    ],
    benefit: 'Avoids premature automation and gives the next recommendation enough context to be trusted.',
  };
}

function generateBrief(family: Family, rec: Recommendation): string {
  const controls = rec.requiredControls.map((control) => `- ${control}`).join('\n') || '- Evidence review';
  const failures = rec.expectedFailureModes.map((failure) => `- ${failure}`).join('\n') || '- Unknown failure mode';
  const header = `# Improvement Brief - ${rec.nodeId}
Family: ${family}
Confidence: ${Math.round(rec.confidence * 100)}%

`;

  if (family === 'Automation') {
    return `${header}## Deterministic Automation Proposal
This step is a candidate for exact, testable automation.

### Trigger
[Define trigger condition]

### Logic
[Specify deterministic rules or code]

### Controls
${controls}

### Expected Failure Modes
${failures}
`;
  }

  if (family === 'LLM') {
    return `${header}## LLM-Assisted Proposal
An LLM can propose or draft output for this step, but the output stays advisory until human-approved.

### Prompt Template
[Define structured prompt]

### Human Review Gate
[Define acceptance criteria]

### Controls
${controls}
`;
  }

  if (family === 'Hybrid') {
    return `${header}## Guarded Hybrid Proposal
Combine probabilistic capability with deterministic permissions, checks, and stop conditions.

### Deterministic Layer
[Specify permissions, validators, and rollback or stop logic]

### Model Layer
[Specify bounded model role]

### Controls
${controls}

### Expected Failure Modes
${failures}
`;
  }

  return `${header}## Simplify / Keep Human-Owned
This step should remain manual or be simplified before automation is considered.

### Rationale
${rec.uncertainty}

### Simplification Opportunities
[Identify waste, unclear ownership, or missing controls]
`;
}

function MnemosyncModal({ rec, onClose }: { rec: Recommendation; onClose: () => void }) {
  const text = `flowsensa-improvement
node: ${rec.nodeId}
recommendation: ${rec.recommendationClass}
confidence: ${Math.round(rec.confidence * 100)}%
evidence: ${rec.evidenceEventIds.slice(0, 3).join(', ')}
`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h3>Track in Mnemosync</h3>
        <p>Copy this explicit handoff into your Mnemosync workspace. Flowsensa will not write to another product silently.</p>
        <pre>{text}</pre>
        <div className="button-row">
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
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [mnemosyncRec, setMnemosyncRec] = useState<Recommendation | null>(null);
  const confirmedNodes = nodes.filter((node) => node.status === 'confirmed').length;
  const recommendationsAreProvisional = confirmedNodes === 0;

  const filtered = recommendations.filter((rec) => {
    const family = familyFor(rec.recommendationClass);
    if (familyFilter && family !== familyFilter) return false;
    if (rec.confidence < minConfidence / 100) return false;
    return true;
  });
  const expandedRecommendationId = filtered.some((rec) => rec.nodeId === expandedNodeId)
    ? expandedNodeId
    : filtered[0]?.nodeId ?? null;

  const families: Family[] = ['Automation', 'LLM', 'Hybrid', 'Keep Manual', 'Insufficient evidence'];

  return (
    <div className="module-content">
      <div className="module-heading">
        <h2>Process Enhancements</h2>
        <p>
          Choose the right enhancement for each observed step: automate, AI assist,
          guarded hybrid, simplify, or keep human-owned. Every suggestion stays tied
          to source events so the recommendation can be challenged.
        </p>
      </div>

      {recommendationsAreProvisional && (
        <div className="provisional-banner" role="status">
          <strong>Provisional recommendations</strong>
          <span>No process steps are confirmed yet. Use Process Map and Gate Checks before treating these suggestions as implementation-ready.</span>
        </div>
      )}

      <div className="filter-bar">
        <label>
          Enhancement
          <select value={familyFilter} onChange={(event) => setFamilyFilter(event.target.value as Family | '')}>
            <option value="">All</option>
            {families.map((family) => <option key={family} value={family}>{family}</option>)}
          </select>
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          Min confidence: {minConfidence}%
          <input
            type="range"
            min={0}
            max={100}
            value={minConfidence}
            onChange={(event) => setMinConfidence(Number(event.target.value))}
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
        <div className="opportunity-grid">
          {filtered.map((rec) => {
            const node = nodes.find((candidate) => candidate.id === rec.nodeId);
            const family = familyFor(rec.recommendationClass);
            const guidance = buildGuidance(family, rec, node);
            const isExpanded = rec.nodeId === expandedRecommendationId;
            return (
              <div key={rec.nodeId} className={`card opportunity-card ${isExpanded ? 'expanded' : 'compact'}`}>
                <div className="opportunity-header">
                  <div>
                    <span className="opportunity-type">{node?.activityType ?? 'activity'} step</span>
                    <h3>{node?.label ?? rec.nodeId}</h3>
                  </div>
                  <div className="opportunity-actions">
                    <span className={FAMILY_BADGE_CLASS[family]}>{family}</span>
                    <button
                      className="btn ghost"
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedNodeId(isExpanded ? filtered[0]?.nodeId ?? rec.nodeId : rec.nodeId)}
                    >
                      {isExpanded ? 'Expanded' : 'Show guidance'}
                    </button>
                  </div>
                </div>

                <div className="rec-summary">
                  <p className="rec-headline">
                    <span className="rec-label">Enhancement</span>
                    {FAMILY_MEANING[family].headline}
                  </p>
                  <p className="rec-what">{FAMILY_MEANING[family].what}</p>
                  {rec.uncertainty && (
                    <p className="rec-why"><strong>Evidence note:</strong> {rec.uncertainty}</p>
                  )}
                </div>

                {isExpanded ? (
                  <div className="enhancement-guidance" aria-label={`Guidance for ${node?.label ?? rec.nodeId}`}>
                    <section>
                      <span>1. What the enhancement is</span>
                      <p>{guidance.change}</p>
                    </section>
                    <section>
                      <span>2. What it addresses</span>
                      <p>{guidance.addresses}</p>
                    </section>
                    <section>
                      <span>3. How to implement it</span>
                      <ol>
                        {guidance.implementation.map((step) => <li key={step}>{step}</li>)}
                      </ol>
                    </section>
                    <section>
                      <span>Expected benefit</span>
                      <p>{guidance.benefit}</p>
                    </section>
                  </div>
                ) : (
                  <div className="enhancement-compact-summary">
                    <p><strong>What:</strong> {guidance.change}</p>
                    <p><strong>Addresses:</strong> {guidance.addresses}</p>
                  </div>
                )}

                <div className="confidence-row-compact">
                  <span>{Math.round(rec.confidence * 100)}% confidence</span>
                  <div className="confidence-bar-wrap">
                    <div className="confidence-bar-fill" style={{ width: `${rec.confidence * 100}%` }} />
                  </div>
                </div>

                {(rec.expectedFailureModes.length > 0 || rec.requiredControls.length > 0) && (
                  <details className="rec-details">
                    <summary>Controls and failure modes</summary>
                    <div className="rec-details-grid">
                      {rec.expectedFailureModes.length > 0 && (
                        <div>
                          <h4>Failure modes</h4>
                          <ul>{rec.expectedFailureModes.map((failure) => <li key={failure}>{failure}</li>)}</ul>
                        </div>
                      )}
                      {rec.requiredControls.length > 0 && (
                        <div>
                          <h4>Required controls</h4>
                          <ul>{rec.requiredControls.map((control) => <li key={control}>{control}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <label className="intervention-select">
                  <span>Enhancement choice - change it if the evidence says otherwise</span>
                  <select
                    value={rec.recommendationClass}
                    onChange={(event) => onRecommendationChange(rec.nodeId, event.target.value as RecommendationClass)}
                  >
                    {RECOMMENDATION_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </label>

                {rec.evidenceEventIds.length > 0 && (
                  <div className="evidence-block">
                    <span>Evidence events ({rec.evidenceEventIds.length})</span>
                    <EvidenceLinks eventIds={rec.evidenceEventIds} onOpenEvent={onOpenEvent} />
                  </div>
                )}

                <div className="button-row">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      const content = generateBrief(family, rec);
                      const blob = new Blob([content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const anchor = document.createElement('a');
                      anchor.href = url;
                      anchor.download = `flowsensa-brief-${rec.nodeId}.md`;
                      anchor.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Generate brief
                  </button>
                  <button className="btn ghost" type="button" onClick={() => setMnemosyncRec(rec)}>
                    Track in Mnemosync
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => {
                      const query = `OSSensa alternatives for ${family.toLowerCase()} process tooling on ${node?.label ?? rec.nodeId}`;
                      void navigator.clipboard.writeText(query);
                    }}
                  >
                    Copy OSSensa search
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {gaps.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header" style={{ marginBottom: '0.75rem' }}>
            <h3>Responsibility and control gaps</h3>
            <span className="badge">{gaps.length}</span>
          </div>
          <ul className="gap-list">
            {gaps.map((gap) => (
              <li key={gap.id} className={`gap gap-${gap.severity}`}>
                <div>
                  <strong>{gap.type}</strong>
                  <p>{gap.message}</p>
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
