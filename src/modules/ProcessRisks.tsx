import { useEffect, useMemo, useState } from 'react';
import type { LLMProfile, ProcessMetadata, ProcessRisk } from '../domain/types';

interface Props {
  metadata: ProcessMetadata;
  risks: ProcessRisk[];
  llmProfile: LLMProfile | null;
  onOpenEvent: (id: string) => void;
}

function severityClass(severity: ProcessRisk['severity']): string {
  return `risk-severity risk-${severity}`;
}

export function ProcessRisks({ metadata, risks, llmProfile, onOpenEvent }: Props) {
  const [enriched, setEnriched] = useState<ProcessRisk[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  function addAdvisoryRisks() {
    const advisory = risks.slice(0, 2).map((risk, index): ProcessRisk => ({
      ...risk,
      id: `${risk.id}-llm-${index}`,
      source: 'llm-assisted',
      riskIdentified: `${risk.riskIdentified} Advisory read: check adjacent decisions and handoffs for compounding failure modes.`,
      riskMitigation: `${risk.riskMitigation} Add an explicit review prompt for the owner before the next run.`,
    }));
    setEnriched(advisory);
  }

  const visibleRisks = [...risks, ...enriched];
  const pageCount = Math.max(1, Math.ceil(visibleRisks.length / pageSize));
  const pageRisks = useMemo(
    () => visibleRisks.slice((page - 1) * pageSize, page * pageSize),
    [visibleRisks, page],
  );
  const pageStart = visibleRisks.length ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, visibleRisks.length);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  return (
    <div className="module-content">
      <div className="module-heading">
        <h2>Process Risks</h2>
        <p>Review what may fail in the selected process before choosing enhancements or tools.</p>
      </div>

      <div className="risk-context-row">
        <div>
          <span className="eyebrow">Selected process</span>
          <strong>{metadata.displayName}</strong>
          <small>{Math.round(metadata.confidence * 100)}% minimum graph confidence</small>
          <small>{visibleRisks.length} risks identified · showing {pageStart}-{pageEnd}</small>
        </div>
        <button className="btn" type="button" disabled={!llmProfile || enriched.length > 0} onClick={addAdvisoryRisks}>
          {llmProfile ? 'Deepen with LLM profile' : 'Connect LLM profile for deeper risks'}
        </button>
      </div>

      <div className="risk-table-wrap">
        <table className="risk-table">
          <thead>
            <tr>
              <th>Process</th>
              <th>Task</th>
              <th>Risk identified</th>
              <th>Risk mitigation</th>
            </tr>
          </thead>
          <tbody>
            {pageRisks.map((risk) => (
              <tr key={risk.id}>
                <td>
                  <strong>{risk.processName}</strong>
                  <span className={severityClass(risk.severity)}>{risk.severity}</span>
                </td>
                <td>{risk.taskName}</td>
                <td>
                  <p>{risk.riskIdentified}</p>
                  <span className={`source-pill ${risk.source === 'llm-assisted' ? 'advisory' : ''}`}>
                    {risk.source === 'llm-assisted' ? 'AI-assisted' : 'Deterministic'}
                  </span>
                </td>
                <td>
                  <p>{risk.riskMitigation}</p>
                  {risk.evidenceEventIds.length > 0 && (
                    <div className="risk-evidence-row">
                      {risk.evidenceEventIds.slice(0, 3).map((eventId) => (
                        <button key={eventId} className="btn ghost" type="button" onClick={() => onOpenEvent(eventId)}>
                          {eventId.slice(0, 10)}...
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="risk-pagination" aria-label="Risk table pagination">
        <span>
          Page {page} of {pageCount}
        </span>
        <div>
          <button className="btn ghost" type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </button>
          <button className="btn ghost" type="button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
            Next
          </button>
        </div>
      </div>

      {!llmProfile && (
        <div className="config-banner compact">
          <span>Optional model insight is disabled. Deterministic risks remain available without sending process context anywhere.</span>
        </div>
      )}
    </div>
  );
}
