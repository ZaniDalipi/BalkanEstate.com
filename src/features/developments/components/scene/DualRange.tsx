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
  /** Formats the readouts (e.g. a price); overrides `unit`. */
  format?: (v: number) => string;
  /** Accessible names of the two thumbs. */
  minLabel?: string;
  maxLabel?: string;
  /** 'dark' for overlays on imagery, 'light' (default) for white panels. */
  tone?: 'light' | 'dark';
}

/**
 * A two-thumb range slider (min + max) on a shared track — the AREA / FLOORS
 * control from the East Gate B2 explorer. Two native range inputs are stacked
 * so each thumb stays independently draggable and keyboard-accessible; the
 * filled segment between them is drawn over the track.
 */
export const DualRange: React.FC<DualRangeProps> = ({
  min,
  max,
  low,
  high,
  step = 1,
  onChange,
  unit,
  format,
  minLabel = 'minimum',
  maxLabel = 'maximum',
  tone = 'light',
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const span = Math.max(1, max - min);
  const pctLow = ((low - min) / span) * 100;
  const pctHigh = ((high - min) / span) * 100;
  const dark = tone === 'dark';
  const accent = '#0252CD';
  const fmt = (v: number) => (format ? format(v) : `${v}${unit ? ` ${unit}` : ''}`);
  const cls = `dr_${id}`;

  return (
    <div className="w-full">
      <style>{`
        .${cls}{position:relative;height:28px}
        .${cls} input[type=range]{position:absolute;top:0;left:0;width:100%;height:28px;margin:0;background:none;pointer-events:none;-webkit-appearance:none;appearance:none}
        .${cls} input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;pointer-events:auto;height:20px;width:20px;border-radius:9999px;background:#fff;border:2px solid ${accent};cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.3)}
        .${cls} input[type=range]::-moz-range-thumb{pointer-events:auto;height:20px;width:20px;border-radius:9999px;background:#fff;border:2px solid ${accent};cursor:pointer}
        .${cls} input[type=range]:focus-visible::-webkit-slider-thumb{outline:2px solid ${accent};outline-offset:2px}
      `}</style>

      <div className={cls}>
        <div className={`absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded ${dark ? 'bg-white/25' : 'bg-slate-200'}`} />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-primary"
          style={{ left: `${pctLow}%`, width: `${Math.max(0, pctHigh - pctLow)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => onChange(Math.min(Number(e.target.value), high), high)}
          aria-label={minLabel}
          aria-valuetext={fmt(low)}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => onChange(low, Math.max(Number(e.target.value), low))}
          aria-label={maxLabel}
          aria-valuetext={fmt(high)}
        />
      </div>

      <div className={`mt-1 flex justify-between text-xs ${dark ? 'text-white/80' : 'text-slate-600'}`}>
        <span>{fmt(low)}</span>
        <span>{fmt(high)}</span>
      </div>
    </div>
  );
};
