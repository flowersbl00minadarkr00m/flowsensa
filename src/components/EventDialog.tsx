import { useEffect, useRef } from "react";
import type { WorkEvent } from "../domain/types";
import { TruthBadge } from "./TruthBadge";

interface EventDialogProps {
  event?: WorkEvent;
  onClose: () => void;
}

export function EventDialog({ event, onClose }: EventDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (event && dialog && !dialog.open) dialog.showModal();
    if (!event && dialog?.open) dialog.close();
  }, [event]);

  return (
    <dialog
      ref={dialogRef}
      className="event-dialog"
      onClose={onClose}
      onCancel={onClose}
    >
      {event ? (
        <>
          <div className="title-row">
            <div>
              <p className="eyebrow">{event.caseId}</p>
              <h2>{event.activity.label}</h2>
            </div>
            <button type="button" onClick={() => dialogRef.current?.close()}>
              Close
            </button>
          </div>
          <dl className="definition-list">
            <div><dt>Event</dt><dd><code>{event.eventId}</code></dd></div>
            <div><dt>Time</dt><dd>{event.timestamp}</dd></div>
            <div><dt>Actor</dt><dd>{event.actor.label} - {event.actor.type}</dd></div>
            {event.system ? (
              <div>
                <dt>System</dt>
                <dd>
                  {event.system.label}
                  {event.system.tool ? ` - ${event.system.tool}` : ""}
                  {event.system.model ? ` - ${event.system.model}` : ""}
                </dd>
              </div>
            ) : null}
            {event.durationMs !== undefined ? (
              <div><dt>Duration</dt><dd>{Math.round(event.durationMs / 1000)}s</dd></div>
            ) : null}
            <div><dt>Result</dt><dd>{event.result.status}</dd></div>
            <div><dt>Truth</dt><dd><TruthBadge state={event.truthState} /></dd></div>
            <div><dt>Source</dt><dd>{event.provenance.sourceRef}</dd></div>
          </dl>
          {event.resources?.length ? (
            <>
              <h3>Resources</h3>
              <ul>
                {event.resources.map((resource) => (
                  <li key={`${resource.kind}-${resource.sourceRef}`}>
                    {resource.kind}: {resource.value === null ? "unknown" : resource.value} {resource.unit} - {resource.measurementClass}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {event.evidence?.length ? (
            <>
              <h3>Evidence</h3>
              <ul>
                {event.evidence.map((evidence) => (
                  <li key={evidence.id}>{evidence.label ?? evidence.id} - {evidence.sourceRef}</li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : null}
    </dialog>
  );
}
