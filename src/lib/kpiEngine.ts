import type { KPISnapshot, ProcessGraph, WorkEvent } from '../domain/types';

export function calculateKPIs(events: WorkEvent[], graph: ProcessGraph | undefined): KPISnapshot {
  if (!graph || events.length === 0) {
    return {
      caseCount: 0,
      medianThroughputMs: 0,
      exceptionRate: 0,
      reworkRate: 0,
      automationCoverageRate: 0,
      calculatedAt: new Date().toISOString(),
    };
  }
  const cases = [...new Set(events.map(e => e.caseId))];
  const caseCount = cases.length;
  const exceptions = events.filter(e =>
    ['failure', 'exception', 'retry', 'rollback'].includes(e.result.status)
  ).length;
  const exceptionRate = events.length ? exceptions / events.length : 0;
  const repeats = graph.nodes.reduce((s, n) => s + n.repeats, 0);
  const reworkRate = events.length ? repeats / events.length : 0;
  const caseDurations: number[] = [];
  for (const caseId of cases) {
    const caseEvents = events.filter(e => e.caseId === caseId);
    const times = caseEvents
      .map(e => Date.parse(e.timestamp))
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);
    if (times.length >= 2) caseDurations.push(times[times.length - 1] - times[0]);
  }
  caseDurations.sort((a, b) => a - b);
  const medianThroughputMs = caseDurations.length
    ? caseDurations[Math.floor(caseDurations.length / 2)]
    : 0;
  const confirmedNodes = graph.nodes.filter(n => n.status === 'confirmed').length;
  const automationCoverageRate = graph.nodes.length
    ? confirmedNodes / graph.nodes.length
    : 0;
  return {
    caseCount,
    medianThroughputMs,
    exceptionRate,
    reworkRate,
    automationCoverageRate,
    calculatedAt: new Date().toISOString(),
  };
}
