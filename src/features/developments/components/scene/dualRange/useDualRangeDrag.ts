import { useEffect, useRef, useState } from 'react';
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

/** How often a drag reports to the parent (which re-filters the page). */
const COMMIT_INTERVAL_MS = 120;

/**
 * Pointer handling for the dual-range track: a press anywhere on the (tall,
 * touch-friendly) track grabs the nearest thumb, jumps it there and keeps
 * following the finger/mouse via pointer capture until release.
 *
 * While dragging, the thumbs follow a local draft so they move on every frame;
 * the parent hears about it at most every COMMIT_INTERVAL_MS and once more on
 * release, so heavy re-filtering never makes the slider lag behind the finger.
 */
export function useDualRangeDrag({ min, max, low, high, step, onChange }: DragOptions) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRefs = { low: useRef<HTMLDivElement>(null), high: useRef<HTMLDivElement>(null) };
  const activeRef = useRef<Thumb | null>(null);
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const draftRef = useRef<[number, number] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommitRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const commit = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    lastCommitRef.current = Date.now();
    const d = draftRef.current;
    if (d) onChangeRef.current(d[0], d[1]);
  };

  const scheduleCommit = () => {
    const wait = COMMIT_INTERVAL_MS - (Date.now() - lastCommitRef.current);
    if (wait <= 0) commit();
    else if (!timerRef.current) timerRef.current = setTimeout(commit, wait);
  };

  const valueAt = (clientX: number): number | null => {
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return valueFromPosition(clientX, rect.left, rect.width, min, max, step);
  };

  const apply = (thumb: Thumb, value: number) => {
    const [curLo, curHi] = draftRef.current ?? [low, high];
    const next = moveThumb(thumb, value, curLo, curHi);
    if (next[0] === curLo && next[1] === curHi) return;
    draftRef.current = next;
    setDraft(next);
    scheduleCommit();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const value = valueAt(e.clientX);
    if (value == null) return;
    const thumb = pickThumb(value, low, high, min, max);
    activeRef.current = thumb;
    draftRef.current = [low, high];
    e.currentTarget.setPointerCapture?.(e.pointerId);
    thumbRefs[thumb].current?.focus({ preventScroll: true });
    e.preventDefault();
    apply(thumb, value);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const thumb = activeRef.current;
    if (!thumb) return;
    e.preventDefault();
    const value = valueAt(e.clientX);
    if (value != null) apply(thumb, value);
  };

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeRef.current) return;
    activeRef.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (timerRef.current || (draftRef.current && (draftRef.current[0] !== low || draftRef.current[1] !== high))) commit();
    draftRef.current = null;
    setDraft(null);
  };

  return {
    trackRef,
    thumbRefs,
    /** What to draw: the live drag position, else the committed values. */
    shown: draft ?? ([low, high] as [number, number]),
    dragging: draft !== null,
    trackHandlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end },
  };
}
