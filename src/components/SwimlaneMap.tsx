import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { GraphNode, ProcessGraph } from "../domain/types";
import { failureColor, layoutProcessMap, type LaneKey } from "../lib/mapLayout";

const LANE_COLORS: Record<LaneKey, string> = {
  human: "var(--info)",
  agent: "var(--accent)",
  system: "var(--success)",
  external: "var(--text-muted)",
  "service-account": "var(--warning)",
};

const LANE_LABELS: Record<LaneKey, string> = {
  human: "Human",
  agent: "Agent",
  system: "System",
  external: "External",
  "service-account": "Service acct",
};

const VIEW_H = 460;

interface Props {
  graph: ProcessGraph;
  labelFor: (node: GraphNode) => string;
  onSelectNode: (id: string) => void;
  selectedNodeId: string | null;
}

export function SwimlaneMap({ graph, labelFor, onSelectNode, selectedNodeId }: Props) {
  const layout = useMemo(() => layoutProcessMap(graph), [graph]);
  const wrapRef = useRef<HTMLDivElement>(null);

  const fitScale = () => {
    const vw = wrapRef.current?.clientWidth ?? 900;
    return Math.min(1, (vw - 8) / layout.width, VIEW_H / Math.max(layout.height, 1));
  };
  const [view, setView] = useState(() => ({ scale: 1, tx: 0, ty: 0 }));
  const [initialised, setInitialised] = useState(false);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  // Fit on first measured render.
  if (!initialised && wrapRef.current) {
    const s = fitScale();
    setView({ scale: s, tx: 4, ty: 4 });
    setInitialised(true);
  }

  const fit = () => setView({ scale: fitScale(), tx: 4, ty: 4 });
  const zoomBy = (factor: number) => {
    const vw = wrapRef.current?.clientWidth ?? 900;
    const cx = vw / 2;
    const cy = VIEW_H / 2;
    setView((v) => {
      const scale = Math.min(2.5, Math.max(0.2, v.scale * factor));
      const k = scale / v.scale;
      return { scale, tx: cx - k * (cx - v.tx), ty: cy - k * (cy - v.ty) };
    });
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    const px = rect ? e.clientX - rect.left : 0;
    const py = rect ? e.clientY - rect.top : 0;
    setView((v) => {
      const scale = Math.min(2.5, Math.max(0.2, v.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      const k = scale / v.scale;
      return { scale, tx: px - k * (px - v.tx), ty: py - k * (py - v.ty) };
    });
  };

  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as Element).closest("[data-node]")) return; // let node clicks through
    drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current) return;
    setView((v) => ({ ...v, tx: drag.current!.tx + (e.clientX - drag.current!.x), ty: drag.current!.ty + (e.clientY - drag.current!.y) }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  // Mini-map geometry.
  const miniW = 150;
  const miniScale = miniW / layout.width;
  const miniH = layout.height * miniScale;
  const vw = wrapRef.current?.clientWidth ?? 900;
  const viewRect = {
    x: (-view.tx / view.scale) * miniScale,
    y: (-view.ty / view.scale) * miniScale,
    w: (vw / view.scale) * miniScale,
    h: (VIEW_H / view.scale) * miniScale,
  };

  return (
    <div className="swimlane-map">
      <div className="swimlane-controls">
        <button className="btn ghost" type="button" onClick={() => zoomBy(1.2)} aria-label="Zoom in">+</button>
        <button className="btn ghost" type="button" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">−</button>
        <button className="btn ghost" type="button" onClick={fit}>Fit</button>
        <span className="swimlane-hint">Drag to pan · scroll to zoom · critical path highlighted</span>
      </div>

      <div
        ref={wrapRef}
        className="swimlane-viewport"
        style={{ height: VIEW_H, position: "relative", overflow: "hidden", cursor: drag.current ? "grabbing" : "grab" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <svg width="100%" height={VIEW_H} role="img" aria-label="Process map with actor swimlanes">
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L7,3 L0,6 Z" fill="var(--border-light)" />
            </marker>
            <marker id="arrow-crit" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L7,3 L0,6 Z" fill="var(--accent)" />
            </marker>
          </defs>
          <g transform={`translate(${view.tx},${view.ty}) scale(${view.scale})`}>
            {/* lane bands + labels */}
            {layout.lanes.map((lane) => (
              <g key={lane.key}>
                <rect
                  x={0}
                  y={lane.top}
                  width={layout.width}
                  height={lane.height}
                  fill={LANE_COLORS[lane.key]}
                  opacity={0.05}
                />
                <line x1={0} y1={lane.top} x2={layout.width} y2={lane.top} stroke="var(--border)" strokeWidth={1} />
                <text x={8} y={lane.top + 16} fontSize={11} fontWeight={600} fill={LANE_COLORS[lane.key]} fontFamily="var(--font-sans)">
                  {LANE_LABELS[lane.key]}
                </text>
              </g>
            ))}

            {/* edges */}
            {layout.edges.map((e) => (
              <path
                key={e.id}
                d={e.path}
                fill="none"
                stroke={e.onCriticalPath ? "var(--accent)" : e.selfLoop ? "var(--warning)" : "var(--border-light)"}
                strokeWidth={e.onCriticalPath ? Math.max(2.5, e.strokeWidth) : e.strokeWidth}
                strokeDasharray={e.selfLoop ? "3 3" : undefined}
                markerEnd={e.onCriticalPath ? "url(#arrow-crit)" : "url(#arrow)"}
                opacity={e.onCriticalPath ? 0.95 : 0.55}
              />
            ))}

            {/* nodes */}
            {layout.nodes.map((n) => {
              const gNode = graph.nodes.find((x) => x.id === n.id)!;
              const isSel = selectedNodeId === n.id;
              const label = labelFor(gNode);
              const select = () => onSelectNode(n.id);
              return (
                <g
                  key={n.id}
                  data-node={n.id}
                  transform={`translate(${n.x},${n.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${label}, ${n.frequency} occurrences${n.onCriticalPath ? ", on critical path" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={select}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); select(); }
                  }}
                >
                  <rect
                    width={n.w}
                    height={n.h}
                    rx={6}
                    fill="var(--surface-2)"
                    stroke={isSel ? "var(--accent)" : n.onCriticalPath ? "var(--accent)" : "var(--border)"}
                    strokeWidth={isSel ? 2.5 : n.onCriticalPath ? 1.75 : 1}
                  />
                  <text x={n.w / 2} y={20} fill="var(--text)" fontSize={11} textAnchor="middle" fontFamily="var(--font-sans)" style={{ pointerEvents: "none" }}>
                    {label.length > 20 ? `${label.slice(0, 18)}…` : label}
                  </text>
                  <text x={n.w / 2} y={35} fill="var(--text-muted)" fontSize={9} textAnchor="middle" fontFamily="var(--font-mono)" style={{ pointerEvents: "none" }}>
                    n={n.frequency}{n.failureRate > 0 ? ` · ${Math.round(n.failureRate * 100)}% fail/retry` : ""}
                  </text>
                  <rect x={0} y={n.h - 6} width={n.w} height={6} rx={0} fill={failureColor(n.failureRate)} opacity={0.85} />
                </g>
              );
            })}
          </g>
        </svg>

        {/* mini-map */}
        {layout.width > vw / view.scale && (
          <svg className="swimlane-minimap" width={miniW} height={miniH} viewBox={`0 0 ${miniW} ${miniH}`} aria-hidden="true">
            <rect x={0} y={0} width={miniW} height={miniH} fill="var(--surface)" stroke="var(--border)" />
            {layout.nodes.map((n) => (
              <rect key={n.id} x={n.x * miniScale} y={n.y * miniScale} width={n.w * miniScale} height={n.h * miniScale} fill={n.onCriticalPath ? "var(--accent)" : "var(--border-light)"} />
            ))}
            <rect x={viewRect.x} y={viewRect.y} width={viewRect.w} height={viewRect.h} fill="none" stroke="var(--accent)" strokeWidth={1} />
          </svg>
        )}
      </div>
    </div>
  );
}
