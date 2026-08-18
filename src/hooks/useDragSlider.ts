import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';

/**
 * Pointer-driven slider behaviour for the app's custom-rendered sliders.
 *
 * The calculators used to stack a transparent `<input type="range">` on top of
 * hand-drawn track/thumb markup. That works with a mouse but feels broken on a
 * phone: iOS Safari only starts a drag when the touch lands on the (invisible)
 * native thumb, so tapping the track does nothing, and the value only moves
 * once the finger crosses a whole native step — the "jumpy" feel.
 *
 * This hook drives the value from raw pointer coordinates instead:
 *   - press anywhere on the track and the thumb jumps under the finger,
 *   - moves are captured (`setPointerCapture`), so the drag keeps tracking even
 *     when the finger strays off the track,
 *   - updates are coalesced into one `requestAnimationFrame` per frame, so a
 *     120 Hz touch stream can't outrun React's render,
 *   - the geometry accounts for the thumb's width, so the value under the
 *     finger matches the thumb's centre at both ends of the track.
 *
 * The element the props are spread on becomes the slider itself (`role="slider"`
 * with full keyboard support), so no hidden input is needed for accessibility.
 */
export interface UseDragSliderOptions {
  value: number;
  min: number;
  max: number;
  /** Value quantum. Use a small value (or omit) for continuous dragging. */
  step?: number;
  onChange: (value: number) => void;
  /** Fired once when a drag/keyboard interaction begins. */
  onDragStart?: () => void;
  /** Fired once when the interaction ends (pointer up, cancel, or blur). */
  onDragEnd?: () => void;
  disabled?: boolean;
  /** Rendered thumb diameter in px — keeps finger, thumb centre and fill aligned. */
  thumbSize?: number;
  'aria-label'?: string;
  /** Human-readable form of the current value, for screen readers. */
  valueText?: string;
}

export interface UseDragSliderResult {
  /** Current value as 0–100 of the track, safe when the range is degenerate. */
  percent: number;
  /** True while a pointer drag is in progress. */
  isDragging: boolean;
  /**
   * CSS length for the thumb centre (also the correct width for the filled
   * portion of the track), e.g. `calc(40% + 2.8px)`.
   */
  offset: string;
  /** Spread onto the element that visually contains the track. */
  trackProps: {
    ref: React.RefObject<HTMLDivElement>;
    role: 'slider';
    tabIndex: number;
    'aria-valuemin': number;
    'aria-valuemax': number;
    'aria-valuenow': number;
    'aria-valuetext'?: string;
    'aria-label'?: string;
    'aria-disabled'?: boolean;
    'aria-orientation': 'horizontal';
    style: React.CSSProperties;
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
    onLostPointerCapture: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    onBlur: () => void;
  };
}

/** Snap to the step grid, then trim float noise (0.1 steps → 0.30000000000000004). */
function quantize(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, raw));
  if (!(step > 0)) return clamped;
  const snapped = min + Math.round((clamped - min) / step) * step;
  const decimals = (String(step).split('.')[1] || '').length;
  return Math.min(max, Math.max(min, decimals ? Number(snapped.toFixed(decimals)) : snapped));
}

export function useDragSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onDragStart,
  onDragEnd,
  disabled = false,
  thumbSize = 0,
  valueText,
  'aria-label': ariaLabel,
}: UseDragSliderOptions): UseDragSliderResult {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Latest pointer x waiting to be applied, plus the rAF handle that will apply
  // it. Coalescing here means one state update per painted frame at most.
  // `scheduled` is tracked separately from the handle so the "already queued"
  // check stays correct no matter when the callback runs relative to the
  // assignment of the handle.
  const pendingX = useRef<number | null>(null);
  const scheduled = useRef(false);
  const frame = useRef<number | null>(null);
  const activePointer = useRef<number | null>(null);

  // Keep the callbacks in refs so the pointer handlers stay referentially
  // stable across renders (they run on every pointermove).
  const latest = useRef({ min, max, step, onChange, onDragStart, onDragEnd, thumbSize, disabled });
  latest.current = { min, max, step, onChange, onDragStart, onDragEnd, thumbSize, disabled };

  const span = max - min;
  const percent = span > 0 && Number.isFinite(value)
    ? Math.min(100, Math.max(0, ((value - min) / span) * 100))
    : 0;

  // Thumb centre = percent of the *usable* track (full width minus the thumb),
  // shifted right by half a thumb. Expressed as calc() so it stays correct at
  // any container width without measuring during render.
  const shift = ((50 - percent) / 100) * thumbSize;
  const offset = thumbSize > 0
    ? `calc(${percent}% ${shift < 0 ? '-' : '+'} ${Math.abs(shift)}px)`
    : `${percent}%`;

  const cancelFrame = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    scheduled.current = false;
    pendingX.current = null;
  }, []);

  /** Map a viewport x coordinate onto the value range and emit it. */
  const commitX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const { min: lo, max: hi, step: gap, thumbSize: thumb, onChange: emit } = latest.current;
    const usable = Math.max(1, rect.width - thumb);
    const ratio = (clientX - rect.left - thumb / 2) / usable;
    const next = quantize(lo + Math.min(1, Math.max(0, ratio)) * (hi - lo), lo, hi, gap);
    if (Number.isFinite(next)) emit(next);
  }, []);

  const scheduleX = useCallback((clientX: number) => {
    pendingX.current = clientX;
    if (scheduled.current) return;
    scheduled.current = true;
    frame.current = requestAnimationFrame(() => {
      scheduled.current = false;
      const x = pendingX.current;
      pendingX.current = null;
      if (x !== null) commitX(x);
    });
  }, [commitX]);

  const endDrag = useCallback(() => {
    if (activePointer.current === null) return;
    activePointer.current = null;
    // Flush the last coalesced position so the value matches where the finger
    // was lifted rather than the previous frame.
    const x = pendingX.current;
    cancelFrame();
    if (x !== null) commitX(x);
    setIsDragging(false);
    latest.current.onDragEnd?.();
  }, [cancelFrame, commitX]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (latest.current.disabled || e.button > 0) return;
    // Claim the gesture: stops the page from scrolling under the drag and stops
    // the browser from starting a text selection.
    e.preventDefault();
    activePointer.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort; the drag still works without it */
    }
    e.currentTarget.focus({ preventScroll: true });
    setIsDragging(true);
    latest.current.onDragStart?.();
    commitX(e.clientX);
  }, [commitX]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return;
    e.preventDefault();
    scheduleX(e.clientX);
  }, [scheduleX]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return;
    endDrag();
  }, [endDrag]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const { min: lo, max: hi, step: gap, onChange: emit } = latest.current;
    if (latest.current.disabled) return;
    const stride = gap > 0 ? gap : (hi - lo) / 100;
    const page = Math.max(stride, (hi - lo) / 10);
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp': next = value + stride; break;
      case 'ArrowLeft':
      case 'ArrowDown': next = value - stride; break;
      case 'PageUp': next = value + page; break;
      case 'PageDown': next = value - page; break;
      case 'Home': next = lo; break;
      case 'End': next = hi; break;
      default: return;
    }
    e.preventDefault();
    latest.current.onDragStart?.();
    emit(quantize(next, lo, hi, gap));
    latest.current.onDragEnd?.();
  }, [value]);

  const onBlur = useCallback(() => endDrag(), [endDrag]);

  useEffect(() => cancelFrame, [cancelFrame]);

  const trackProps = useMemo(() => ({
    ref: trackRef,
    role: 'slider' as const,
    tabIndex: disabled ? -1 : 0,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': Number.isFinite(value) ? value : min,
    'aria-valuetext': valueText,
    'aria-label': ariaLabel,
    'aria-disabled': disabled || undefined,
    'aria-orientation': 'horizontal' as const,
    style: {
      // The gesture belongs to the slider: never let it scroll the page.
      touchAction: 'none' as const,
      // Suppress the iOS tap highlight / long-press callout on the track.
      WebkitTapHighlightColor: 'transparent',
      WebkitUserSelect: 'none' as const,
      userSelect: 'none' as const,
      cursor: disabled ? 'default' : 'pointer',
    },
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onLostPointerCapture: endDrag,
    onKeyDown,
    onBlur,
  }), [disabled, min, max, value, valueText, ariaLabel, onPointerDown, onPointerMove, onPointerUp, endDrag, onKeyDown, onBlur]);

  return { percent, isDragging, offset, trackProps };
}

export default useDragSlider;
