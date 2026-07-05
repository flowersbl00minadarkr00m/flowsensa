import type { MeasurementClass, TruthState } from "../domain/types";

interface TruthBadgeProps {
  state: TruthState;
}

export function TruthBadge({ state }: TruthBadgeProps) {
  return <span className={`badge truth-${state}`}>{state}</span>;
}

interface MeasurementBadgeProps {
  measurementClass: MeasurementClass;
}

export function MeasurementBadge({ measurementClass }: MeasurementBadgeProps) {
  return (
    <span className={`badge measure-${measurementClass}`}>
      {measurementClass}
    </span>
  );
}
