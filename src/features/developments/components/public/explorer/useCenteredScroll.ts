import { useLayoutEffect, useRef } from 'react';

/** The scrollLeft that shows the middle of content wider than its box (0 when it fits). */
export const centeredScrollLeft = (scrollWidth: number, clientWidth: number): number =>
  Math.max(0, Math.round((scrollWidth - clientWidth) / 2));

/**
 * Scrolls a sideways scroller to the middle whenever `key` changes (a new
 * picture), so a wide picture opens on its centre, not its left edge. A resize
 * of the content (the picture loading) re-centres it until the buyer scrolls.
 */
export function useCenteredScroll<T extends HTMLElement>(key: string) {
  const ref = useRef<T | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let touched = false;
    const center = () => {
      if (!touched) el.scrollLeft = centeredScrollLeft(el.scrollWidth, el.clientWidth);
    };
    const markTouched = () => {
      touched = true;
    };
    center();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(center) : null;
    if (observer && el.firstElementChild) observer.observe(el.firstElementChild);
    el.addEventListener('pointerdown', markTouched, { passive: true });
    el.addEventListener('wheel', markTouched, { passive: true });
    return () => {
      observer?.disconnect();
      el.removeEventListener('pointerdown', markTouched);
      el.removeEventListener('wheel', markTouched);
    };
  }, [key]);
  return ref;
}
