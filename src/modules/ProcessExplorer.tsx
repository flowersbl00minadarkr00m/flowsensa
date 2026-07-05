import { useState } from 'react';
import { ConfirmView } from '../components/ConfirmView';
import type { GraphEdge, GraphNode, OverrideRecord, PrimitiveRegistry, ProcessGraph, WorkEvent } from '../domain/types';

interface Props {
  graph?: ProcessGraph;
  inferredGraph?: ProcessGraph;
  events?: WorkEvent[];
  registry?: PrimitiveRegistry;
  overrides: OverrideRecord[];
  canUndo: boolean;
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

function SVGGraph({
  graph,
  onSelectNode,
  selectedNodeId,
}: {
  graph: ProcessGraph;
  onSelectNode: (id: string) => void;
  selectedNodeId: string | null;
}) {
  const NODE_W = 144;
  const NODE_H = 56;
  const COL_GAP = 200;
  const ROW_GAP = 80;

  // Simple topological sort
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of graph.edges) {
    if (inDegree.has(e.to)) inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
    adj.get(e.from)?.push(e.to);
  }

  const queue = graph.nodes.filter(n => (inDegree.get(n.id) ?? 0) === 0).map(n => n.id);
  const levelMap = new Map<string, number>();
  let processed = [...queue];
  while (processed.length > 0) {
    const next: string[] = [];
    for (const id of processed) {
      const neighbors = adj.get(id) ?? [];
      for (const nb of neighbors) {
        const curr = inDegree.get(nb) ?? 0;
        inDegree.set(nb, curr - 1);
        if ((inDegree.get(nb) ?? 0) <= 0 && !levelMap.has(nb)) {
          const maxLevel = Math.max(...graph.edges.filter(e => e.to === nb).map(e => (levelMap.get(e.from) ?? 0) + 1), 0);
          levelMap.set(nb, maxLevel);
          next.push(nb);
        }
      }
    }
    processed = next;
  }
  // Any unplaced nodes at level 0
  for (const n of graph.nodes) {
    if (!levelMap.has(n.id)) levelMap.set(n.id, 0);
  }

  const cols = new Map<number, string[]>();
  for (const [id, level] of levelMap) {
    const arr = cols.get(level) ?? [];
    arr.push(id);
    cols.set(level, arr);
  }

  const posMap = new Map<string, { x: number; y: number }>();
  for (const [col, ids] of cols) {
    ids.forEach((id, row) => {
      posMap.set(id, { x: col * COL_GAP + 20, y: row * ROW_GAP + 20 });
    });
  }

  const maxCol = cols.size > 0 ? Math.max(...cols.keys()) : 0;
  const maxRow = cols.size > 0 ? Math.max(...[...cols.values()].map(a => a.length)) : 1;
  const svgW = (maxCol + 1) * COL_GAP + NODE_W + 40;
  const svgH = maxRow * ROW_GAP + NODE_H + 40;

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '400px', minWidth: '800px' }}>
      <svg
        width={svgW}
        height={svgH}
        aria-label="Process graph"
        role="img"
        style={{ display: 'block' }}
      >
        {/* Edges */}
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
        {/* Nodes */}
        {graph.nodes.map(node => {
          const pos = posMap.get(node.id);
          if (!pos) return null;
          const isSelected = selectedNodeId === node.id;
          const actorColor = node.actorTypes[0] ? (ACTOR_TYPE_COLORS[node.actorTypes[0]] ?? 'var(--text-muted)') : 'var(--text-muted)';
          const handleSelect = () => onSelectNode(node.id);
          return (
            <g
              key={node.id}
              className={`candidate-node${isSelected ? ' selected' : ''}`}
              transform={`translate(${pos.x},${pos.y})`}
              role="button"
              tabIndex={0}
              aria-label={`${node.label}, ${node.frequency} occurrences`}
              onClick={handleSelect}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') handleSelect();
              }}
              onTouchEnd={handleSelect}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill="var(--surface-2)"
                stroke={isSelected ? 'var(--accent)' : 'var(--border)'}
                strokeWidth={isSelected ? 2 : 1}
              />
              <text
                x={NODE_W / 2}
                y={22}
                fill="var(--text)"
                fontSize={11}
                textAnchor="middle"
                fontFamily="var(--font-sans)"
                style={{ pointerEvents: 'none' }}
              >
                {node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label}
              </text>
              <text
                x={NODE_W / 2}
                y={38}
                fill="var(--text-muted)"
                fontSize={9}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                style={{ pointerEvents: 'none' }}
              >
                ×{node.frequency}
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
  events: _events,
  registry,
  overrides,
  canUndo,
  onNodeChange,
  onEdgeChange,
  onMerge,
  onSplit,
  onUndo,
  onOpenEvent,
}: Props) {
  const [tab, setTab] = useState<'graph' | 'confirm'>('graph');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = graph?.nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="module-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="tab-bar">
        <button
          className={`tab-btn${tab === 'graph' ? ' active' : ''}`}
          type="button"
          onClick={() => setTab('graph')}
        >
          Graph View
        </button>
        <button
          className={`tab-btn${tab === 'confirm' ? ' active' : ''}`}
          type="button"
          onClick={() => setTab('confirm')}
        >
          Confirm &amp; Edit
        </button>
      </div>

      <div style={{ flex: 1, padding: '1.5rem', overflow: 'auto', background: 'var(--bg)' }}>
        {tab === 'graph' && (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <h2 style={{ color: 'var(--text)', margin: '0 0 0.3rem', fontSize: '1.4rem' }}>
                Process Graph
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                {graph ? `${graph.nodes.length} nodes · ${graph.edges.length} edges · click node to inspect` : 'No process data. Import events to build the graph.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
                {graph && graph.nodes.length > 0 ? (
                  <SVGGraph
                    graph={graph}
                    onSelectNode={setSelectedNodeId}
                    selectedNodeId={selectedNodeId}
                  />
                ) : (
                  <div className="empty-state">
                    <p>No process data available. Import events first.</p>
                  </div>
                )}
                {/* Legend */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {Object.entries(ACTOR_TYPE_COLORS).map(([k, c]) => (
                    <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              {/* Node detail panel */}
              {selectedNode && (
                <div style={{
                  width: '280px',
                  flexShrink: 0,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1rem',
                  fontSize: '0.82rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <strong style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{selectedNode.label}</strong>
                    <button
                      className="btn ghost"
                      style={{ padding: '0.1rem 0.4rem', fontSize: '0.75rem' }}
                      type="button"
                      onClick={() => setSelectedNodeId(null)}
                      aria-label="Close node detail"
                    >
                      ✕
                    </button>
                  </div>
                  <dl style={{ display: 'grid', gap: '0.4rem', margin: 0 }}>
                    {[
                      ['Type', selectedNode.activityType],
                      ['Frequency', String(selectedNode.frequency)],
                      ['Avg Duration', selectedNode.totalDurationMs && selectedNode.frequency
                        ? `${Math.round(selectedNode.totalDurationMs / selectedNode.frequency / 1000)}s`
                        : '—'],
                      ['Actors', selectedNode.actorIds.join(', ') || '—'],
                      ['Truth', selectedNode.truthState],
                      ['Status', selectedNode.status],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.3rem' }}>
                        <dt style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>{label}</dt>
                        <dd style={{ margin: 0, color: 'var(--text)', wordBreak: 'break-all' }}>{val}</dd>
                      </div>
                    ))}
                  </dl>
                  {selectedNode.eventIds.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: '0 0 0.4rem' }}>
                        Source events ({selectedNode.eventIds.length}):
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {selectedNode.eventIds.slice(0, 5).map(eid => (
                          <button
                            key={eid}
                            className="btn ghost"
                            style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--info)' }}
                            type="button"
                            onClick={() => onOpenEvent(eid)}
                          >
                            {eid.slice(0, 12)}…
                          </button>
                        ))}
                        {selectedNode.eventIds.length > 5 && (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', alignSelf: 'center' }}>
                            +{selectedNode.eventIds.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
          <div className="empty-state">
            <p>Import process data first to confirm and edit.</p>
          </div>
        )}
      </div>
    </div>
  );
}
