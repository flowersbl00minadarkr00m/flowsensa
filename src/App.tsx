import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { EventDialog } from "./components/EventDialog";
import { ImportPanel } from "./components/ImportPanel";
import { calculateKPIs } from "./lib/kpiEngine";
import { DEFAULT_ALERT_RULES, evaluateAlerts } from "./lib/alertEngine";
import { emitDemoEvent } from "./lib/demoProducer";
import { OperationalOverview } from "./modules/OperationalOverview";
import { ProcessExplorer } from "./modules/ProcessExplorer";
import { ProcessVariants } from "./modules/ProcessVariants";
import { ActivityLog } from "./modules/ActivityLog";
import { PerformanceAnalysis } from "./modules/PerformanceAnalysis";
import { ImprovementOpportunities } from "./modules/ImprovementOpportunities";
import { AlertsModule } from "./modules/AlertsModule";
import { AIAnalyst } from "./modules/AIAnalyst";
import { DataSources } from "./modules/DataSources";
import { SettingsModule } from "./modules/SettingsModule";
import type { ActivityLogEntry, Alert, KPISnapshot, OpenRouterConfig } from "./domain/types";
import { answerQuestion } from "./domain/analyst";
import { JsonFileTelemetryAdapter } from "./domain/adapters";
import { discoverProcess } from "./domain/discovery";
import {
  createJsonExport,
  downloadText,
  exportMarkdown,
  exportMermaid,
  validateFlowExport,
} from "./domain/exports";
import { detectGaps } from "./domain/gaps";
import {
  automationFamilyFor,
  recommendTreatments,
} from "./domain/recommendations";
import {
  clearWorkspace,
  loadWorkspace,
  saveWorkspace,
} from "./domain/storage";
import type {
  FlowExport,
  GraphEdge,
  GraphNode,
  OverrideRecord,
  PrimitiveRegistry,
  ProcessGraph,
  Recommendation,
  RecommendationClass,
  WorkEventCollection,
} from "./domain/types";
import {
  type ValidationIssue,
  validatePrimitiveRegistry,
  validateWorkEvents,
} from "./domain/validation";
import invalidFixture from "./fixtures/invalid-work-events.json";
import primitiveFixture from "./fixtures/work-primitives.json";
import { showcaseWorkEvents } from "./fixtures/showcase-work-events";

type View =
  | "overview"
  | "explorer"
  | "variants"
  | "activity"
  | "performance"
  | "improvements"
  | "alerts"
  | "analyst"
  | "sources"
  | "settings";

interface HistoryEntry {
  graph: ProcessGraph;
  overrides: OverrideRecord[];
  recommendations: Recommendation[];
}

const NAV_ITEMS: Array<{ id: View; label: string; number: string }> = [
  { id: "overview", label: "Operational Overview", number: "01" },
  { id: "explorer", label: "Process Explorer", number: "02" },
  { id: "variants", label: "Process Variants", number: "03" },
  { id: "activity", label: "Activity Log", number: "04" },
  { id: "performance", label: "Performance Analysis", number: "05" },
  { id: "improvements", label: "Improvement Opportunities", number: "06" },
  { id: "alerts", label: "Alerts", number: "07" },
  { id: "analyst", label: "AI Analyst", number: "08" },
  { id: "sources", label: "Data Sources", number: "09" },
  { id: "settings", label: "Settings", number: "10" },
] as const;

const adapter = new JsonFileTelemetryAdapter();

function cloneGraph(graph: ProcessGraph): ProcessGraph {
  return structuredClone(graph);
}

function overrideId(): string {
  return `override-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function App() {
  const [view, setView] = useState<View>("overview");
  const [events, setEvents] = useState<WorkEventCollection>();
  const [registry, setRegistry] = useState<PrimitiveRegistry>();
  const [inferredGraph, setInferredGraph] = useState<ProcessGraph>();
  const [graph, setGraph] = useState<ProcessGraph>();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [overrides, setOverrides] = useState<OverrideRecord[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [importSummary, setImportSummary] = useState<string>();
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [selectedQuestion, setSelectedQuestion] = useState("elapsed");
  const [previewType, setPreviewType] = useState<"JSON" | "Markdown" | "Mermaid">("JSON");
  const [hydrated, setHydrated] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [openRouterConfig, setOpenRouterConfig] = useState<OpenRouterConfig | null>(null);
  const [demoCounter, setDemoCounter] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [alertUpdates, setAlertUpdates] = useState<Map<string, Alert["status"]>>(new Map());
  const workspaceFileInputRef = useRef<HTMLInputElement>(null);

  const gaps = useMemo(
    () => (graph && events ? detectGaps(graph.nodes, events.events) : []),
    [graph, events],
  );
  const isShowcase = useMemo(
    () =>
      events
        ? events.events.length > 0 &&
          events.events.every((event) => event.tags?.includes("showcase-demo"))
        : false,
    [events],
  );

  const kpis = useMemo<KPISnapshot>(
    () => calculateKPIs(events?.events ?? [], graph),
    [events, graph],
  );

  const rawAlerts = useMemo(
    () => evaluateAlerts(kpis, DEFAULT_ALERT_RULES),
    [kpis],
  );

  const alerts = useMemo(
    () => rawAlerts.map(a => ({ ...a, status: alertUpdates.get(a.id) ?? a.status })),
    [rawAlerts, alertUpdates],
  );

  const flowExport = useMemo<FlowExport | undefined>(() => {
    if (!events || !registry || !inferredGraph || !graph) return undefined;
    return createJsonExport({
      source: {
        eventSchemaVersion: events.schemaVersion,
        primitiveRegistryVersion: registry.registryVersion,
        provenance: [
          ...new Set(events.events.map((event) => event.provenance.sourceRef)),
        ],
      },
      events,
      inferredGraph,
      confirmedGraph: graph,
      recommendations,
      overrides,
    });
  }, [events, registry, inferredGraph, graph, recommendations, overrides]);

  const exportText = useCallback(
    (type: "JSON" | "Markdown" | "Mermaid"): string => {
      if (!flowExport || !registry) return "";
      if (type === "JSON") return JSON.stringify(flowExport, null, 2);
      if (type === "Markdown") {
        return exportMarkdown(
          flowExport.confirmedGraph,
          flowExport.recommendations,
          registry,
        );
      }
      return exportMermaid(flowExport.confirmedGraph);
    },
    [flowExport, registry],
  );

  const preview = exportText(previewType);
  const roundTripValid = useMemo(() => {
    if (!flowExport) return false;
    return validateFlowExport(JSON.parse(JSON.stringify(flowExport)) as unknown);
  }, [flowExport]);

  const analystAnswer = useMemo(
    () =>
      answerQuestion(selectedQuestion, {
        graph: graph ?? {
          schemaVersion: "1.0.0",
          generatedAt: "",
          nodes: [],
          edges: [],
          variants: [],
          ambiguousOrderCaseIds: [],
          sourceEventIds: [],
        },
        events: events?.events ?? [],
        gaps,
        recommendations,
      }),
    [selectedQuestion, graph, events, gaps, recommendations],
  );

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  // importPayload declared before handleRunDemo so we can reference it
  const importPayload = useCallback(async (payload: unknown, label: string) => {
    try {
      const parsed = await adapter.import(payload);
      const eventResult = validateWorkEvents(parsed);
      const primitiveResult = validatePrimitiveRegistry(primitiveFixture);
      if (!eventResult.valid || !eventResult.data) {
        setIssues(eventResult.issues);
        setImportSummary(
          `${label}: 0 accepted; ${eventResult.rejectedCount} event(s) rejected. Existing local data was preserved.`,
        );
        return;
      }
      if (!primitiveResult.valid || !primitiveResult.data) {
        setIssues(primitiveResult.issues);
        setImportSummary("Primitive registry validation failed; import blocked.");
        return;
      }
      const inferred = discoverProcess(eventResult.data);
      const initialRecommendations = recommendTreatments(
        inferred.nodes,
        eventResult.data.events,
      );
      setEvents(eventResult.data);
      setRegistry(primitiveResult.data);
      setInferredGraph(cloneGraph(inferred));
      setGraph(cloneGraph(inferred));
      setRecommendations(initialRecommendations);
      setOverrides([]);
      setHistory([]);
      setIssues([]);
      setView("overview");
      setActivityLog(eventResult.data.events.map(e => ({
        eventId: e.eventId, caseId: e.caseId, actorType: e.actor.type,
        actorId: e.actor.id, activityLabel: e.activity.label,
        resultStatus: e.result.status, truthState: e.truthState,
        sourceRef: e.provenance.sourceRef, ingestedAt: e.provenance.ingestedAt,
        isDemo: !!e.tags?.includes("live-demo"),
      })));
      setImportSummary(
        `${label}: ${eventResult.acceptedCount} accepted, 0 rejected; ${inferred.variants.length} variants proposed.`,
      );
    } catch (error) {
      setIssues([
        {
          eventId: "collection",
          field: "(file)",
          reason: error instanceof Error ? error.message : "Unable to parse JSON.",
          keyword: "parse",
        },
      ]);
      setImportSummary(`${label}: import blocked; existing local data was preserved.`);
    }
  }, []);

  const handleLoadFromMnemosync = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('telemetry_events')
        .select('*')
        .order('timestamp', { ascending: true })
        .limit(2000)

      if (error) {
        setIssues([{ eventId: 'supabase', field: '(query)', reason: error.message, keyword: 'supabase' }])
        setImportSummary('MnemoSync: query failed. Is the telemetry_events table set up?')
        return
      }
      if (!data || data.length === 0) {
        setImportSummary('MnemoSync: no events found. Agents may not have written any telemetry yet.')
        return
      }

      const events = data.map((row: Record<string, unknown>) => ({
        eventId: row.event_id,
        caseId: row.case_id,
        traceId: row.trace_id,
        parentEventId: row.parent_event_id,
        timestamp: row.timestamp,
        sequence: row.sequence ?? 0,
        intent: row.intent,
        activity: row.activity,
        transition: row.transition,
        actor: row.actor,
        objects: row.objects,
        decision: row.decision,
        result: row.result ?? { status: 'success' },
        evidence: row.evidence,
        acceptedOutcome: row.accepted_outcome,
        truthState: row.truth_state ?? 'observed',
        provenance: row.provenance ?? {
          sourceType: 'mnemosync',
          sourceRef: `mnemosync://ticket/${row.case_id}`,
          ingestedAt: row.timestamp,
          transformation: 'Flowsensa Supabase import',
        },
        tags: row.tags ?? ['mnemosync'],
      }))

      const collection = {
        schemaVersion: '1.0.0' as const,
        exportedAt: new Date().toISOString(),
        events,
      }

      await importPayload(collection, `MnemoSync (${events.length} events)`)
    } catch (err) {
      setIssues([{ eventId: 'supabase', field: '(fetch)', reason: err instanceof Error ? err.message : 'Unknown error', keyword: 'supabase' }])
      setImportSummary('MnemoSync: failed to load events.')
    }
  }, [importPayload])

  const handleRunDemo = useCallback(() => {
    const event = emitDemoEvent(demoCounter);
    const collection: WorkEventCollection = {
      schemaVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      events: [event],
    };
    if (events) {
      const merged: WorkEventCollection = { ...events, events: [...events.events, event] };
      const inferred = discoverProcess(merged);
      const newRecs = recommendTreatments(inferred.nodes, merged.events);
      setEvents(merged);
      setGraph(cloneGraph(inferred));
      setInferredGraph(cloneGraph(inferred));
      setRecommendations(newRecs);
    } else {
      void importPayload(collection, "Demo event");
    }
    setActivityLog(prev =>
      [{
        eventId: event.eventId,
        caseId: event.caseId,
        actorType: event.actor.type,
        actorId: event.actor.id,
        activityLabel: event.activity.label,
        resultStatus: event.result.status,
        truthState: event.truthState,
        sourceRef: event.provenance.sourceRef,
        ingestedAt: event.provenance.ingestedAt,
        isDemo: true,
      }, ...prev].slice(0, 500)
    );
    setDemoCounter(c => c + 1);
    showToast(`Demo event ingested: ${event.eventId}`);
  }, [demoCounter, events, importPayload]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResetDemo = useCallback(() => {
    if (!events) return;
    const cleaned = { ...events, events: events.events.filter(e => !e.tags?.includes("live-demo")) };
    const inferred = discoverProcess(cleaned);
    setEvents(cleaned);
    setGraph(cloneGraph(inferred));
    setInferredGraph(cloneGraph(inferred));
    setRecommendations(recommendTreatments(inferred.nodes, cleaned.events));
    setActivityLog(prev => prev.filter(e => !e.isDemo));
    setDemoCounter(0);
    showToast("Demo state reset");
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadWorkspace()
      .then((stored) => {
        if (stored && validateFlowExport(stored.exportState)) {
          const legacyFixture = stored.events.events.every((event) =>
            event.tags?.includes("fixture"),
          );
          if (legacyFixture) {
            const showcaseGraph = discoverProcess(showcaseWorkEvents);
            setEvents(showcaseWorkEvents);
            setRegistry(stored.primitives);
            setInferredGraph(cloneGraph(showcaseGraph));
            setGraph(cloneGraph(showcaseGraph));
            setRecommendations(
              recommendTreatments(showcaseGraph.nodes, showcaseWorkEvents.events),
            );
            setOverrides([]);
            setActivityLog(showcaseWorkEvents.events.map(e => ({
              eventId: e.eventId, caseId: e.caseId, actorType: e.actor.type,
              actorId: e.actor.id, activityLabel: e.activity.label,
              resultStatus: e.result.status, truthState: e.truthState,
              sourceRef: e.provenance.sourceRef, ingestedAt: e.provenance.ingestedAt,
              isDemo: !!e.tags?.includes("live-demo"),
            })));
            return;
          }
          setEvents(stored.events);
          setRegistry(stored.primitives);
          setInferredGraph(stored.exportState.inferredGraph);
          setGraph(stored.exportState.confirmedGraph);
          setRecommendations(stored.exportState.recommendations);
          setOverrides(stored.exportState.overrides);
          setActivityLog(stored.events.events.map(e => ({
            eventId: e.eventId, caseId: e.caseId, actorType: e.actor.type,
            actorId: e.actor.id, activityLabel: e.activity.label,
            resultStatus: e.result.status, truthState: e.truthState,
            sourceRef: e.provenance.sourceRef, ingestedAt: e.provenance.ingestedAt,
            isDemo: !!e.tags?.includes("live-demo"),
          })));
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated || !events || !registry || !flowExport) return;
    void saveWorkspace({
      events,
      primitives: registry,
      exportState: flowExport,
      updatedAt: new Date().toISOString(),
    });
  }, [hydrated, events, registry, flowExport]);

  const pushHistory = useCallback(() => {
    if (!graph) return;
    setHistory((current) => [
      ...current,
      {
        graph: cloneGraph(graph),
        overrides: structuredClone(overrides),
        recommendations: structuredClone(recommendations),
      },
    ]);
  }, [graph, overrides, recommendations]);

  const recordOverride = useCallback(
    (
      targetType: OverrideRecord["targetType"],
      targetId: string,
      action: OverrideRecord["action"],
      priorValue: unknown,
      newValue: unknown,
      rationale: string,
      truthState: OverrideRecord["truthState"],
    ) => {
      setOverrides((current) => [
        ...current,
        {
          id: overrideId(),
          targetType,
          targetId,
          action,
          priorValue,
          newValue,
          rationale,
          createdAt: new Date().toISOString(),
          truthState,
        },
      ]);
    },
    [],
  );

  const refreshRecommendations = useCallback(
    (nextNodes: GraphNode[]) => {
      if (!events) return;
      const fresh = recommendTreatments(nextNodes, events.events);
      setRecommendations((current) =>
        fresh.map((candidate) => {
          const existing = current.find((item) => item.nodeId === candidate.nodeId);
          return existing?.truthState === "overridden"
            ? { ...candidate, recommendationClass: existing.recommendationClass, truthState: "overridden" }
            : candidate;
        }),
      );
    },
    [events],
  );

  const handleNodeChange = useCallback(
    (nodeId: string, patch: Partial<GraphNode>, rationale: string) => {
      if (!graph) return;
      const prior =
        inferredGraph?.nodes.find((node) => node.id === nodeId) ??
        graph.nodes.find((node) => node.id === nodeId);
      const shouldRecord = Boolean(rationale.trim());
      if (shouldRecord) pushHistory();
      const nextNodes = graph.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...patch } : node,
      );
      setGraph({ ...graph, nodes: nextNodes });
      refreshRecommendations(nextNodes);
      if (shouldRecord) {
        const action: OverrideRecord["action"] =
          patch.status === "rejected"
            ? "reject"
            : patch.status === "confirmed"
              ? "confirm"
              : patch.owner !== undefined || patch.authorityLevel !== undefined
                ? "assign"
                : "rename";
        recordOverride(
          "node",
          nodeId,
          action,
          prior,
          { ...prior, ...patch },
          rationale,
          patch.truthState === "user-confirmed" ? "user-confirmed" : "overridden",
        );
      }
    },
    [graph, inferredGraph, pushHistory, recordOverride, refreshRecommendations],
  );

  const handleEdgeChange = useCallback(
    (edgeId: string, patch: Partial<GraphEdge>, rationale: string) => {
      if (!graph) return;
      pushHistory();
      const prior = graph.edges.find((edge) => edge.id === edgeId);
      setGraph({
        ...graph,
        edges: graph.edges.map((edge) =>
          edge.id === edgeId ? { ...edge, ...patch, overrideRationale: rationale } : edge,
        ),
      });
      recordOverride(
        "edge",
        edgeId,
        patch.status === "rejected" ? "reject" : "confirm",
        prior,
        { ...prior, ...patch },
        rationale,
        patch.truthState === "user-confirmed" ? "user-confirmed" : "overridden",
      );
    },
    [graph, pushHistory, recordOverride],
  );

  const handleMerge = useCallback(
    (sourceId: string, targetId: string, rationale: string) => {
      if (!graph) return;
      const source = graph.nodes.find((node) => node.id === sourceId);
      const target = graph.nodes.find((node) => node.id === targetId);
      if (!source || !target) return;
      pushHistory();
      const merged: GraphNode = {
        ...target,
        frequency: target.frequency + source.frequency,
        eventIds: [...new Set([...target.eventIds, ...source.eventIds])],
        actorIds: [...new Set([...target.actorIds, ...source.actorIds])],
        actorTypes: [...new Set([...target.actorTypes, ...source.actorTypes])],
        acceptedOutcomes: target.acceptedOutcomes + source.acceptedOutcomes,
        exceptions: target.exceptions + source.exceptions,
        repeats: target.repeats + source.repeats,
        totalDurationMs: target.totalDurationMs + source.totalDurationMs,
        truthState: "overridden",
        sourceNodeIds: [...new Set([...(target.sourceNodeIds ?? [target.id]), source.id])],
        overrideRationale: rationale,
      };
      const nextNodes = graph.nodes.map((node) =>
        node.id === targetId
          ? merged
          : node.id === sourceId
            ? { ...node, status: "rejected" as const, truthState: "overridden" as const, overrideRationale: rationale }
            : node,
      );
      const nextEdges = graph.edges.map((edge) => {
        const from = edge.from === sourceId ? targetId : edge.from;
        const to = edge.to === sourceId ? targetId : edge.to;
        return {
          ...edge,
          from,
          to,
          id: `${from}→${to}`,
          truthState: edge.from === sourceId || edge.to === sourceId ? "overridden" as const : edge.truthState,
        };
      });
      setGraph({ ...graph, nodes: nextNodes, edges: nextEdges });
      refreshRecommendations(nextNodes);
      recordOverride("node", sourceId, "merge", source, merged, rationale, "overridden");
    },
    [graph, pushHistory, recordOverride, refreshRecommendations],
  );

  const handleSplit = useCallback(
    (nodeId: string, rationale: string) => {
      if (!graph) return;
      const source = graph.nodes.find((node) => node.id === nodeId);
      if (!source) return;
      pushHistory();
      const splitId = `${nodeId}-split-${graph.nodes.filter((node) => node.id.startsWith(`${nodeId}-split-`)).length + 2}`;
      const splitEvents = source.eventIds.filter((_, index) => index % 2 === 1);
      const retainedEvents = source.eventIds.filter((_, index) => index % 2 === 0);
      const retained = {
        ...source,
        eventIds: retainedEvents.length ? retainedEvents : source.eventIds,
        frequency: retainedEvents.length || source.frequency,
        truthState: "overridden" as const,
        sourceNodeIds: source.sourceNodeIds ?? [source.id],
        overrideRationale: rationale,
      };
      const split: GraphNode = {
        ...source,
        id: splitId,
        label: `${source.label} · split proposal`,
        eventIds: splitEvents.length ? splitEvents : source.eventIds,
        frequency: splitEvents.length || source.frequency,
        truthState: "overridden",
        status: "proposed",
        sourceNodeIds: source.sourceNodeIds ?? [source.id],
        overrideRationale: rationale,
      };
      const nextNodes = graph.nodes
        .map((node) => (node.id === nodeId ? retained : node))
        .concat(split);
      setGraph({ ...graph, nodes: nextNodes });
      refreshRecommendations(nextNodes);
      recordOverride("node", nodeId, "split", source, [retained, split], rationale, "overridden");
    },
    [graph, pushHistory, recordOverride, refreshRecommendations],
  );

  const handleRecommendationChange = useCallback(
    (nodeId: string, recommendationClass: RecommendationClass) => {
      const prior = recommendations.find((item) => item.nodeId === nodeId);
      if (!prior) return;
      pushHistory();
      setRecommendations((current) =>
        current.map((item) =>
          item.nodeId === nodeId
            ? {
                ...item,
                recommendationClass,
                automationFamily: automationFamilyFor(recommendationClass),
                truthState: "overridden",
              }
            : item,
        ),
      );
      recordOverride(
        "recommendation",
        nodeId,
        "classify",
        prior.recommendationClass,
        recommendationClass,
        "User selected treatment after reviewing the transparent rubric.",
        "overridden",
      );
    },
    [recommendations, pushHistory, recordOverride],
  );

  const handleUndo = useCallback(() => {
    const previous = history.at(-1);
    if (!previous) return;
    setGraph(previous.graph);
    setOverrides(previous.overrides);
    setRecommendations(previous.recommendations);
    setHistory((current) => current.slice(0, -1));
  }, [history]);

  const handleClear = useCallback(async () => {
    await clearWorkspace();
    setEvents(undefined);
    setRegistry(undefined);
    setInferredGraph(undefined);
    setGraph(undefined);
    setRecommendations([]);
    setOverrides([]);
    setHistory([]);
    setIssues([]);
    setActivityLog([]);
    setDemoCounter(0);
    setImportSummary("Local workspace deleted from IndexedDB.");
  }, []);

  if (!hydrated) {
    return (
      <main id="main" className="loading-shell" aria-busy="true">
        <div className="brand-mark">F</div>
        <p className="eyebrow">Restoring local workspace</p>
        <h1>Loading Flowsensa…</h1>
      </main>
    );
  }

  if (!events || !registry || !inferredGraph || !graph) {
    return (
      <main id="main" className="landing-shell">
        <header className="brand-header">
          <div className="brand-mark">F</div>
          <div><strong>Flowsensa</strong><span>Runtime Process Engineer</span></div>
        </header>
        <ImportPanel
          issues={issues}
          importSummary={importSummary}
          onDemo={() => void importPayload(showcaseWorkEvents, "Northstar fictional showcase")}
          onInvalidDemo={() => void importPayload(invalidFixture, "Invalid fixture")}
          onFile={(file) => void file.text().then((text) => importPayload(text, file.name))}
          onLoadFromMnemosync={handleLoadFromMnemosync}
        />
        <footer>Mnemosync export → telemetry adapter → Flowsensa</footer>
      </main>
    );
  }

  const selectedEvent = events.events.find((event) => event.eventId === selectedEventId);

  return (
    <div className="app-shell">
      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div
          className="mobile-nav-overlay open"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        >
          <div className="mobile-nav-drawer" onClick={e => e.stopPropagation()}>
            <button
              className="mobile-nav-close"
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
            >
              ✕
            </button>
            <div className="brand-header" style={{ padding: "0.5rem 1rem 1rem", display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <div className="brand-mark" style={{ width: "2rem", height: "2rem", display: "grid", placeItems: "center", background: "var(--accent)", color: "#0a1628", borderRadius: "var(--radius)", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>F</div>
              <div className="brand-name">
                <strong style={{ color: "var(--text)", fontSize: "0.9rem" }}>Flowsensa</strong>
                <span style={{ color: "var(--text-dim)", fontSize: "0.65rem" }}>Process intelligence</span>
              </div>
            </div>
            <nav aria-label="Process modules" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.15rem", padding: "0.5rem" }}>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  className={view === item.id ? "active" : ""}
                  type="button"
                  aria-current={view === item.id ? "page" : undefined}
                  onClick={() => { setView(item.id); setMobileNavOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.6rem 0.75rem", borderRadius: "var(--radius)", border: "none", background: view === item.id ? "var(--accent-dim)" : "transparent", color: view === item.id ? "var(--accent)" : "var(--text-muted)", fontSize: "0.82rem", cursor: "pointer" }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: view === item.id ? "var(--accent)" : "var(--text-dim)", minWidth: "1.4rem" }}>{item.number}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <aside className="sidebar">
        <div className="brand-header">
          <div className="brand-mark">F</div>
          <div className="brand-name">
            <strong>Flowsensa</strong>
            <span>Process intelligence</span>
          </div>
        </div>
        <nav aria-label="Process modules">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              type="button"
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => setView(item.id)}
            >
              <span className="nav-num">{item.number}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="dot" aria-hidden="true" />
          <span>{events.events.length} events · local</span>
        </div>
        <div style={{ padding: "0.5rem 0.75rem", display: "grid", gap: "0.4rem" }}>
          <button
            className="btn"
            style={{ fontSize: "0.75rem", width: "100%" }}
            type="button"
            onClick={() => workspaceFileInputRef.current?.click()}
          >
            Import data
          </button>
          <button
            className="btn danger ghost"
            style={{ fontSize: "0.75rem", width: "100%" }}
            type="button"
            onClick={() => void handleClear()}
          >
            Delete local data
          </button>
        </div>
      </aside>

      <main id="main" className="workspace">
        <header className="workspace-header">
          <div className="ws-context">
            <button
              className="hamburger"
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              ☰
            </button>
            <span className="status-pill">{isShowcase ? "DEMO" : "DATA"}</span>
            <div>
              <strong>{isShowcase ? "Northstar AP showcase" : "Imported process workspace"}</strong>
              <span>
                {isShowcase ? "Fictional presentation data" : "Private local data"} · schema v{events.schemaVersion}
              </span>
            </div>
          </div>
          <div className="ws-actions">
            <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
              {graph.nodes.filter(n => n.status === "confirmed").length} confirmed · {overrides.length} overrides
            </span>
            <button
              className="btn"
              style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}
              type="button"
              onClick={() => workspaceFileInputRef.current?.click()}
            >
              Import JSON
            </button>
            {!isShowcase && (
              <button
                className="btn ghost"
                style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}
                type="button"
                onClick={() => void importPayload(showcaseWorkEvents, "Northstar fictional showcase")}
              >
                Load demo
              </button>
            )}
          </div>
        </header>

        <input
          ref={workspaceFileInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void file.text().then((text) => importPayload(text, file.name));
            }
            event.target.value = "";
          }}
        />

        {isShowcase && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", background: "var(--accent-dim)", borderBottom: "1px solid rgba(245,200,66,0.2)", padding: "0.6rem 1.5rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            <span className="badge demo-badge">DEMO</span>
            <span>Northstar Operations is a made-up organization. No real data.</span>
            <button
              className="btn"
              style={{ marginLeft: "auto", fontSize: "0.72rem", padding: "0.25rem 0.6rem" }}
              type="button"
              onClick={() => workspaceFileInputRef.current?.click()}
            >
              Use your data
            </button>
          </div>
        )}

        {issues.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(239,82,96,0.1)", borderBottom: "1px solid rgba(239,82,96,0.3)", padding: "0.6rem 1.5rem", fontSize: "0.78rem", color: "var(--danger)" }} role="alert">
            <strong>Import blocked</strong>
            <span>{issues.length} schema issue{issues.length === 1 ? "" : "s"}. Workspace preserved.</span>
            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>{issues[0]?.eventId}: {issues[0]?.field} — {issues[0]?.reason}</code>
          </div>
        )}
        {!issues.length && importSummary && (
          <div style={{ background: "rgba(45,212,160,0.08)", borderBottom: "1px solid rgba(45,212,160,0.2)", padding: "0.5rem 1.5rem", fontSize: "0.75rem", color: "var(--success)" }} role="status">
            {importSummary}
          </div>
        )}

        {/* Module views */}
        {view === "overview" && (
          <OperationalOverview
            graph={graph}
            events={events.events}
            recommendations={recommendations}
            alerts={alerts}
            kpis={kpis}
            onRunDemo={handleRunDemo}
            onViewModule={(v) => setView(v as View)}
          />
        )}
        {view === "explorer" && (
          <ProcessExplorer
            graph={graph}
            inferredGraph={inferredGraph}
            events={events.events}
            registry={registry}
            overrides={overrides}
            canUndo={history.length > 0}
            onNodeChange={handleNodeChange}
            onEdgeChange={handleEdgeChange}
            onMerge={handleMerge}
            onSplit={handleSplit}
            onUndo={handleUndo}
            onOpenEvent={setSelectedEventId}
          />
        )}
        {view === "variants" && (
          <ProcessVariants graph={graph} events={events.events} />
        )}
        {view === "activity" && (
          <ActivityLog activityLog={activityLog} onOpenEvent={setSelectedEventId} />
        )}
        {view === "performance" && (
          <PerformanceAnalysis graph={graph} events={events.events} kpis={kpis} />
        )}
        {view === "improvements" && (
          <ImprovementOpportunities
            nodes={graph.nodes}
            recommendations={recommendations}
            gaps={gaps}
            onRecommendationChange={handleRecommendationChange}
            onOpenEvent={setSelectedEventId}
          />
        )}
        {view === "alerts" && (
          <AlertsModule
            alerts={alerts}
            onUpdate={(id, status) =>
              setAlertUpdates(m => {
                const n = new Map(m);
                n.set(id, status);
                return n;
              })
            }
          />
        )}
        {view === "analyst" && (
          <AIAnalyst
            graph={graph}
            events={events.events}
            gaps={gaps}
            recommendations={recommendations}
            kpis={kpis}
            openRouterConfig={openRouterConfig}
            selectedQuestion={selectedQuestion}
            analystAnswer={analystAnswer}
            onQuestionChange={setSelectedQuestion}
            onOpenEvent={setSelectedEventId}
          />
        )}
        {view === "sources" && (
          <DataSources
            events={events}
            activityLog={activityLog}
            demoCounter={demoCounter}
            onRunDemo={handleRunDemo}
            onResetDemo={handleResetDemo}
            onImport={(file) => void file.text().then((txt) => importPayload(txt, file.name))}
          />
        )}
        {view === "settings" && (
          <SettingsModule
            openRouterConfig={openRouterConfig}
            onOpenRouterChange={setOpenRouterConfig}
            registry={registry}
            previewProps={{
              preview,
              previewType,
              roundTripValid,
              onPreview: setPreviewType,
              onDownload: (type) => {
                const ext = type === "JSON" ? "json" : type === "Markdown" ? "md" : "mmd";
                const mime = type === "JSON" ? "application/json" : "text/plain";
                downloadText(`flowsensa-process.${ext}`, exportText(type), mime);
              },
            }}
          />
        )}
      </main>

      <EventDialog event={selectedEvent} onClose={() => setSelectedEventId(undefined)} />

      {toastMsg && (
        <div className="toast-notification" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
