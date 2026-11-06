import React from 'react';
import { valueForKey, moveThumb, type Thumb } from './dualRangeMath';
import { useDualRangeDrag } from './useDualRangeDrag';

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
 * control of the development explorer. Pointer-driven rather than stacked
 * native range inputs, which iOS Safari won't let you drag: the whole 44px-tall
 * track is the touch target, a press grabs the nearest thumb and drags it.
 * Each thumb is a focusable `role="slider"` for keyboard and screen readers.
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
  const { trackRef, thumbRefs, trackHandlers } = useDualRangeDrag({ min, max, low, high, step, onChange });
  const span = Math.max(1, max - min);
  const pct = (v: number) => ((v - min) / span) * 100;
  const dark = tone === 'dark';
  const fmt = (v: number) => (format ? format(v) : `${v}${unit ? ` ${unit}` : ''}`);

  const onKeyDown = (thumb: Thumb) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    const next = valueForKey(e.key, thumb === 'low' ? low : high, min, max, step);
    if (next == null) return;
    e.preventDefault();
    const [lo, hi] = moveThumb(thumb, next, low, high);
    if (lo !== low || hi !== high) onChange(lo, hi);
  };

  const renderThumb = (thumb: Thumb) => {
    const value = thumb === 'low' ? low : high;
    return (
      <div
        ref={thumbRefs[thumb]}
        role="slider"
        tabIndex={0}
        aria-label={thumb === 'low' ? minLabel : maxLabel}
        aria-valuemin={thumb === 'low' ? min : low}
        aria-valuemax={thumb === 'low' ? high : max}
        aria-valuenow={value}
        aria-valuetext={fmt(value)}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown(thumb)}
        className="group absolute top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center outline-none"
        style={{ left: `${pct(value)}%` }}
      >
        <span className="h-6 w-6 rounded-full border-2 border-primary bg-white shadow-md transition-transform group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2 group-active:scale-110" />
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Inset by half a thumb so the thumbs stay inside the panel at the ends. */}
      <div className="px-3">
        <div
          ref={trackRef}
          {...trackHandlers}
          className="relative h-11 cursor-pointer select-none"
          style={{ touchAction: 'none' }}
        >
          <div className={`absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full ${dark ? 'bg-white/25' : 'bg-slate-200'}`} />
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
            style={{ left: `${pct(low)}%`, width: `${Math.max(0, pct(high) - pct(low))}%` }}
          />
          {renderThumb('low')}
          {renderThumb('high')}
        </div>
      </div>

      <div className={`flex justify-between text-xs ${dark ? 'text-white/80' : 'text-slate-600'}`}>
        <span>{fmt(low)}</span>
        <span>{fmt(high)}</span>
      </div>
    </div>
  );
};
