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

export type ExecutionPattern =
  | "one-shot"
  | "bounded-loop"
  | "continuous-monitoring";

export interface CostEstimate {
  /** Price per 1M input tokens in USD. */
  inputPricePerM: number;
  /** Price per 1M output tokens in USD. */
  outputPricePerM: number;
  /** Estimated input tokens per iteration. */
  inputTokensPerIteration: number;
  /** Estimated output tokens per iteration. */
  outputTokensPerIteration: number;
  /** Additional tool/API cost per iteration. */
  toolCostPerIteration: number;
  /** Expected number of iterations (median). */
  expectedIterations: number;
  /** Absolute maximum iterations (hard cap). */
  maxIterations: number;
  /** Model identifier (e.g. 'openai/gpt-5.5'). */
  model: string;
  /** Pricing date. */
  estimatedAt: string;
}

export interface LoopConfig {
  /** Machine-checkable objective threshold for loop evaluation. */
  evaluator: string;
  evaluatorThreshold: string;
  /** Conditions that stop the loop early. */
  stopConditions: string[];
  /** Conditions that trigger human escalation. */
  escalationConditions: string[];
  /** What happens when the loop cannot meet the objective. */
  failureAction: string;
  /** Whether loop iterations are reversible. */
  reversibleIterations: boolean;
  /** Whether the model judges its own output (strongly discouraged). */
  modelSelfJudges: boolean;
  /** Cost estimate for this execution pattern. */
  cost: CostEstimate;
}

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
  executionPattern: ExecutionPattern;
  loopConfig?: LoopConfig;
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
  actorLabel: string;
  activityLabel: string;
  resultStatus: string;
  truthState: string;
  sourceRef: string;
  ingestedAt: string;
  isDemo: boolean;
  durationMs?: number;
  systemLabel?: string;
  systemTool?: string;
  systemModel?: string;
  resourceSummary?: string;
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

export interface LLMProfile {
  id: string;
  name: string;
  key: string;
  baseUrl: string;
  model: string;
}

export type OpenRouterConfig = LLMProfile;

export interface ProcessMetadata {
  id: string;
  displayName: string;
  source: "event-log" | "bpmn" | "image-extracted" | "manual";
  confidence: number;
  taskDisplayNames: Record<string, string>;
  originalTaskLabels: Record<string, string>;
}

export interface TaskInsight {
  nodeId: string;
  eventCount: number;
  caseCount: number;
  actorMix: string[];
  medianDurationMs?: number;
  totalDurationMs: number;
  exceptionCount: number;
  retryCount: number;
  reworkSignals: string[];
  upstream: string[];
  downstream: string[];
  evidenceEventIds: string[];
  insufficientTelemetry: string[];
}

export interface ProcessRisk {
  id: string;
  processId: string;
  processName: string;
  nodeId: string;
  taskName: string;
  riskIdentified: string;
  riskMitigation: string;
  severity: "low" | "medium" | "high";
  source: "deterministic" | "llm-assisted";
  evidenceEventIds: string[];
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
