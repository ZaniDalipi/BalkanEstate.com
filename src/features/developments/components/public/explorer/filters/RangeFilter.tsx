import React from 'react';
import { DualRange } from '../../../scene/DualRange';

interface RangeFilterProps {
  label: string;
  boundMin: number | null;
  boundMax: number | null;
  valueMin?: number;
  valueMax?: number;
  /** Reports `undefined` for a thumb resting on its bound (= no constraint). */
  onChange: (min: number | undefined, max: number | undefined) => void;
  unit?: string;
  format?: (v: number) => string;
  step?: number;
  minLabel: string;
  maxLabel: string;
}

/** A labelled dual-range slider over the data's bounds; hidden when there is no spread. */
export const RangeFilter: React.FC<RangeFilterProps> = ({
  label,
  boundMin,
  boundMax,
  valueMin,
  valueMax,
  onChange,
  unit,
  format,
  step,
  minLabel,
  maxLabel,
}) => {
  if (boundMin == null || boundMax == null || boundMin === boundMax) return null;
  return (
    <div className="min-w-[200px] flex-1">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {unit ? ` (${unit})` : ''}
      </span>
      <DualRange
        min={boundMin}
        max={boundMax}
        low={Math.max(boundMin, valueMin ?? boundMin)}
        high={Math.min(boundMax, valueMax ?? boundMax)}
        step={step}
        format={format}
        unit={unit}
        minLabel={`${label} ${minLabel}`}
        maxLabel={`${label} ${maxLabel}`}
        onChange={(lo, hi) =>
          // A thumb within one step of its bound means "no limit" (the top step may not land on max).
          onChange(lo < boundMin + (step ?? 1) ? undefined : lo, hi > boundMax - (step ?? 1) ? undefined : hi)
        }
      />
    </div>
  );
};
