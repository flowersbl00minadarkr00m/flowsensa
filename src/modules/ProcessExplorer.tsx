import { useEffect, useState } from 'react';
import { ConfirmView } from '../components/ConfirmView';
import type {
  GraphEdge,
  GraphNode,
  OverrideRecord,
  PrimitiveRegistry,
  ProcessGraph,
  ProcessMetadata,
  TaskInsight,
  WorkEvent,
} from '../domain/types';
import { taskDisplayName } from '../domain/processMetadata';

interface Props {
  graph?: ProcessGraph;
  inferredGraph?: ProcessGraph;
  events?: WorkEvent[];
  registry?: PrimitiveRegistry;
  processMetadata?: ProcessMetadata;
  taskInsights: TaskInsight[];
  overrides: OverrideRecord[];
  canUndo: boolean;
  onProcessRename: (name: string) => void;
  onTaskRename: (nodeId: string, name: string) => void;
  onExportMap: (format: 'JSON' | 'Markdown') => void;
  onNodeChange: (id: string, patch: Partial<GraphNode>, rationale: string) => void;
  onEdgeChange: (id: string, patch: Partial<GraphEdge>, rationale: string) => void;
  onMerge: (src: string, tgt: string, rationale: string) => void;
  onSplit: (id: string, rationale: string) => void;
  onUndo: () => void;
  onOpenEvent: (id: string) => void;
}

const ACTOR_TYPE_COLORS: Record<string, string> = {
  human: 'var(--info)',
  agent: 'var(--accent)',
  system: 'var(--success)',
  external: 'var(--text-muted)',
  'service-account': 'var(--warning)',
};

function formatDuration(ms?: number): string {
  if (!ms) return 'not observed';
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

function SVGGraph({
  graph,
  labelFor,
  onSelectNode,
  selectedNodeId,
}: {
  graph: ProcessGraph;
  labelFor: (node: GraphNode) => string;
  onSelectNode: (id: string) => void;
  selectedNodeId: string | null;
}) {
  const NODE_W = 160;
  const NODE_H = 64;
  const COL_GAP = NODE_W + 60;
  const ROW_GAP = NODE_H + 40;
  const posMap = new Map<string, { x: number; y: number }>();
  const MAX_PER_ROW = 5;
  const sorted = [...graph.nodes];
  sorted.forEach((node, i) => {
    const col = i % MAX_PER_ROW;
    const row = Math.floor(i / MAX_PER_ROW);
    posMap.set(node.id, { x: col * COL_GAP + 30, y: row * ROW_GAP + 20 });
  });

  const totalRows = Math.ceil(sorted.length / MAX_PER_ROW);
  const colsUsed = Math.min(sorted.length, MAX_PER_ROW);
  const svgW = Math.max(colsUsed * COL_GAP + 60, 260);
  const svgH = Math.max(totalRows * ROW_GAP + 40, 160);

  return (
    <div className="process-graph-scroll">
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} aria-label="Process graph" role="img">
        {graph.edges.map(edge => {
          const from = posMap.get(edge.from);
          const to = posMap.get(edge.to);
          if (!from || !to) return null;
          const x1 = from.x + NODE_W;
          const y1 = from.y + NODE_H / 2;
          const x2 = to.x;
          const y2 = to.y + NODE_H / 2;
          const cx = (x1 + x2) / 2;
          return (
            <path
              key={edge.id}
              d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke="var(--border-light)"
              strokeWidth={1.5}
            />
          );
        })}
        {graph.nodes.map(node => {
          const pos = posMap.get(node.id);
          if (!pos) return null;
          const isSelected = selectedNodeId === node.id;
          const actorColor = node.actorTypes[0] ? (ACTOR_TYPE_COLORS[node.actorTypes[0]] ?? 'var(--text-muted)') : 'var(--text-muted)';
          const label = labelFor(node);
          const handleSelect = () => onSelectNode(node.id);
          return (
            <g
              key={node.id}
              className={`candidate-node${isSelected ? ' selected' : ''}`}
              transform={`translate(${pos.x},${pos.y})`}
              role="button"
              tabIndex={0}
              aria-label={`${label}, ${node.frequency} occurrences`}
              onClick={handleSelect}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') handleSelect();
              }}
              onTouchEnd={handleSelect}
            >
              <rect width={NODE_W} height={NODE_H} rx={6} fill="var(--surface-2)" stroke={isSelected ? 'var(--accent)' : 'var(--border)'} strokeWidth={isSelected ? 2 : 1} />
              <text x={NODE_W / 2} y={22} fill="var(--text)" fontSize={11} textAnchor="middle" fontFamily="var(--font-sans)" style={{ pointerEvents: 'none' }}>
                {label.length > 18 ? `${label.slice(0, 16)}...` : label}
              </text>
              <text x={NODE_W / 2} y={38} fill="var(--text-muted)" fontSize={9} textAnchor="middle" fontFamily="var(--font-mono)" style={{ pointerEvents: 'none' }}>
                n={node.frequency}
              </text>
              <rect x={0} y={46} width={NODE_W} height={6} rx={0} fill={actorColor} opacity={0.7} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ProcessExplorer({
  graph,
  inferredGraph,
  events = [],
  registry,
  processMetadata,
  taskInsights,
  overrides,
  canUndo,
  onProcessRename,
  onTaskRename,
  onExportMap,
  onNodeChange,
  onEdgeChange,
  onMerge,
  onSplit,
  onUndo,
  onOpenEvent,
}: Props) {
  const [tab, setTab] = useState<'graph' | 'confirm'>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [processNameDraft, setProcessNameDraft] = useState(processMetadata?.displayName ?? '');
  const [taskNameDraft, setTaskNameDraft] = useState('');

  const selectedNode = graph?.nodes.find(n => n.id === selectedNodeId);
  const selectedInsight = selectedNode ? taskInsights.find((insight) => insight.nodeId === selectedNode.id) : undefined;
  const selectedEvents = selectedNode ? events.filter((event) => selectedNode.eventIds.includes(event.eventId)) : [];

  useEffect(() => {
    setProcessNameDraft(processMetadata?.displayName ?? '');
  }, [processMetadata?.displayName]);

  useEffect(() => {
    if (!selectedNode) {
      setTaskNameDraft('');
      return;
    }
    setTaskNameDraft(taskDisplayName(processMetadata, selectedNode.id, selectedNode.label));
  }, [processMetadata, selectedNode]);

  const labelFor = (node: GraphNode) => taskDisplayName(processMetadata, node.id, node.label);

  return (
    <div className="module-content process-workspace">
      <div className="tab-bar">
        <button className={`tab-btn${tab === 'graph' ? ' active' : ''}`} type="button" onClick={() => setTab('graph')}>
          Process Map
        </button>
        <button className={`tab-btn${tab === 'confirm' ? ' active' : ''}`} type="button" onClick={() => setTab('confirm')}>
          Gate Checks
        </button>
      </div>

      <div className="process-toolbar">
        <label>
          Process
          <select value={processMetadata?.id ?? 'process-main'} disabled={!processMetadata} onChange={() => undefined}>
            <option value={processMetadata?.id ?? 'process-main'}>{processMetadata?.displayName ?? 'Selected process'}</option>
          </select>
        </label>
        <label className="rename-field">
          Rename process
          <input value={processNameDraft} onChange={(event) => setProcessNameDraft(event.target.value)} placeholder="Process display name" />
        </label>
        <button className="btn" type="button" disabled={!processNameDraft.trim()} onClick={() => onProcessRename(processNameDraft)}>
          Save name
        </button>
        <button className="btn ghost" type="button" onClick={() => onExportMap('Markdown')} disabled={!graph}>
          Export map
        </button>
        <button className="btn ghost" type="button" onClick={() => onExportMap('JSON')} disabled={!graph}>
          Export JSON
        </button>
      </div>

      <div className="process-workspace-body">
        {tab === 'graph' && (
          <>
            <div className="module-heading compact">
              <h2>Process Map</h2>
              <p>
                {graph ? `${graph.nodes.length} tasks, ${graph.edges.length} transitions, ${Math.round((processMetadata?.confidence ?? 0) * 100)}% minimum confidence.` : 'Import events or a BPMN file to build the map.'}
              </p>
            </div>

            {graph && graph.nodes.length > 0 && (
              <div className="map-proof-strip" role="status">
                <strong>Edits Enabled</strong>
                <span>Task labels can be renamed here; original source labels remain in provenance and exports.</span>
              </div>
            )}

            <div className="process-map-layout">
              <div className="process-map-card">
                {graph && graph.nodes.length > 0 ? (
                  <SVGGraph graph={graph} labelFor={labelFor} onSelectNode={setSelectedNodeId} selectedNodeId={selectedNodeId} />
                ) : (
                  <div className="empty-state"><p>No process data available. Import events first.</p></div>
                )}
                <div className="actor-legend">
                  {Object.entries(ACTOR_TYPE_COLORS).map(([k, c]) => (
                    <span key={k}><i style={{ background: c }} />{k}</span>
                  ))}
                </div>
              </div>

              {selectedNode && (
                <aside className="node-detail-panel">
                  <div className="detail-header">
                    <div>
                      <span className="eyebrow">Task details</span>
                      <strong>{labelFor(selectedNode)}</strong>
                    </div>
                    <button className="btn ghost" type="button" onClick={() => setSelectedNodeId(null)} aria-label="Close node detail">x</button>
                  </div>

                  <label className="detail-rename">
                    Rename task
                    <div>
                      <input value={taskNameDraft} onChange={(event) => setTaskNameDraft(event.target.value)} />
                      <button className="btn" type="button" onClick={() => onTaskRename(selectedNode.id, taskNameDraft)}>Save</button>
                    </div>
                  </label>

                  <dl className="insight-grid">
                    <div><dt>Original label</dt><dd>{processMetadata?.originalTaskLabels[selectedNode.id] ?? selectedNode.label}</dd></div>
                    <div><dt>Events</dt><dd>{selectedInsight?.eventCount ?? selectedNode.frequency}</dd></div>
                    <div><dt>Cases</dt><dd>{selectedInsight?.caseCount ?? '-'}</dd></div>
                    <div><dt>Median duration</dt><dd>{formatDuration(selectedInsight?.medianDurationMs)}</dd></div>
                    <div><dt>Exceptions</dt><dd>{selectedInsight?.exceptionCount ?? selectedNode.exceptions}</dd></div>
                    <div><dt>Retries</dt><dd>{selectedInsight?.retryCount ?? selectedNode.repeats}</dd></div>
                    <div><dt>Actors</dt><dd>{selectedInsight?.actorMix.join(', ') || selectedNode.actorIds.join(', ') || '-'}</dd></div>
                    <div><dt>Paths</dt><dd>{selectedInsight ? `${selectedInsight.upstream.length} upstream / ${selectedInsight.downstream.length} downstream` : '-'}</dd></div>
                  </dl>

                  {selectedInsight && selectedInsight.insufficientTelemetry.length > 0 && (
                    <div className="insufficient-telemetry">
                      <strong>Insufficient telemetry</strong>
                      <ul>{selectedInsight.insufficientTelemetry.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  )}

                  {selectedNode.eventIds.length > 0 && (
                    <div className="evidence-block">
                      <span>Source events ({selectedNode.eventIds.length})</span>
                      <div className="event-chip-row">
                        {selectedNode.eventIds.slice(0, 5).map(eid => (
                          <button key={eid} className="btn ghost" type="button" onClick={() => onOpenEvent(eid)}>{eid.slice(0, 12)}...</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEvents.length > 0 && (
                    <div className="selected-event-summary">
                      <p>Evidence preview</p>
                      {selectedEvents.slice(0, 3).map((event) => (
                        <button key={event.eventId} type="button" onClick={() => onOpenEvent(event.eventId)}>
                          <strong>{event.activity.label}</strong>
                          <span>{event.actor.type} - {event.result.status} - {event.caseId}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </aside>
              )}
            </div>
          </>
        )}

        {tab === 'confirm' && graph && inferredGraph && registry && (
          <ConfirmView
            graph={graph}
            inferredGraph={inferredGraph}
            registry={registry}
            overrides={overrides}
            canUndo={canUndo}
            onNodeChange={onNodeChange}
            onEdgeChange={onEdgeChange}
            onMerge={onMerge}
            onSplit={onSplit}
            onUndo={onUndo}
          />
        )}

        {tab === 'confirm' && (!graph || !inferredGraph || !registry) && (
          <div className="empty-state"><p>Import process data first to confirm and edit.</p></div>
        )}
      </div>
    </div>
  );
}
