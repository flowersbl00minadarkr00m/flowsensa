import type { WorkEvent } from '../domain/types';

const DEMO_CASE_PREFIX = 'demo-case';
const DEMO_PROCESS_ID = 'post-and-code-workflow';

export function emitDemoEvent(counter: number): WorkEvent {
  const activities = [
    {
      id: 'act-draft-post',
      label: 'Draft LinkedIn post',
      type: 'intake' as const,
      actorType: 'human' as const,
      actorId: 'henry-f',
      intent: 'Create engaging LinkedIn post about process automation',
    },
    {
      id: 'act-commit-code',
      label: 'Commit code change',
      type: 'execute' as const,
      actorType: 'agent' as const,
      actorId: 'codex-agent',
      intent: 'Implement feature based on approved spec',
    },
    {
      id: 'act-review',
      label: 'Review and approve',
      type: 'review' as const,
      actorType: 'human' as const,
      actorId: 'henry-f',
      intent: 'Review output and approve for publishing',
    },
    {
      id: 'act-publish',
      label: 'Publish post',
      type: 'handoff' as const,
      actorType: 'agent' as const,
      actorId: 'linkedin-agent',
      intent: 'Publish approved post to LinkedIn feed',
    },
  ];

  const idx = counter % 4;
  const act = activities[idx];
  const caseNum = Math.floor(counter / 4) + 1;
  const now = new Date().toISOString();
  const eventId = `demo-ev-${String(counter).padStart(4, '0')}`;
  const durations = [4500, 12000, 8000, 2000];

  return {
    eventId,
    caseId: `${DEMO_CASE_PREFIX}-${String(caseNum).padStart(3, '0')}`,
    timestamp: now,
    sequence: (idx + 1),
    durationMs: durations[idx],
    intent: act.intent,
    activity: { id: act.id, label: act.label, type: act.type, primitiveVersion: '1.0.0' },
    actor: {
      id: act.actorId,
      label: act.actorId === 'henry-f' ? 'Henry Featherstone' : act.actorId,
      type: act.actorType,
    },
    result: { status: 'success' },
    truthState: 'observed',
    provenance: {
      sourceType: 'mnemosync',
      sourceRef: `mnemosync://demo/${DEMO_PROCESS_ID}`,
      ingestedAt: now,
    },
    tags: ['showcase-demo', 'live-demo'],
  };
}
