interface ExportViewProps {
  preview: string;
  previewType: "JSON" | "Markdown" | "Mermaid";
  roundTripValid: boolean;
  onPreview: (type: "JSON" | "Markdown" | "Mermaid") => void;
  onDownload: (type: "JSON" | "Markdown" | "Mermaid") => void;
}

export function ExportView({
  preview,
  previewType,
  roundTripValid,
  onPreview,
  onDownload,
}: ExportViewProps) {
  return (
    <section aria-labelledby="export-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Portable evidence</p>
          <h2 id="export-title">Export the confirmed process</h2>
        </div>
        <p>Versioned, inspectable, and independent of this interface.</p>
      </div>
      <div className={`notice ${roundTripValid ? "success" : "warning"}`} role="status">
        <strong>{roundTripValid ? "JSON round trip verified." : "Round trip failed."}</strong>{" "}
        Schema version, provenance, truth state, recommendations, and overrides are
        present in the export.
      </div>
      <div className="export-grid">
        {(["JSON", "Markdown", "Mermaid"] as const).map((type) => (
          <article className="panel" key={type}>
            <p className="eyebrow">Version 1.0.0</p>
            <h3>{type}</h3>
            <p>
              {type === "JSON"
                ? "Canonical machine-readable graph, evidence, recommendations, and override ledger."
                : type === "Markdown"
                  ? "Human-readable process brief with automation recommendations."
                  : "Portable flowchart of confirmed nodes, transitions, counts, and truth states."}
            </p>
            <div className="button-row">
              <button type="button" onClick={() => onPreview(type)}>Preview</button>
              <button className="primary" type="button" onClick={() => onDownload(type)}>
                Download
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="panel">
        <h3>{previewType} preview</h3>
        <pre className="export-preview" tabIndex={0}>{preview}</pre>
      </div>
    </section>
  );
}
