import type {
  Gap,
  GraphNode,
  Recommendation,
  RecommendationClass,
} from "../domain/types";
import { EvidenceLinks } from "./EvidenceLinks";
import { TruthBadge } from "./TruthBadge";
import { automationFamilyFor } from "../domain/recommendations";

export const RECOMMENDATION_CLASSES: RecommendationClass[] = [
  "Keep manual",
  "Simplify or eliminate before automating",
  "Deterministic automation",
  "Probabilistic AI assistance with human execution",
  "Probabilistic AI proposal with human approval",
  "Bounded probabilistic execution with deterministic controls",
  "Hybrid deterministic/probabilistic workflow",
  "Insufficient evidence",
];

interface EngineerViewProps {
  nodes: GraphNode[];
  recommendations: Recommendation[];
  gaps: Gap[];
  onRecommendationChange: (
    nodeId: string,
    recommendationClass: RecommendationClass,
  ) => void;
  onOpenEvent: (eventId: string) => void;
}

export function EngineerView({
  nodes,
  recommendations,
  gaps,
  onRecommendationChange,
  onOpenEvent,
}: EngineerViewProps) {
  return (
    <section aria-labelledby="engineer-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Process engineering</p>
          <h2 id="engineer-title">Treat each step on its evidence</h2>
        </div>
        <p>Frequency informs value; it never selects automation on its own.</p>
      </div>
      <div className="notice warning">
        Recommendations remain proposals until their process facts are
        user-confirmed. Expected failure modes and controls stay visible.
      </div>
      <div className="recommendation-list">
        {recommendations.map((recommendation) => {
          const node = nodes.find((candidate) => candidate.id === recommendation.nodeId);
          return (
            <article className="recommendation-card" key={recommendation.nodeId}>
              <div className="title-row">
                <div>
                  <p className="eyebrow">{node?.activityType ?? "activity"}</p>
                  <h3>{node?.label ?? recommendation.nodeId}</h3>
                </div>
                <TruthBadge state={recommendation.truthState} />
              </div>
              <p className="automation-family">
                {recommendation.automationFamily ??
                  automationFamilyFor(recommendation.recommendationClass)}
              </p>
              <label>
                Primary treatment
                <select
                  value={recommendation.recommendationClass}
                  onChange={(event) =>
                    onRecommendationChange(
                      recommendation.nodeId,
                      event.target.value as RecommendationClass,
                    )
                  }
                >
                  {RECOMMENDATION_CLASSES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <div className="confidence-row">
                <strong>{Math.round(recommendation.confidence * 100)}% confidence</strong>
                <span>{recommendation.uncertainty}</span>
              </div>
              <details>
                <summary>Sixteen rubric factors</summary>
                <div className="factor-grid">
                  {recommendation.factors.map((factor) => (
                    <div className="factor" key={factor.key}>
                      <div className="title-row">
                        <strong>{factor.label}</strong>
                        <span className={`level level-${factor.value}`}>{factor.value}</span>
                      </div>
                      <p>{factor.effect}</p>
                      <EvidenceLinks
                        eventIds={factor.evidenceEventIds}
                        onOpenEvent={onOpenEvent}
                      />
                    </div>
                  ))}
                </div>
              </details>
              <div className="two-column compact-columns">
                <div>
                  <h4>Expected failure modes</h4>
                  <ul>
                    {recommendation.expectedFailureModes.map((failureMode) => (
                      <li key={failureMode}>{failureMode}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Required controls</h4>
                  <ul>
                    {recommendation.requiredControls.map((control) => (
                      <li key={control}>{control}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="panel">
        <h3>Responsibility & control gaps</h3>
        <ul className="gap-list">
          {gaps.map((gap) => (
            <li className={`gap gap-${gap.severity}`} key={gap.id}>
              <div>
                <strong>{gap.type}</strong>
                <p>{gap.message}</p>
              </div>
              <EvidenceLinks eventIds={gap.eventIds} onOpenEvent={onOpenEvent} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
