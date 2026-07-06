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

type Row = Record<string, unknown>;
const obj = (v: unknown): Row => (v && typeof v === 'object' ? (v as Row) : {});
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' && v ? v : fallback);

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
  return {
    sourceType: PROVENANCE_TYPES.has(p.sourceType as string) ? p.sourceType : 'mnemosync',
    sourceRef: str(p.sourceRef, `mnemosync://telemetry_events/${eventId}`),
    ingestedAt: str(p.ingestedAt, new Date().toISOString()),
  };
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
  if (row.intent) event.intent = str(row.intent);
  const transition = mapTransition(obj(row.transition));
  if (transition) event.transition = transition;
  const decision = mapDecision(obj(row.decision));
  if (decision) event.decision = decision;
  if (typeof row.accepted_outcome === 'boolean') event.acceptedOutcome = row.accepted_outcome;
  if (Array.isArray(row.tags)) {
    const tags = [...new Set((row.tags as unknown[]).filter((t): t is string => typeof t === 'string'))];
    if (tags.length > 0) event.tags = tags;
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
