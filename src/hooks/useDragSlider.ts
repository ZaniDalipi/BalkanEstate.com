import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
 *   - a press that lands *on* the thumb grabs it instead, so the value never
 *     leaps out from under a fingertip that was a few px off centre — the
 *     difference between "usable" and "feels native" for fine adjustments,
 *   - moves are captured (`setPointerCapture`), so the drag keeps tracking even
 *     when the finger strays off the track (above it, below it, past its end),
 *   - updates are coalesced into one `requestAnimationFrame` per frame, so a
 *     120 Hz touch stream can't outrun React's render,
 *   - the thumb's position is published as a CSS variable written straight to
 *     the DOM in that frame, so what the finger sees never waits on React: a
 *     slow re-render further up (a recalculating results panel, say) can no
 *     longer make the thumb stutter behind the finger,
 *   - where the browser offers `pointerrawupdate` the drag reads that instead,
 *     which delivers positions ahead of `pointermove` and shaves a frame of
 *     latency off the gesture,
 *   - a short haptic tick fires on each value change, the way a native picker
 *     does, on devices that support the Vibration API,
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
  /**
   * Extra px on each side of the thumb where a press grabs the thumb (relative
   * drag) instead of jumping the value to the finger. Roughly "how far off the
   * thumb a fingertip may land and still be treated as grabbing it".
   */
  grabSlop?: number;
  /** Emit a short vibration on each value change during a drag. Default true. */
  haptics?: boolean;
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
   * portion of the track).
   *
   * Reads the `--slider-pos` variable the hook writes on the track element,
   * falling back to a value-derived `calc(40% + 2.8px)` for the first paint
   * (and for prerendered HTML, before hydration). Consumers should spread it
   * into a property that accepts a length — `left`, or inside a `calc()`.
   */
  offset: string;
  /** Name of the CSS variable carrying the live thumb position, in px. */
  positionVar: '--slider-pos';
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
    onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => void;
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

/** CSS variable the live thumb position is published on. */
const POSITION_VAR = '--slider-pos';

/** Shortest pulse most phones will actually render, in ms. */
const HAPTIC_MS = 5;
/** Don't buzz more often than this — a fast drag would otherwise stutter. */
const HAPTIC_INTERVAL_MS = 24;

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
  grabSlop = 14,
  haptics = true,
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
  /**
   * Distance between the finger and the thumb centre when the drag started.
   * Non-zero only when the press landed on the thumb: subtracting it keeps the
   * thumb exactly where it was grabbed instead of snapping it under the finger.
   */
  const grabDelta = useRef(0);
  /** Last value this hook emitted, so an unchanged value costs no render. */
  const lastEmitted = useRef<number | null>(null);
  const lastBuzz = useRef(0);
  /** Track width, kept fresh by a ResizeObserver so drags never measure. */
  const trackWidth = useRef(0);

  // Keep the callbacks in refs so the pointer handlers stay referentially
  // stable across renders (they run on every pointermove).
  const latest = useRef({ value, min, max, step, onChange, onDragStart, onDragEnd, thumbSize, grabSlop, haptics, disabled });
  latest.current = { value, min, max, step, onChange, onDragStart, onDragEnd, thumbSize, grabSlop, haptics, disabled };

  const span = max - min;
  const percent = span > 0 && Number.isFinite(value)
    ? Math.min(100, Math.max(0, ((value - min) / span) * 100))
    : 0;

  // Thumb centre = percent of the *usable* track (full width minus the thumb),
  // shifted right by half a thumb. Expressed as calc() so it stays correct at
  // any container width without measuring during render — this is the fallback
  // the first paint uses, before the effect below writes a real px position.
  const shift = ((50 - percent) / 100) * thumbSize;
  const fallbackOffset = thumbSize > 0
    ? `calc(${percent}% ${shift < 0 ? '-' : '+'} ${Math.abs(shift)}px)`
    : `${percent}%`;
  const offset = `var(${POSITION_VAR}, ${fallbackOffset})`;

  /**
   * Publish the thumb position straight to the DOM.
   *
   * This is the whole reason a drag feels attached to the finger: the value
   * still travels through React (the numbers, the colour band, the results all
   * need it), but the thumb and the fill read a CSS variable that is written
   * inside the same frame the pointer moved. Whatever React does afterwards,
   * however long it takes, the thumb has already moved.
   */
  const writeVisual = useCallback((ratio: number) => {
    const el = trackRef.current;
    if (!el) return;
    const width = trackWidth.current || el.getBoundingClientRect().width;
    if (!(width > 0)) return;
    const thumb = latest.current.thumbSize;
    const clamped = Math.min(1, Math.max(0, ratio));
    const px = thumb / 2 + clamped * Math.max(0, width - thumb);
    el.style.setProperty(POSITION_VAR, `${Math.round(px * 100) / 100}px`);
  }, []);

  /** Where a value sits on the track, 0–1. */
  const ratioOf = useCallback((v: number) => {
    const { min: lo, max: hi } = latest.current;
    const range = hi - lo;
    return range > 0 && Number.isFinite(v) ? Math.min(1, Math.max(0, (v - lo) / range)) : 0;
  }, []);

  const cancelFrame = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    scheduled.current = false;
    pendingX.current = null;
  }, []);

  /** A tiny tick on each step, so a touch drag feels mechanical rather than inert. */
  const buzz = useCallback(() => {
    if (!latest.current.haptics) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    const now = Date.now();
    if (now - lastBuzz.current < HAPTIC_INTERVAL_MS) return;
    lastBuzz.current = now;
    try {
      navigator.vibrate(HAPTIC_MS);
    } catch {
      /* vibration is a nicety; never let it break the drag */
    }
  }, []);

  /** Thumb centre in px from the track's left edge, for the current value. */
  const thumbCentreFor = useCallback((width: number): number => {
    const { min: lo, max: hi, thumbSize: thumb, value: current } = latest.current;
    const range = hi - lo;
    const ratio = range > 0 && Number.isFinite(current)
      ? Math.min(1, Math.max(0, (current - lo) / range))
      : 0;
    return thumb / 2 + ratio * Math.max(1, width - thumb);
  }, []);

  /** Map a viewport x coordinate onto the value range and emit it. */
  const commitX = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const { min: lo, max: hi, step: gap, thumbSize: thumb, onChange: emit } = latest.current;
    const usable = Math.max(1, rect.width - thumb);
    const ratio = (clientX - grabDelta.current - rect.left - thumb / 2) / usable;
    const clamped = Math.min(1, Math.max(0, ratio));
    const next = quantize(lo + clamped * (hi - lo), lo, hi, gap);
    if (!Number.isFinite(next)) return;
    // Move the thumb first, every frame, whether or not the value changed:
    // this is the part the finger is watching. Mid-drag it follows the finger
    // itself rather than the step grid — a 30-stop slider is ~11px per step, and
    // hopping between those stops is exactly what reads as "not smooth". The
    // readout still snaps, and the thumb settles onto its stop on release.
    writeVisual(activePointer.current !== null ? clamped : ratioOf(next));
    if (next === lastEmitted.current) return;
    lastEmitted.current = next;
    if (activePointer.current !== null) buzz();
    emit(next);
  }, [buzz, ratioOf, writeVisual]);

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
    // Flush the last coalesced position so the value matches where the finger
    // was lifted rather than the previous frame. Clearing the pointer first
    // makes that flush settle the thumb onto its step instead of leaving it
    // wherever the finger happened to stop.
    const x = pendingX.current;
    cancelFrame();
    activePointer.current = null;
    if (x !== null) commitX(x);
    grabDelta.current = 0;
    const settled = lastEmitted.current ?? latest.current.value;
    if (Number.isFinite(settled)) writeVisual(ratioOf(settled));
    setIsDragging(false);
    latest.current.onDragEnd?.();
  }, [cancelFrame, commitX, ratioOf, writeVisual]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (latest.current.disabled || e.button > 0) return;
    // Claim the gesture: stops the page from scrolling under the drag and stops
    // the browser from starting a text selection.
    e.preventDefault();
    activePointer.current = e.pointerId;
    // The external value may have been changed by something other than this
    // hook (mode toggle, typed input) since the last drag, so re-seed the
    // "already emitted" guard before comparing against it.
    lastEmitted.current = Number.isFinite(latest.current.value) ? latest.current.value : null;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort; the drag still works without it */
    }
    e.currentTarget.focus({ preventScroll: true });
    setIsDragging(true);
    latest.current.onDragStart?.();

    // Press on (or near) the thumb → grab it and drag relatively. Press
    // elsewhere → jump the value to the finger, then track it.
    const rect = e.currentTarget.getBoundingClientRect();
    const centre = rect.left + thumbCentreFor(rect.width);
    const reach = latest.current.thumbSize / 2 + latest.current.grabSlop;
    const distance = e.clientX - centre;
    if (Math.abs(distance) <= reach) {
      grabDelta.current = distance;
      return; // value unchanged: the thumb stays put under the finger
    }
    grabDelta.current = 0;
    commitX(e.clientX);
  }, [commitX, thumbCentreFor]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return;
    e.preventDefault();
    scheduleX(e.clientX);
  }, [scheduleX]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== e.pointerId) return;
    endDrag();
  }, [endDrag]);

  // A long press on the track is a drag, not a request for the iOS callout or
  // the desktop context menu.
  const onContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activePointer.current !== null) e.preventDefault();
  }, []);

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
    const snapped = quantize(next, lo, hi, gap);
    lastEmitted.current = snapped;
    emit(snapped);
    latest.current.onDragEnd?.();
  }, [value]);

  const onBlur = useCallback(() => endDrag(), [endDrag]);

  useEffect(() => cancelFrame, [cancelFrame]);

  // Measure once and then only when the layout actually changes, so no frame of
  // a drag ever pays for a forced reflow.
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => {
      trackWidth.current = el.getBoundingClientRect().width;
      if (activePointer.current === null) writeVisual(ratioOf(latest.current.value));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ratioOf, writeVisual]);

  // Keep the published position in step with values that arrive from anywhere
  // but a drag: the keyboard, a typed figure, a mode switch, a new property.
  useLayoutEffect(() => {
    if (activePointer.current !== null) return;
    writeVisual(percent / 100);
  }, [percent, thumbSize, writeVisual]);

  /**
   * `pointerrawupdate` reports moves as the OS delivers them rather than once
   * per frame, so pairing it with the rAF coalescing above means each painted
   * frame uses the freshest position instead of one up to a frame old. Chrome
   * and Edge only; everywhere else the pointermove handler is the whole story.
   */
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !isDragging) return;
    if (typeof window === 'undefined' || !('onpointerrawupdate' in window)) return;
    const onRaw = (event: Event) => {
      const e = event as PointerEvent;
      if (activePointer.current !== e.pointerId) return;
      scheduleX(e.clientX);
    };
    el.addEventListener('pointerrawupdate', onRaw);
    return () => el.removeEventListener('pointerrawupdate', onRaw);
  }, [isDragging, scheduleX]);

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
      WebkitTouchCallout: 'none' as const,
      WebkitUserSelect: 'none' as const,
      userSelect: 'none' as const,
      cursor: disabled ? 'default' : 'pointer',
    },
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onLostPointerCapture: endDrag,
    onContextMenu,
    onKeyDown,
    onBlur,
  }), [disabled, min, max, value, valueText, ariaLabel, onPointerDown, onPointerMove, onPointerUp, endDrag, onContextMenu, onKeyDown, onBlur]);

  return { percent, isDragging, offset, positionVar: POSITION_VAR, trackProps };
}

export default useDragSlider;
