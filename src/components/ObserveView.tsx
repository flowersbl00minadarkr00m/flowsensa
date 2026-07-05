import type { ProcessGraph, WorkEvent } from "../domain/types";
import { EvidenceLinks } from "./EvidenceLinks";
import { TruthBadge } from "./TruthBadge";

interface ObserveViewProps {
  graph: ProcessGraph;
  events: WorkEvent[];
  onOpenEvent: (eventId: string) => void;
}

export function ObserveView({ graph, events, onOpenEvent }: ObserveViewProps) {
  const cases = new Set(events.map((event) => event.caseId)).size;
  const handoffs = graph.edges.reduce((sum, edge) => sum + edge.handoffs, 0);
  const exceptions = events.filter((event) =>
    ["failure", "exception", "retry", "rollback"].includes(event.result.status),
  ).length;
  const outcomes = events.filter((event) => event.acceptedOutcome).length;
  const outcomeRate = cases ? Math.round((outcomes / cases) * 100) : 0;
  const commonVariant = graph.variants[0];
  const variantShare = cases && commonVariant
    ? Math.round((commonVariant.frequency / cases) * 100)
    : 0;

  return (
    <section aria-labelledby="observe-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Workspace overview</p>
          <h2 id="observe-title">Good morning, process engineer.</h2>
        </div>
        <p>
          Here is what the local evidence says about your accounts-payable
          process today.
        </p>
      </div>
      <div className="overview-grid">
        <div className="metric-grid">
          <article>
            <div className="metric-topline"><span>Cases observed</span><i>↗</i></div>
            <strong>{String(cases).padStart(2, "0")}</strong>
            <small>Across the imported workspace</small>
            <svg className="sparkline" viewBox="0 0 140 36" role="presentation">
              <path d="M2 30 C22 30, 24 8, 42 16 S64 34, 82 17 S110 6, 138 3" />
            </svg>
          </article>
          <article>
            <div className="metric-topline"><span>Path variants</span><i>◎</i></div>
            <strong>{String(graph.variants.length).padStart(2, "0")}</strong>
            <small>{variantShare}% on the most common path</small>
            <svg className="sparkline" viewBox="0 0 140 36" role="presentation">
              <path d="M2 26 C20 16, 30 28, 48 18 S76 7, 92 17 S118 29, 138 10" />
            </svg>
          </article>
          <article>
            <div className="metric-topline"><span>Handoffs</span><i>⇄</i></div>
            <strong>{String(handoffs).padStart(2, "0")}</strong>
            <small>Ownership transfers observed</small>
            <svg className="sparkline" viewBox="0 0 140 36" role="presentation">
              <path d="M2 31 C17 29, 30 19, 45 23 S70 33, 84 17 S108 3, 138 12" />
            </svg>
          </article>
          <article>
            <div className="metric-topline"><span>Exceptions</span><i>!</i></div>
            <strong>{String(exceptions).padStart(2, "0")}</strong>
            <small>Retries and exception events</small>
            <svg className="sparkline" viewBox="0 0 140 36" role="presentation">
              <path d="M2 8 C20 24, 31 12, 45 27 S71 14, 86 25 S112 30, 138 12" />
            </svg>
          </article>
        </div>
        <article className="outcome-card">
          <div className="outcome-copy">
            <span className="card-icon" aria-hidden="true">⌁</span>
            <div>
              <p className="eyebrow">Outcome signal</p>
              <h3>
                {outcomes} accepted outcome{outcomes === 1 ? "" : "s"}
              </h3>
            </div>
          </div>
          <div className="outcome-ring">
            <svg viewBox="0 0 120 120" role="img" aria-label={`${outcomeRate}% accepted outcome rate`}>
              <circle className="ring-track" cx="60" cy="60" r="48" />
              <circle
                className="ring-value"
                cx="60"
                cy="60"
                r="48"
                pathLength="100"
                strokeDasharray={`${outcomeRate} 100`}
              />
            </svg>
            <div><strong>{outcomeRate}%</strong><span>accepted</span></div>
          </div>
          <p>
            {outcomes} of {cases} observed cases reached a defensible accepted
            outcome. {cases - outcomes} case{cases - outcomes === 1 ? "" : "s"}{" "}
            still need closure evidence.
          </p>
          <div className="outcome-footer">
            <span>
              <b>{cases - outcomes}</b> open evidence gap
              {cases - outcomes === 1 ? "" : "s"}
            </span>
            <span><b>{graph.nodes.length}</b> activities</span>
          </div>
        </article>
      </div>
      <div className="panel process-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Observed succession</p>
            <h3>Process constellation</h3>
          </div>
          <span className="legend-item"><i /> inferred facts</span>
        </div>
        <div className="process-flow" aria-label="Process activity list">
          {graph.nodes.map((node, index) => (
            <article className="process-node" key={node.id}>
              <div className="node-order">
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div>
                <div className="title-row">
                  <h4>{node.label}</h4>
                  <TruthBadge state={node.truthState} />
                </div>
                <p>
                  <code>{node.id}</code> · {node.frequency} events · {node.actorTypes.join(", ")}
                </p>
                <p>
                  {node.repeats} repeats · {node.exceptions} exceptions · {node.acceptedOutcomes} accepted outcomes
                </p>
                <EvidenceLinks eventIds={node.eventIds} onOpenEvent={onOpenEvent} />
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="two-column">
        <div className="panel transition-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Flow evidence</p>
              <h3>Observed transitions</h3>
            </div>
            <span className="panel-count">{graph.edges.length}</span>
          </div>
          <ul className="record-list">
            {graph.edges.map((edge) => (
              <li key={edge.id}>
                <div className="title-row">
                  <strong>{edge.from} → {edge.to}</strong>
                  <TruthBadge state={edge.truthState} />
                </div>
                <span>
                  n={edge.frequency} · {edge.handoffs} handoff(s) · max wait{" "}
                  {(Math.max(...edge.waitMs, 0) / 3_600_000).toFixed(1)}h
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel variant-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Case architecture</p>
              <h3>Path variants</h3>
            </div>
            <span className="panel-count">{graph.variants.length}</span>
          </div>
          <ol className="record-list">
            {graph.variants.map((variant) => (
              <li key={variant.id}>
                <strong>{variant.caseIds.join(", ")}</strong>
                <span>{variant.activityIds.join(" → ")}</span>
                <small>
                  {variant.hasException ? "Exception path" : "Common path"} ·{" "}
                  {variant.acceptedOutcomes} accepted outcome(s)
                </small>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
