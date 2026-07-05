import { useState } from "react";
import type {
  GraphEdge,
  GraphNode,
  OverrideRecord,
  PrimitiveRegistry,
  ProcessGraph,
} from "../domain/types";
import { EvidenceLinks } from "./EvidenceLinks";
import { TruthBadge } from "./TruthBadge";

interface NodeEditorProps {
  node: GraphNode;
  allNodes: GraphNode[];
  registry: PrimitiveRegistry;
  onChange: (nodeId: string, patch: Partial<GraphNode>, rationale: string) => void;
  onMerge: (sourceId: string, targetId: string, rationale: string) => void;
  onSplit: (nodeId: string, rationale: string) => void;
}

function NodeEditor({
  node,
  allNodes,
  registry,
  onChange,
  onMerge,
  onSplit,
}: NodeEditorProps) {
  const [rationale, setRationale] = useState(node.overrideRationale ?? "");
  const [mergeTarget, setMergeTarget] = useState("");
  const meanings = registry.entries.filter(
    (entry) =>
      entry.primitiveType === "action" ||
      entry.term.toLowerCase().includes(node.label.toLowerCase().split(" ")[0] ?? ""),
  );

  return (
    <article className="editor-card">
      <div className="title-row">
        <div>
          <code>{node.id}</code>
          <h3>{node.label}</h3>
        </div>
        <TruthBadge state={node.truthState} />
      </div>
      <div className="form-grid">
        <label>
          Activity label
          <input
            value={node.label}
            onChange={(event) =>
              onChange(
                node.id,
                { label: event.target.value, truthState: "overridden" },
                rationale,
              )
            }
          />
        </label>
        <label>
          Accountable owner
          <input
            value={node.owner ?? ""}
            placeholder="Name a role, not a ranking"
            onChange={(event) =>
              onChange(
                node.id,
                { owner: event.target.value, truthState: "overridden" },
                rationale,
              )
            }
          />
        </label>
        <label>
          Authority level
          <select
            value={node.authorityLevel ?? ""}
            onChange={(event) =>
              onChange(
                node.id,
                {
                  authorityLevel: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                  truthState: "overridden",
                },
                rationale,
              )
            }
          >
            <option value="">Not confirmed</option>
            {[1, 2, 3, 4, 5, 6, 7].map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
        <label>
          Governed meaning
          <select
            value={node.primitiveId ?? ""}
            onChange={(event) =>
              onChange(
                node.id,
                { primitiveId: event.target.value || undefined, truthState: "overridden" },
                rationale,
              )
            }
          >
            <option value="">No meaning attached</option>
            {(meanings.length ? meanings : registry.entries).map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.term} · {entry.meaningStatus} · v{entry.version}
              </option>
            ))}
          </select>
        </label>
      </div>
      {node.primitiveId ? (
        <div className="definition-box">
          {registry.entries
            .filter((entry) => entry.id === node.primitiveId)
            .map((entry) => (
              <div key={entry.id}>
                <strong>{entry.term} · {entry.meaningStatus}</strong>
                <p>{entry.definition}</p>
                <small>Source: {entry.sourceRef}</small>
              </div>
            ))}
        </div>
      ) : null}
      <label>
        Override rationale
        <textarea
          value={rationale}
          placeholder="Why is this confirmation or correction accountable?"
          onChange={(event) => setRationale(event.target.value)}
          rows={2}
        />
      </label>
      <div className="button-row">
        <button
          className="primary"
          type="button"
          disabled={!rationale.trim()}
          onClick={() =>
            onChange(
              node.id,
              { status: "confirmed", truthState: "user-confirmed", overrideRationale: rationale },
              rationale,
            )
          }
        >
          Confirm step
        </button>
        <button
          className="danger"
          type="button"
          disabled={!rationale.trim()}
          onClick={() =>
            onChange(
              node.id,
              { status: "rejected", truthState: "overridden", overrideRationale: rationale },
              rationale,
            )
          }
        >
          Reject
        </button>
        <button
          type="button"
          disabled={!rationale.trim()}
          onClick={() => onSplit(node.id, rationale)}
        >
          Split proposal
        </button>
      </div>
      <div className="merge-row">
        <label>
          Merge into
          <select value={mergeTarget} onChange={(event) => setMergeTarget(event.target.value)}>
            <option value="">Choose target</option>
            {allNodes
              .filter((candidate) => candidate.id !== node.id && candidate.status !== "rejected")
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
              ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!mergeTarget || !rationale.trim()}
          onClick={() => onMerge(node.id, mergeTarget, rationale)}
        >
          Merge with rationale
        </button>
      </div>
      <p className="microcopy">
        Source events remain immutable. <EvidenceLinks eventIds={node.eventIds} />
      </p>
    </article>
  );
}

interface ConfirmViewProps {
  graph: ProcessGraph;
  inferredGraph: ProcessGraph;
  registry: PrimitiveRegistry;
  overrides: OverrideRecord[];
  canUndo: boolean;
  onNodeChange: (nodeId: string, patch: Partial<GraphNode>, rationale: string) => void;
  onEdgeChange: (edgeId: string, patch: Partial<GraphEdge>, rationale: string) => void;
  onMerge: (sourceId: string, targetId: string, rationale: string) => void;
  onSplit: (nodeId: string, rationale: string) => void;
  onUndo: () => void;
}

export function ConfirmView({
  graph,
  inferredGraph,
  registry,
  overrides,
  canUndo,
  onNodeChange,
  onEdgeChange,
  onMerge,
  onSplit,
  onUndo,
}: ConfirmViewProps) {
  return (
    <section aria-labelledby="confirm-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Human confirmation gate</p>
          <h2 id="confirm-title">Correct the proposal</h2>
        </div>
        <button type="button" onClick={onUndo} disabled={!canUndo}>
          Undo last change
        </button>
      </div>
      <div className="notice">
        <strong>Inference is never silently promoted.</strong> Confirmations,
        corrections, merges, splits, and rejections require a rationale and
        preserve the original {inferredGraph.nodes.length}-node candidate graph.
      </div>
      <div className="editor-grid">
        {graph.nodes.map((node) => (
          <NodeEditor
            key={node.id}
            node={node}
            allNodes={graph.nodes}
            registry={registry}
            onChange={onNodeChange}
            onMerge={onMerge}
            onSplit={onSplit}
          />
        ))}
      </div>
      <div className="panel">
        <h3>Transition decisions</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Transition</th>
                <th>Evidence</th>
                <th>Truth</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {graph.edges.map((edge) => (
                <tr key={edge.id}>
                  <td>{edge.from} → {edge.to}</td>
                  <td>{edge.frequency} observations</td>
                  <td><TruthBadge state={edge.truthState} /></td>
                  <td>
                    <div className="button-row compact">
                      <button
                        type="button"
                        onClick={() =>
                          onEdgeChange(
                            edge.id,
                            { status: "confirmed", truthState: "user-confirmed" },
                            "Confirmed from observed succession.",
                          )
                        }
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onEdgeChange(
                            edge.id,
                            { status: "rejected", truthState: "overridden" },
                            "Rejected as a canonical process transition.",
                          )
                        }
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <details className="panel">
        <summary>Override ledger · {overrides.length} records</summary>
        <ul className="record-list">
          {overrides.map((override) => (
            <li key={override.id}>
              <strong>{override.action} · {override.targetId}</strong>
              <span>{override.rationale}</span>
              <small>{override.truthState} · {override.createdAt}</small>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
