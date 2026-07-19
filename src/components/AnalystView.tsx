import { ANALYST_QUESTIONS } from "../domain/analyst";
import type { AnalystAnswer } from "../domain/types";
import { EvidenceLinks } from "./EvidenceLinks";

interface AnalystViewProps {
  selectedQuestion: string;
  answer: AnalystAnswer;
  onQuestionChange: (questionId: string) => void;
  onOpenEvent: (eventId: string) => void;
  onOpenEvidence?: (eventIds: string[], label: string) => void;
}

export function AnalystView({
  selectedQuestion,
  answer,
  onQuestionChange,
  onOpenEvent,
  onOpenEvidence,
}: AnalystViewProps) {
  return (
    <section aria-labelledby="analyst-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Deterministic analyst</p>
          <h2 id="analyst-title">Ask this process</h2>
        </div>
        <p>No model key. No invented facts. Every answer cites local records.</p>
      </div>
      <div className="analyst-layout">
        <div className="question-list" aria-label="Available process questions">
          {ANALYST_QUESTIONS.map((question) => (
            <button
              key={question.id}
              className={question.id === selectedQuestion ? "active" : ""}
              type="button"
              aria-pressed={question.id === selectedQuestion}
              onClick={() => onQuestionChange(question.id)}
            >
              {question.label}
            </button>
          ))}
        </div>
        <article className="answer-card" aria-live="polite">
          <p className="eyebrow">Evidence-backed answer</p>
          <h3>{answer.title}</h3>
          <p className="answer-summary">{answer.summary}</p>
          <h4>Supporting records</h4>
          <ul className="record-list">
            {answer.evidence.map((evidence, index) => (
              <li key={`${evidence.label}-${index}`}>
                <strong>{evidence.label}</strong>
                {evidence.nodeIds?.length ? (
                  <span>Graph: {evidence.nodeIds.join(", ")}</span>
                ) : null}
                <EvidenceLinks
                  eventIds={evidence.eventIds}
                  onOpenEvent={onOpenEvent}
                  onOpenEvidence={onOpenEvidence}
                  evidenceLabel={evidence.label}
                />
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
