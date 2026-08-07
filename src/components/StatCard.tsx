import type { ReactNode } from 'react';

/**
 * Spec 010 FR-007: one stat/KPI card component.
 *
 * Performance Analysis, Resource Usage, and Data → Current Workspace each had
 * their own inline-styled version of the same "label / value / sublabel" tile.
 * They all render this component now, so padding, min-height, and the value
 * type size are defined once (in `.kpi-card`).
 */
interface StatCardProps {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  /** Optional trend slot. Only pass a series that is real and time-labelled. */
  spark?: ReactNode;
}

export function StatCard({ label, value, sublabel, spark }: StatCardProps) {
  return (
    <div className="kpi-card">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {sublabel !== undefined && <span className="kpi-sublabel">{sublabel}</span>}
      {spark && <span className="kpi-spark">{spark}</span>}
    </div>
  );
}

export function StatGrid({ children, columns }: { children: ReactNode; columns?: number }) {
  return (
    <div className="kpi-strip" style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
      {children}
    </div>
  );
}
