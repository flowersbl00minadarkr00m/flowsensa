import { describe, expect, it } from 'vitest';
import {
  assertSupportedTelemetryImport,
  createFindMnemoImport,
  formatFindMnemoImportLabel,
} from '../src/lib/findMnemoTelemetry';

const exportedAt = '2026-07-10T12:00:00.000Z';

const legacyRow = {
  event_id: 'mn-e1',
  case_id: 'mn-case-1',
  sequence: 0,
  timestamp: '2026-07-05T10:00:00.000Z',
  activity: { id: 'ticket-created', type: 'intake', label: 'Create ticket' },
  actor: { id: 'agent-pi', type: 'agent', label: 'Pi', role: 'AI work agent' },
  result: { status: 'success' },
  truth_state: 'observed',
  provenance: {
    sourceType: 'mnemosync',
    sourceRef: 'mnemosync://telemetry/mn-e1',
    ingestedAt: '2026-07-05T10:00:01.000Z',
    transformation: 'FindMnemo telemetry row v1',
  },
  producer_version: '0.1.0',
};

describe('FindMnemo import metadata', () => {
  it('labels legacy mnemosync rows as FindMnemo-compatible and preserves lineage', () => {
    const result = createFindMnemoImport([legacyRow], exportedAt);

    expect(result.metadata).toEqual({
      producerName: 'FindMnemo',
      producerId: 'findmnemo',
      producerVersion: '0.1.0',
      sourceTypes: ['mnemosync'],
      compatibilityMode: 'mnemosync-legacy-compatible',
    });
    expect(formatFindMnemoImportLabel(result)).toBe(
      'FindMnemo sync (1 event; producer v0.1.0; legacy mnemosync-compatible)',
    );

    const event = result.collection.events[0];
    expect(event.eventId).toBe('mn-e1');
    expect(event.actor).toMatchObject({ id: 'agent-pi', label: 'Pi', type: 'agent' });
    expect(event.timestamp).toBe('2026-07-05T10:00:00.000Z');
    expect(event.provenance).toEqual({
      sourceType: 'mnemosync',
      sourceRef: 'mnemosync://telemetry/mn-e1',
      ingestedAt: '2026-07-05T10:00:01.000Z',
      transformation: 'FindMnemo telemetry row v1',
    });
  });

  it('rejects invalid and unsupported ontology bundles before workspace replacement', () => {
    const activeWorkspace = { id: 'active-workspace' };
    const invalidBundle = {
      schemaVersion: '1.0.0',
      bundleProfile: 'findmnemo.observed-work.v1',
      bundleKind: 'observed-work',
      producer: { productName: 'FindMnemo', productId: 'findmnemo', exportedAt },
      objects: {},
      links: [],
    };
    const validButUnsupportedBundle = {
      ...invalidBundle,
      objects: [],
    };

    expect(() => assertSupportedTelemetryImport(invalidBundle)).toThrow(/invalid personal ontology bundle/i);
    expect(() => assertSupportedTelemetryImport(validButUnsupportedBundle)).toThrow(/not a work-event import/i);
    expect(activeWorkspace).toEqual({ id: 'active-workspace' });
  });
});
