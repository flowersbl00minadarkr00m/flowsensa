/**
 * Sync process telemetry from the Supabase `telemetry_events` table that
 * Flowsensa shares with Mnemosync. Rows are mapped into the canonical
 * WorkEvent schema (schema v1.0.0). The schema is strict
 * (additionalProperties: false), so every nested object is rebuilt from only
 * the fields the schema allows, and optional sub-objects are omitted unless
 * they satisfy their required shape — the import validator is the final gate.
 */
import { supabase } from './supabase';
import type { WorkEventCollection } from '../domain/types';

const ACTIVITY_TYPES = new Set([
  'intake', 'extract', 'validate', 'decide', 'review',
  'execute', 'handoff', 'reconcile', 'close', 'other',
]);
const ACTOR_TYPES = new Set(['human', 'agent', 'system', 'service-account', 'external']);
const RESULT_STATUSES = new Set(['success', 'failure', 'exception', 'retry', 'rollback', 'cancelled']);
const TRUTH_STATES = new Set(['observed', 'inferred', 'user-confirmed', 'overridden']);
const PROVENANCE_TYPES = new Set(['mnemosync', 'file-import', 'opentelemetry', 'elastic', 'opensearch', 'manual', 'derived']);
const RESOURCE_KINDS = new Set([
  'financial',
  'input-tokens',
  'output-tokens',
  'cached-tokens',
  'reasoning-tokens',
  'human-time',
  'compute',
  'storage',
  'network',
]);
const MEASUREMENT_CLASSES = new Set(['metered', 'provider-reported', 'allocated', 'estimated', 'unknown']);

type Row = Record<string, unknown>;
const obj = (v: unknown): Row => (v && typeof v === 'object' ? (v as Row) : {});
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' && v ? v : fallback);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined);

function mapActivity(a: Row) {
  const activity: Row = {
    id: str(a.id, 'unknown-activity'),
    label: str(a.label, str(a.id, 'activity')),
    type: ACTIVITY_TYPES.has(a.type as string) ? a.type : 'other',
  };
  if (a.primitiveVersion) activity.primitiveVersion = str(a.primitiveVersion);
  return activity;
}

function mapActor(a: Row) {
  const actor: Row = {
    id: str(a.id, 'unknown-actor'),
    label: str(a.label, str(a.id, 'actor')),
    type: ACTOR_TYPES.has(a.type as string) ? a.type : 'external',
  };
  if (a.role) actor.role = str(a.role);
  if (typeof a.authorityLevel === 'number') actor.authorityLevel = a.authorityLevel;
  return actor;
}

function mapResult(r: Row) {
  const result: Row = { status: RESULT_STATUSES.has(r.status as string) ? r.status : 'success' };
  if (r.reasonCode) result.reasonCode = str(r.reasonCode);
  if (r.message) result.message = str(r.message);
  if (typeof r.retryCount === 'number') result.retryCount = r.retryCount;
  return result;
}

function mapProvenance(p: Row, eventId: string): Row {
  const provenance: Row = {
    sourceType: PROVENANCE_TYPES.has(p.sourceType as string) ? p.sourceType : 'mnemosync',
    sourceRef: str(p.sourceRef, `mnemosync://telemetry_events/${eventId}`),
    ingestedAt: str(p.ingestedAt, new Date().toISOString()),
  };
  if (p.transformation) provenance.transformation = str(p.transformation);
  if (p.contentHash) provenance.contentHash = str(p.contentHash);
  return provenance;
}

function mapSystem(s: Row): Row | undefined {
  const id = str(s.id);
  const label = str(s.label, id);
  if (!id || !label) return undefined;
  const system: Row = { id, label };
  if (s.version) system.version = str(s.version);
  if (s.tool) system.tool = str(s.tool);
  if (s.model) system.model = str(s.model);
  return system;
}

function mapTransition(t: Row): Row | undefined {
  const from = str(t.fromState);
  const to = str(t.toState);
  if (!from && !to) return undefined;
  const transition: Row = {};
  if (from) transition.fromState = from;
  if (to) transition.toState = to;
  return transition;
}

function mapDecision(d: Row): Row | undefined {
  const id = str(d.id);
  const selectedPath = str(d.selectedPath);
  if (!id || !selectedPath) return undefined;
  const decision: Row = { id, selectedPath };
  if (d.rationale) decision.rationale = str(d.rationale);
  if (d.ruleRef) decision.ruleRef = str(d.ruleRef);
  if (d.decidingAuthority) decision.decidingAuthority = str(d.decidingAuthority);
  return decision;
}

function mapResource(item: Row): Row | undefined {
  const kind = str(item.kind);
  const measurementClass = str(item.measurementClass, str(item.measurement_class));
  const unit = str(item.unit);
  const sourceRef = str(item.sourceRef, str(item.source_ref));
  if (!RESOURCE_KINDS.has(kind) || !MEASUREMENT_CLASSES.has(measurementClass) || !unit || !sourceRef) {
    return undefined;
  }

  const value = num(item.value);
  const resource: Row = { kind, unit, measurementClass, sourceRef };
  if (measurementClass === 'unknown') {
    resource.value = null;
  } else if (value !== undefined) {
    resource.value = value;
  } else {
    return undefined;
  }

  if (measurementClass === 'allocated' || measurementClass === 'estimated') {
    const allocationMethod = str(item.allocationMethod, str(item.allocation_method));
    if (!allocationMethod) return undefined;
    resource.allocationMethod = allocationMethod;
  } else if (item.allocationMethod || item.allocation_method) {
    resource.allocationMethod = str(item.allocationMethod, str(item.allocation_method));
  }

  const confidence = num(item.confidence);
  if (confidence !== undefined && confidence <= 1) resource.confidence = confidence;
  if (item.notes) resource.notes = str(item.notes);
  return resource;
}

function mapResources(resources: unknown): Row[] | undefined {
  if (!Array.isArray(resources)) return undefined;
  const mapped = resources
    .map((item) => mapResource(obj(item)))
    .filter((item): item is Row => Boolean(item));
  return mapped.length ? mapped : undefined;
}

function mapRow(row: Row) {
  const eventId = str(row.event_id, `mnemosync-${crypto.randomUUID()}`);
  const timestamp = typeof row.timestamp === 'string'
    ? new Date(row.timestamp).toISOString()
    : new Date().toISOString();

  const event: Row = {
    eventId,
    caseId: str(row.case_id, 'mnemosync-case'),
    timestamp,
    activity: mapActivity(obj(row.activity)),
    actor: mapActor(obj(row.actor)),
    result: mapResult(obj(row.result)),
    truthState: TRUTH_STATES.has(row.truth_state as string) ? row.truth_state : 'observed',
    provenance: mapProvenance(obj(row.provenance), eventId),
  };

  if (row.trace_id) event.traceId = str(row.trace_id);
  if (row.parent_event_id) event.parentEventId = str(row.parent_event_id);
  if (typeof row.sequence === 'number') event.sequence = row.sequence;
  if (typeof row.duration_ms === 'number') event.durationMs = row.duration_ms;
  if (typeof row.durationMs === 'number') event.durationMs = row.durationMs;
  if (row.intent) event.intent = str(row.intent);
  const system = mapSystem(obj(row.system));
  if (system) event.system = system;
  const transition = mapTransition(obj(row.transition));
  if (transition) event.transition = transition;
  const decision = mapDecision(obj(row.decision));
  if (decision) event.decision = decision;
  const resources = mapResources(row.resources);
  if (resources) event.resources = resources;
  if (typeof row.accepted_outcome === 'boolean') event.acceptedOutcome = row.accepted_outcome;
  if (typeof row.confidence === 'number' && row.confidence >= 0 && row.confidence <= 1) event.confidence = row.confidence;
  if (Array.isArray(row.tags)) {
    const tags = [...new Set((row.tags as unknown[]).filter((t): t is string => typeof t === 'string'))];
    if (row.agent_source && typeof row.agent_source === 'string') tags.push(`agent-source:${row.agent_source}`);
    const uniqueTags = [...new Set(tags)];
    if (uniqueTags.length > 0) event.tags = uniqueTags;
  } else if (row.agent_source && typeof row.agent_source === 'string') {
    event.tags = [`agent-source:${row.agent_source}`];
  }

  return event;
}

export interface SyncResult {
  collection: WorkEventCollection;
  rowCount: number;
}

/**
 * Pull telemetry events from the shared Supabase table and return a canonical
 * WorkEventCollection. Ordered by case then sequence/time so process discovery
 * sees coherent traces.
 */
export async function syncFromMnemosync(): Promise<SyncResult> {
  const { data, error } = await supabase
    .from('telemetry_events')
    .select('*')
    .order('case_id', { ascending: true })
    .order('sequence', { ascending: true })
    .order('timestamp', { ascending: true });

  if (error) {
    throw new Error(`Mnemosync sync failed: ${error.message}`);
  }
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    throw new Error('No telemetry events found in the shared Mnemosync table.');
  }

  const collection = {
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    events: rows.map(mapRow),
  } as unknown as WorkEventCollection;

  return { collection, rowCount: rows.length };
}
