import { useRef } from 'react';
import type React from 'react';
import { moveThumb, pickThumb, valueFromPosition, type Thumb } from './dualRangeMath';

interface DragOptions {
  min: number;
  max: number;
  low: number;
  high: number;
  step: number;
  onChange: (low: number, high: number) => void;
}

/**
 * Pointer handling for the dual-range track: a press anywhere on the (tall,
 * touch-friendly) track grabs the nearest thumb, jumps it there and keeps
 * following the finger/mouse via pointer capture until release.
 */
export function useDualRangeDrag({ min, max, low, high, step, onChange }: DragOptions) {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<Thumb | null>(null);
  const thumbRefs = { low: useRef<HTMLDivElement>(null), high: useRef<HTMLDivElement>(null) };

  const valueAt = (clientX: number): number | null => {
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return valueFromPosition(clientX, rect.left, rect.width, min, max, step);
  };

  const apply = (thumb: Thumb, value: number) => {
    const [lo, hi] = moveThumb(thumb, value, low, high);
    if (lo !== low || hi !== high) onChange(lo, hi);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const value = valueAt(e.clientX);
    if (value == null) return;
    const thumb = pickThumb(value, low, high, min, max);
    activeRef.current = thumb;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    thumbRefs[thumb].current?.focus({ preventScroll: true });
    e.preventDefault();
    apply(thumb, value);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const thumb = activeRef.current;
    if (!thumb) return;
    const value = valueAt(e.clientX);
    if (value != null) apply(thumb, value);
  };

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    activeRef.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return {
    trackRef,
    thumbRefs,
    trackHandlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end },
  };
}
