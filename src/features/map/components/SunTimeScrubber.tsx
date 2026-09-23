// SunTimeScrubber
// Time-of-day scrubber and date stepper for the 3D map's Sun & Shadows panel.
//
// Deliberately NOT <input type="range"> / <input type="date">: newer Safari
// renders those with native "liquid glass" overlays (a magnifying thumb while
// dragging, a picker popover) that float over the map and hide the shadows
// being inspected. Everything here is drawn by us and stays inside the panel.

import React, { useCallback, useRef } from 'react';

interface SunTimeScrubberProps {
  /** 0-100 position along the day. */
  progress: number;
  onScrub: (progress: number) => void;
  onScrubStart?: () => void;
  label: string;
  valueText: string;
}

export const SunTimeScrubber: React.FC<SunTimeScrubberProps> = ({
  progress,
  onScrub,
  onScrubStart,
  label,
  valueText,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const clamped = Math.max(0, Math.min(100, progress));

  const scrubTo = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    onScrub(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, [onScrub]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onScrubStart?.();
    scrubTo(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) scrubTo(e.clientX);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clamped + step;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clamped - step;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 100;
    if (next === null) return;
    e.preventDefault();
    onScrubStart?.();
    onScrub(Math.max(0, Math.min(100, next)));
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={valueText}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onKeyDown={handleKeyDown}
      // touch-action: none keeps a horizontal drag from scrolling the page
      className="relative h-5 flex items-center cursor-pointer touch-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-full"
    >
      <div className="relative w-full h-1.5 sm:h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full" style={{ width: `${clamped}%` }} />
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-full shadow-md pointer-events-none"
        style={{ left: `calc(${clamped}% - 8px)` }}
      />
    </div>
  );
};

interface SunDateStepperProps {
  date: Date;
  onChange: (date: Date) => void;
  locale: string;
  labels: { prevMonth: string; prevDay: string; nextDay: string; nextMonth: string; today: string };
}

const shiftDate = (date: Date, days: number, months: number): Date => {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  // Keep the day of month, clamped to the target month's length
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), lastDay) + days);
  return next;
};

/** Date picker made of step buttons; tapping the date jumps back to today. */
export const SunDateStepper: React.FC<SunDateStepperProps> = ({ date, onChange, locale, labels }) => {
  let formatted: string;
  try {
    formatted = date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } catch {
    formatted = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  const button = 'px-1.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] sm:text-xs leading-none transition-colors';

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <button type="button" className={button} onClick={() => onChange(shiftDate(date, 0, -1))} aria-label={labels.prevMonth} title={labels.prevMonth}>«</button>
      <button type="button" className={button} onClick={() => onChange(shiftDate(date, -1, 0))} aria-label={labels.prevDay} title={labels.prevDay}>‹</button>
      <button
        type="button"
        onClick={() => onChange(new Date())}
        title={labels.today}
        className="flex-1 min-w-0 px-1 py-1 rounded-md bg-slate-800/60 hover:bg-slate-700 text-slate-100 text-[10px] sm:text-xs font-medium truncate transition-colors"
      >
        {formatted}
      </button>
      <button type="button" className={button} onClick={() => onChange(shiftDate(date, 1, 0))} aria-label={labels.nextDay} title={labels.nextDay}>›</button>
      <button type="button" className={button} onClick={() => onChange(shiftDate(date, 0, 1))} aria-label={labels.nextMonth} title={labels.nextMonth}>»</button>
    </div>
  );
};
