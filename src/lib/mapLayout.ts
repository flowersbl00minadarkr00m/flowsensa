/**
 * Swimlane process-map layout (spec 006 R3, decision TD-002).
 *
 * dagre supplies the horizontal rank (process order); we discard its y and
 * place each node in its actor's swimlane instead. Input is sorted by id so
 * the layout is deterministic for a given graph (NFR-2) — the evidence-first
 * posture requires that identical telemetry always draws the same map.
 *
 * This module is pure geometry: no DOM, no domain mutation, fully testable.
 */
import dagre from "dagre";
import type { GraphEdge, GraphNode, ProcessGraph } from "../domain/types";

/** Fixed lane order; only lanes with at least one node are rendered. */
export const LANE_ORDER = ["human", "agent", "system", "external", "service-account"] as const;
export type LaneKey = (typeof LANE_ORDER)[number];

export const NODE_W = 150;
export const NODE_H = 52;
const COL_STEP = NODE_W + 70;
const ROW_STEP = NODE_H + 22;
const LANE_PAD_Y = 20;
const LANE_LABEL_W = 96;

export interface LaidOutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lane: LaneKey;
  /** (exceptions + repeats) / frequency, clamped 0..1. */
  failureRate: number;
  frequency: number;
  onCriticalPath: boolean;
}

export interface LaidOutEdge {
  id: string;
  from: string;
  to: string;
  path: string;
  strokeWidth: number;
  frequency: number;
  onCriticalPath: boolean;
  selfLoop: boolean;
}

export interface LaidOutLane {
  key: LaneKey;
  top: number;
  height: number;
}

export interface MapLayout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  lanes: LaidOutLane[];
  width: number;
  height: number;
}

function laneOf(node: GraphNode): LaneKey {
  const primary = node.actorTypes.find((t): t is LaneKey =>
    (LANE_ORDER as readonly string[]).includes(t),
  );
  return primary ?? "system";
}

function failureRate(node: GraphNode): number {
  if (node.frequency <= 0) return 0;
  return Math.min(1, (node.exceptions + node.repeats) / node.frequency);
}

function avgDurationMs(node: GraphNode): number {
  return node.frequency > 0 ? node.totalDurationMs / node.frequency : 0;
}

/**
 * Longest path by summed average node duration, cycle-safe. Back-edges (into a
 * node already on the current DFS stack — i.e. retry/rework loops) are skipped
 * so the "critical path" always reads as a forward flow. Deterministic:
 * successors are visited in sorted id order and ties break on node id.
 */
interface CriticalPath {
  nodes: Set<string>;
  /** Directed "from->to" pairs actually traversed, so back-edges between two
   *  critical nodes are not mistaken for critical edges. */
  edges: Set<string>;
}

function criticalPath(nodes: GraphNode[], edges: GraphEdge[]): CriticalPath {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of [...edges].sort((a, b) => a.to.localeCompare(b.to))) {
    if (e.from === e.to) continue;
    adj.get(e.from)?.push(e.to);
  }
  const durById = new Map(nodes.map((n) => [n.id, avgDurationMs(n)]));
  const bestCost = new Map<string, number>();
  const bestNext = new Map<string, string | null>();
  const onStack = new Set<string>();

  function dfs(id: string): number {
    if (bestCost.has(id)) return bestCost.get(id)!;
    onStack.add(id);
    const self = durById.get(id) ?? 0;
    let best = self;
    let next: string | null = null;
    for (const to of adj.get(id) ?? []) {
      if (onStack.has(to)) continue; // back-edge: skip the cycle
      const cost = self + dfs(to);
      if (cost > best || (cost === best && next !== null && to < next)) {
        best = cost;
        next = to;
      }
    }
    onStack.delete(id);
    bestCost.set(id, best);
    bestNext.set(id, next);
    return best;
  }

  const sortedIds = nodes.map((n) => n.id).sort();
  for (const id of sortedIds) dfs(id);

  // Start the path at the highest-cost source node (deterministic tiebreak).
  let start: string | null = null;
  let startCost = -1;
  for (const id of sortedIds) {
    const c = bestCost.get(id) ?? 0;
    if (c > startCost) {
      startCost = c;
      start = id;
    }
  }
  const pathNodes = new Set<string>();
  const pathEdges = new Set<string>();
  let cur = start;
  while (cur) {
    pathNodes.add(cur);
    const next = bestNext.get(cur) ?? null;
    if (next) pathEdges.add(`${cur}->${next}`);
    cur = next;
  }
  return { nodes: pathNodes, edges: pathEdges };
}

export function layoutProcessMap(graph: ProcessGraph): MapLayout {
  const nodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const edges = [...graph.edges].sort((a, b) => a.id.localeCompare(b.id));

  // 1. dagre for horizontal rank only.
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 24, ranksep: 60 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of edges) if (e.from !== e.to) g.setEdge(e.from, e.to);
  dagre.layout(g);

  // 2. Quantize dagre x into columns.
  const rawX = new Map(nodes.map((n) => [n.id, g.node(n.id)?.x ?? 0]));
  const uniqueX = [...new Set(rawX.values())].sort((a, b) => a - b);
  const colIndex = new Map(uniqueX.map((x, i) => [x, i]));
  const columnOf = (id: string) => colIndex.get(rawX.get(id) ?? 0) ?? 0;

  // 3. Active lanes in fixed order.
  const nodeLane = new Map(nodes.map((n) => [n.id, laneOf(n)]));
  const activeLanes = LANE_ORDER.filter((lane) =>
    nodes.some((n) => nodeLane.get(n.id) === lane),
  );

  // 4. Assign per-lane, per-column vertical slots (no overlap within a lane).
  const slot = new Map<string, number>();
  const laneMaxSlots = new Map<LaneKey, number>();
  for (const lane of activeLanes) {
    const perColumn = new Map<number, GraphNode[]>();
    for (const n of nodes) {
      if (nodeLane.get(n.id) !== lane) continue;
      const col = columnOf(n.id);
      (perColumn.get(col) ?? perColumn.set(col, []).get(col)!).push(n);
    }
    let maxSlots = 1;
    for (const [, group] of perColumn) {
      group.sort((a, b) => a.id.localeCompare(b.id));
      group.forEach((n, i) => slot.set(n.id, i));
      maxSlots = Math.max(maxSlots, group.length);
    }
    laneMaxSlots.set(lane, maxSlots);
  }

  // 5. Lane bands (cumulative tops).
  const lanes: LaidOutLane[] = [];
  let cursorY = 0;
  const laneTop = new Map<LaneKey, number>();
  for (const lane of activeLanes) {
    const height = (laneMaxSlots.get(lane) ?? 1) * ROW_STEP + LANE_PAD_Y;
    laneTop.set(lane, cursorY);
    lanes.push({ key: lane, top: cursorY, height });
    cursorY += height;
  }
  const totalHeight = cursorY;

  // 6. Place nodes.
  const laidNodes: LaidOutNode[] = nodes.map((n) => {
    const lane = nodeLane.get(n.id)!;
    const x = LANE_LABEL_W + columnOf(n.id) * COL_STEP;
    const y = (laneTop.get(lane) ?? 0) + LANE_PAD_Y / 2 + (slot.get(n.id) ?? 0) * ROW_STEP;
    return {
      id: n.id,
      x,
      y,
      w: NODE_W,
      h: NODE_H,
      lane,
      failureRate: failureRate(n),
      frequency: n.frequency,
      onCriticalPath: false,
    };
  });
  const posById = new Map(laidNodes.map((n) => [n.id, n]));

  // 7. Critical path + edge geometry.
  const critical = criticalPath(nodes, edges);
  for (const n of laidNodes) n.onCriticalPath = critical.nodes.has(n.id);
  const criticalEdge = (from: string, to: string) =>
    critical.edges.has(`${from}->${to}`);

  const maxFreq = Math.max(1, ...edges.map((e) => e.frequency));
  const laidEdges: LaidOutEdge[] = edges.map((e) => {
    const a = posById.get(e.from);
    const b = posById.get(e.to);
    const strokeWidth = 1.5 + (e.frequency / maxFreq) * 4;
    if (!a || !b) {
      return { id: e.id, from: e.from, to: e.to, path: "", strokeWidth, frequency: e.frequency, onCriticalPath: false, selfLoop: e.from === e.to };
    }
    if (e.from === e.to) {
      // Self-loop (retry): small arc above the node.
      const sx = a.x + a.w * 0.7;
      const sy = a.y;
      const path = `M ${sx} ${sy} C ${sx + 30} ${sy - 34}, ${a.x + a.w + 30} ${a.y + 10}, ${a.x + a.w} ${a.y + a.h * 0.4}`;
      return { id: e.id, from: e.from, to: e.to, path, strokeWidth, frequency: e.frequency, onCriticalPath: false, selfLoop: true };
    }
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    const backward = x2 < x1; // retry/rework edge going right→left
    const cx = (x1 + x2) / 2;
    const path = backward
      ? `M ${x1} ${y1} C ${x1 + 40} ${y1 - 30}, ${x2 - 40} ${y2 - 30}, ${x2} ${y2}`
      : `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
    return {
      id: e.id,
      from: e.from,
      to: e.to,
      path,
      strokeWidth,
      frequency: e.frequency,
      onCriticalPath: criticalEdge(e.from, e.to),
      selfLoop: false,
    };
  });

  const width = LANE_LABEL_W + uniqueX.length * COL_STEP + 20;
  return { nodes: laidNodes, edges: laidEdges, lanes, width, height: totalHeight };
}

/** Interpolate a failure-rate (0..1) to a color token. */
export function failureColor(rate: number): string {
  if (rate <= 0.001) return "var(--success)";
  if (rate < 0.15) return "var(--info)";
  if (rate < 0.35) return "var(--warning)";
  return "var(--danger)";
}
