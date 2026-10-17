import React, { useId } from 'react';

interface DualRangeProps {
  min: number;
  max: number;
  /** Current low/high; default to the bounds. */
  low: number;
  high: number;
  step?: number;
  onChange: (low: number, high: number) => void;
  /** Suffix for the value readouts, e.g. "m²". */
  unit?: string;
}

/**
 * A two-thumb range slider (min + max) on a shared track — the AREA / FLOORS
 * control from the East Gate B2 explorer. Two native range inputs are stacked
 * so each thumb stays independently draggable and keyboard-accessible; the
 * filled segment between them is drawn over the track. Styled dark for the
 * overlay bar.
 */
export const DualRange: React.FC<DualRangeProps> = ({ min, max, low, high, step = 1, onChange, unit }) => {
  const id = useId().replace(/[:]/g, '');
  const span = Math.max(1, max - min);
  const pctLow = ((low - min) / span) * 100;
  const pctHigh = ((high - min) / span) * 100;

  const setLow = (v: number) => onChange(Math.min(v, high), high);
  const setHigh = (v: number) => onChange(low, Math.max(v, low));

  const cls = `dr_${id}`;

  return (
    <div className="w-full">
      {/* Scoped thumb styling for the dark overlay. */}
      <style>{`
        .${cls}{position:relative;height:24px}
        .${cls} input[type=range]{position:absolute;top:0;left:0;width:100%;height:24px;margin:0;background:none;pointer-events:none;-webkit-appearance:none;appearance:none}
        .${cls} input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;pointer-events:auto;height:16px;width:16px;border-radius:3px;background:#fff;border:2px solid #2dd4bf;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.4)}
        .${cls} input[type=range]::-moz-range-thumb{pointer-events:auto;height:16px;width:16px;border-radius:3px;background:#fff;border:2px solid #2dd4bf;cursor:pointer}
      `}</style>

      <div className={cls}>
        {/* Track */}
        <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-white/25" />
        {/* Filled segment */}
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded bg-teal-400"
          style={{ left: `${pctLow}%`, width: `${Math.max(0, pctHigh - pctLow)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => setLow(Number(e.target.value))}
          aria-label="minimum"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => setHigh(Number(e.target.value))}
          aria-label="maximum"
        />
      </div>

      <div className="mt-1 flex justify-between text-xs text-white/80">
        <span>{low}{unit ? ` ${unit}` : ''}</span>
        <span>{high}{unit ? ` ${unit}` : ''}</span>
      </div>
    </div>
  );
};
