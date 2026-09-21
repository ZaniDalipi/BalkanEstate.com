import { useCallback, useEffect, useRef, useState } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Tracks an element's rendered size.
 *
 * Sizes are rounded to `step` before being reported, because the callers that
 * need this are feeding the number into an iframe URL: reporting every pixel of
 * a drag or an orientation change would reload the embed on each frame. A step
 * of a few dozen pixels is finer than any layout the eye can catch and reloads
 * only when the box genuinely changes shape.
 *
 * Returns zeroes until the element is measured, so callers can hold off on
 * anything that needs a real width.
 */
export const useElementSize = (step = 40): [(node: HTMLElement | null) => void, ElementSize] => {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback((node: HTMLElement) => {
    const round = (value: number) => Math.max(step, Math.ceil(value / step) * step);
    const { width, height } = node.getBoundingClientRect();
    if (width === 0 && height === 0) return;

    setSize((prev) => {
      const next = { width: round(width), height: round(height) };
      return prev.width === next.width && prev.height === next.height ? prev : next;
    });
  }, [step]);

  const ref = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    measure(node);

    // Absent in jsdom and older Safari; the element then keeps its first measurement.
    if (typeof ResizeObserver === 'undefined') return;
    observerRef.current = new ResizeObserver(() => measure(node));
    observerRef.current.observe(node);
  }, [measure]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [ref, size];
};
