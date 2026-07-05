import type { PrimitiveRegistry } from "../domain/types";

interface RegistryViewProps {
  registry: PrimitiveRegistry;
}

export function RegistryView({ registry }: RegistryViewProps) {
  const contestedTerms = new Set(
    registry.entries
      .filter((entry) => entry.meaningStatus === "contested")
      .map((entry) => entry.term),
  );
  return (
    <section aria-labelledby="registry-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Governed semantics · v{registry.registryVersion}</p>
          <h2 id="registry-title">Work primitive registry</h2>
        </div>
        <p>Shared field names do not guarantee shared meaning.</p>
      </div>
      {contestedTerms.size > 0 ? (
        <div className="notice warning">
          Semantic conflict detected for: {[...contestedTerms].join(", ")}.
          Contested meanings cannot silently satisfy official controls.
        </div>
      ) : null}
      <div className="registry-grid">
        {registry.entries.map((entry) => (
          <article className="panel" key={entry.id}>
            <div className="title-row">
              <div>
                <p className="eyebrow">{entry.primitiveType}</p>
                <h3>{entry.term}</h3>
              </div>
              <span className={`badge meaning-${entry.meaningStatus}`}>
                {entry.meaningStatus}
              </span>
            </div>
            <p>{entry.definition}</p>
            <dl className="definition-list">
              <div><dt>Scope</dt><dd>{entry.scope}</dd></div>
              <div><dt>Owner</dt><dd>{entry.owner}</dd></div>
              <div><dt>Version</dt><dd>{entry.version}</dd></div>
              <div><dt>Source</dt><dd>{entry.sourceRef}</dd></div>
            </dl>
            {entry.validationRules?.length ? (
              <>
                <h4>Validation rule</h4>
                <ul>
                  {entry.validationRules.map((rule) => <li key={rule}>{rule}</li>)}
                </ul>
              </>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
