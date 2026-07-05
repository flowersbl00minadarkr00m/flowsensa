import type { Alert, AlertRule, KPISnapshot } from '../domain/types';

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'r-exception',
    metric: 'exceptionRate',
    threshold: 0.20,
    severity: 'critical',
    description: 'Exception rate exceeded 20%',
  },
  {
    id: 'r-rework',
    metric: 'reworkRate',
    threshold: 0.10,
    severity: 'warning',
    description: 'Rework rate exceeded 10%',
  },
];

let _alertIdCounter = 0;

export function evaluateAlerts(kpis: KPISnapshot, rules: AlertRule[]): Alert[] {
  return rules
    .filter(r => {
      const val = kpis[r.metric];
      return typeof val === 'number' && val > r.threshold;
    })
    .map(r => ({
      id: `alert-${r.id}-${++_alertIdCounter}`,
      ruleId: r.id,
      severity: r.severity,
      description: r.description,
      triggeredValue: kpis[r.metric] as number,
      threshold: r.threshold,
      status: 'active' as const,
      triggeredAt: kpis.calculatedAt,
    }));
}
