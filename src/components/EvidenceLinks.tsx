interface EvidenceLinksProps {
  eventIds: string[];
  onOpenEvent?: (eventId: string) => void;
  /** Spec 006 R5: route the whole record set to the Evidence Log, filtered. */
  onOpenEvidence?: (eventIds: string[], label: string) => void;
  /** Human label shown in the Evidence Log filter banner. */
  evidenceLabel?: string;
}

export function EvidenceLinks({ eventIds, onOpenEvent, onOpenEvidence, evidenceLabel }: EvidenceLinksProps) {
  if (eventIds.length === 0) return <span className="muted">No linked event</span>;
  const unique = [...new Set(eventIds)];
  return (
    <span className="evidence-links" aria-label="Supporting event records">
      {unique.map((eventId) =>
        onOpenEvent ? (
          <button
            className="inline-link"
            key={eventId}
            onClick={() => onOpenEvent(eventId)}
            type="button"
          >
            {eventId}
          </button>
        ) : (
          <code key={eventId}>{eventId}</code>
        ),
      )}
      {onOpenEvidence && (
        <button
          className="inline-link evidence-log-link"
          type="button"
          onClick={() => onOpenEvidence(unique, evidenceLabel ?? "selected records")}
        >
          View {unique.length} in Evidence Log →
        </button>
      )}
    </span>
  );
}
