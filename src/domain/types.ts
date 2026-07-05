export type TruthState = "observed" | "inferred" | "user-confirmed" | "overridden";
export type MeasurementClass =
  | "metered"
  | "provider-reported"
  | "allocated"
  | "estimated"
  | "unknown";
export type ResourceKind =
  | "financial"
  | "input-tokens"
  | "output-tokens"
  | "cached-tokens"
  | "reasoning-tokens"
  | "human-time"
  | "electricity"
  | "water"
  | "compute"
  | "storage"
  | "network";
export type RecommendationClass =
  | "Keep manual"
  | "Simplify or eliminate before automating"
  | "Deterministic automation"
  | "Probabilistic AI assistance with human execution"
  | "Probabilistic AI proposal with human approval"
  | "Bounded probabilistic execution with deterministic controls"
  | "Hybrid deterministic/probabilistic workflow"
  | "Insufficient evidence";

export type AutomationFamily =
  | "Manual / simplify"
  | "Deterministic / vibe-code"
  | "Probabilistic / prompt"
  | "Hybrid / agent with harness"
  | "Insufficient evidence";

export interface Activity {
  id: string;
  label: string;
  type:
    | "intake"
    | "extract"
    | "validate"
    | "decide"
    | "review"
    | "execute"
    | "handoff"
    | "reconcile"
    | "close"
    | "other";
  primitiveVersion?: string;
}

export interface Actor {
  id: string;
  label: string;
  type: "human" | "agent" | "system" | "service-account" | "external";
  role?: string;
  authorityLevel?: number;
}

export interface ResourceMeasurement {
  kind: ResourceKind;
  value: number | null;
  unit: string;
  measurementClass: MeasurementClass;
  sourceRef: string;
  allocationMethod?: string;
  confidence?: number;
  notes?: string;
}

export interface Evidence {
  id: string;
  sourceRef: string;
  label?: string;
  classification?: string;
  contentHash?: string;
}

export interface WorkEvent {
  eventId: string;
  caseId: string;
  traceId?: string;
  parentEventId?: string;
  timestamp: string;
  sequence?: number;
  durationMs?: number;
  intent?: string;
  activity: Activity;
  transition?: { fromState?: string; toState?: string };
  actor: Actor;
  system?: { id: string; label: string; version?: string; tool?: string; model?: string };
  objects?: Array<{
    id: string;
    type: string;
    role: "input" | "output" | "subject" | "evidence";
    sourceRef?: string;
    classification?: string;
  }>;
  decision?: {
    id: string;
    selectedPath: string;
    rationale?: string;
    ruleRef?: string;
    decidingAuthority?: string;
  };
  result: {
    status: "success" | "failure" | "exception" | "retry" | "rollback" | "cancelled";
    reasonCode?: string;
    message?: string;
    retryCount?: number;
  };
  evidence?: Evidence[];
  resources?: ResourceMeasurement[];
  acceptedOutcome?: boolean;
  truthState: TruthState;
  confidence?: number;
  provenance: {
    sourceType:
      | "mnemosync"
      | "file-import"
      | "opentelemetry"
      | "elastic"
      | "opensearch"
      | "manual"
      | "derived";
    sourceRef: string;
    ingestedAt: string;
    transformation?: string;
    contentHash?: string;
  };
  tags?: string[];
}

export interface WorkEventCollection {
  schemaVersion: "1.0.0";
  exportedAt?: string;
  events: WorkEvent[];
}

export interface PrimitiveEntry {
  id: string;
  term: string;
  aliases?: string[];
  primitiveType:
    | "actor"
    | "intent"
    | "object"
    | "action"
    | "state"
    | "decision"
    | "authority"
    | "evidence"
    | "control"
    | "exception"
    | "handoff"
    | "outcome"
    | "other";
  meaningStatus: "official" | "operational" | "historical" | "contested" | "inferred";
  definition: string;
  scope: string;
  owner: string;
  sourceRef: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  examples?: string[];
  counterexamples?: string[];
  relatedTerms?: string[];
  validationRules?: string[];
  consumers?: string[];
  notes?: string;
}

export interface PrimitiveRegistry {
  schemaVersion: "1.0.0";
  registryVersion: string;
  effectiveAt?: string;
  entries: PrimitiveEntry[];
}

export interface GraphNode {
  id: string;
  label: string;
  activityType: Activity["type"];
  frequency: number;
  actorIds: string[];
  actorTypes: Actor["type"][];
  eventIds: string[];
  acceptedOutcomes: number;
  exceptions: number;
  repeats: number;
  totalDurationMs: number;
  truthState: TruthState;
  confidence: number;
  owner?: string;
  authorityLevel?: number;
  status: "proposed" | "confirmed" | "rejected";
  sourceNodeIds?: string[];
  overrideRationale?: string;
  primitiveId?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  frequency: number;
  caseIds: string[];
  handoffs: number;
  waitMs: number[];
  eventIds: string[];
  truthState: TruthState;
  status: "proposed" | "confirmed" | "rejected";
  overrideRationale?: string;
}

export interface ProcessVariant {
  id: string;
  activityIds: string[];
  caseIds: string[];
  frequency: number;
  hasException: boolean;
  acceptedOutcomes: number;
}

export interface ProcessGraph {
  schemaVersion: "1.0.0";
  generatedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  variants: ProcessVariant[];
  ambiguousOrderCaseIds: string[];
  sourceEventIds: string[];
}

export interface RubricFactor {
  key: string;
  label: string;
  value: "low" | "medium" | "high" | "unknown";
  effect: string;
  evidenceEventIds: string[];
}

export interface Recommendation {
  nodeId: string;
  recommendationClass: RecommendationClass;
  automationFamily: AutomationFamily;
  confidence: number;
  uncertainty: string;
  evidenceEventIds: string[];
  factors: RubricFactor[];
  expectedFailureModes: string[];
  requiredControls: string[];
  truthState: TruthState;
}

export interface OverrideRecord {
  id: string;
  targetType: "node" | "edge" | "recommendation";
  targetId: string;
  action: "confirm" | "reject" | "rename" | "merge" | "split" | "assign" | "classify";
  priorValue: unknown;
  newValue: unknown;
  rationale: string;
  createdAt: string;
  truthState: "user-confirmed" | "overridden";
}

export interface Gap {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  message: string;
  nodeId?: string;
  eventIds: string[];
}

export interface AnalystAnswer {
  questionId: string;
  title: string;
  summary: string;
  evidence: Array<{
    label: string;
    eventIds: string[];
    nodeIds?: string[];
  }>;
}

export interface ActivityLogEntry {
  eventId: string;
  caseId: string;
  actorType: string;
  actorId: string;
  activityLabel: string;
  resultStatus: string;
  truthState: string;
  sourceRef: string;
  ingestedAt: string;
  isDemo: boolean;
}

export interface KPISnapshot {
  caseCount: number;
  medianThroughputMs: number;
  exceptionRate: number;
  reworkRate: number;
  automationCoverageRate: number;
  calculatedAt: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  triggeredValue: number;
  threshold: number;
  status: 'active' | 'acknowledged' | 'muted' | 'resolved';
  triggeredAt: string;
}

export interface AlertRule {
  id: string;
  metric: keyof KPISnapshot;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  description: string;
}

export interface OpenRouterConfig {
  key: string;
  model: string;
}

export interface FlowExport {
  schemaVersion: "1.0.0";
  exportType: "flowsensa-confirmed-process";
  exportedAt: string;
  source: {
    eventSchemaVersion: string;
    primitiveRegistryVersion: string;
    provenance: string[];
  };
  events: WorkEventCollection;
  inferredGraph: ProcessGraph;
  confirmedGraph: ProcessGraph;
  recommendations: Recommendation[];
  overrides: OverrideRecord[];
}
