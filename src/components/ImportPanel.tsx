import { useRef } from "react";
import type { ValidationIssue } from "../domain/validation";

interface ImportPanelProps {
  issues: ValidationIssue[];
  importSummary?: string;
  syncing?: boolean;
  onSync: () => void;
  onDemo: () => void;
  onInvalidDemo: () => void;
  onFile: (file: File) => void;
}

export function ImportPanel({
  issues,
  importSummary,
  syncing,
  onSync,
  onDemo,
  onInvalidDemo,
  onFile,
}: ImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="import-panel" aria-labelledby="import-title">
      <div className="import-copy">
        <div>
          <p className="eyebrow">Local process intelligence</p>
          <h1 id="import-title">
            See the work.
            <span>Shape the system.</span>
          </h1>
          <p className="lede">
            Turn human, agent, and system events into an evidence-backed process
            you can inspect, correct, and improve.
          </p>
        </div>
        <div className="button-row">
          <button className="primary" type="button" onClick={onSync} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync with Mnemosync"} <span aria-hidden="true">↗</span>
          </button>
          <button type="button" onClick={onDemo}>
            Explore sample workspace
          </button>
          <button type="button" onClick={() => inputRef.current?.click()}>
            Import JSON
          </button>
          <button className="text-button" type="button" onClick={onInvalidDemo}>
            Test error handling
          </button>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = "";
            }}
          />
        </div>
        <div className="privacy-callout">
          <span className="privacy-icon" aria-hidden="true">⌁</span>
          <div>
            <strong>Private by default</strong>
            <span>
              Your operational data stays in this browser. No external model,
              no silent sharing.
            </span>
          </div>
        </div>
      </div>
      <div className="landing-visual" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="visual-window">
          <div className="visual-window-bar">
            <span />
            <span />
            <span />
            <small>process / post-project</small>
          </div>
          <div className="visual-content">
            <div className="visual-heading">
              <div>
                <small>Process pulse</small>
                <strong>Observed work</strong>
              </div>
              <span>Live</span>
            </div>
            <div className="visual-metrics">
              <div><small>Cases</small><strong>02</strong><i>+100%</i></div>
              <div><small>Variants</small><strong>02</strong><i>observed</i></div>
              <div><small>Handoffs</small><strong>08</strong><i>review</i></div>
            </div>
            <div className="visual-chart">
              <svg viewBox="0 0 520 150" role="presentation">
                <defs>
                  <linearGradient id="landing-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8d6cff" stopOpacity=".48" />
                    <stop offset="100%" stopColor="#8d6cff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 125 C45 118, 54 86, 98 94 S160 126, 202 78 S268 28, 312 58 S374 118, 414 76 S474 34, 520 18 L520 150 L0 150 Z"
                  fill="url(#landing-area)"
                />
                <path
                  d="M0 125 C45 118, 54 86, 98 94 S160 126, 202 78 S268 28, 312 58 S374 118, 414 76 S474 34, 520 18"
                  fill="none"
                  stroke="#9d83ff"
                  strokeWidth="3"
                />
              </svg>
            </div>
            <div className="visual-process">
              <span>Receive</span><b>→</b><span>Extract</span><b>→</b>
              <span className="active">Validate</span><b>→</b><span>Approve</span>
            </div>
          </div>
        </div>
        <div className="floating-card floating-card-one">
          <span>✓</span>
          <div><strong>Evidence linked</strong><small>10 source events</small></div>
        </div>
        <div className="floating-card floating-card-two">
          <strong>50%</strong>
          <small>accepted outcome rate</small>
        </div>
      </div>
      {importSummary ? (
        <p className="status-message" role="status">
          {importSummary}
        </p>
      ) : null}
      {issues.length > 0 ? (
        <div className="error-panel" role="alert">
          <h2>Import blocked · {issues.length} schema issues</h2>
          <p>
            The canonical store was not changed. Fix every event and field shown
            below, then import again.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Field</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue, index) => (
                  <tr key={`${issue.eventId}-${issue.field}-${index}`}>
                    <td><code>{issue.eventId}</code></td>
                    <td><code>{issue.field}</code></td>
                    <td>{issue.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
