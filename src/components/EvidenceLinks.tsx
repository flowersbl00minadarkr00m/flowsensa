interface EvidenceLinksProps {
  eventIds: string[];
  onOpenEvent?: (eventId: string) => void;
}

export function EvidenceLinks({ eventIds, onOpenEvent }: EvidenceLinksProps) {
  if (eventIds.length === 0) return <span className="muted">No linked event</span>;
  return (
    <span className="evidence-links" aria-label="Supporting event records">
      {[...new Set(eventIds)].map((eventId) =>
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
    </span>
  );
}
