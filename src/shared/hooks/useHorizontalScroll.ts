import { useCallback, useEffect, useState } from 'react';
import { pageStep, scrollEdges, wheelToHorizontal, type ScrollEdges } from '@/src/shared/utils/horizontalScroll';

/**
 * Makes a sideways-scrolling row usable with a mouse: tracks whether it can
 * move each way, turns a vertical wheel into sideways scroll while it can,
 * and pages it from arrow buttons. Pass the element from a callback ref.
 */
export function useHorizontalScroll(element: HTMLElement | null) {
  const [edges, setEdges] = useState<ScrollEdges>({ canScrollStart: false, canScrollEnd: false });

  useEffect(() => {
    if (!element) return undefined;
    const update = () => {
      const next = scrollEdges(element);
      setEdges(prev => (prev.canScrollStart === next.canScrollStart && prev.canScrollEnd === next.canScrollEnd ? prev : next));
    };
    const onWheel = (e: WheelEvent) => {
      const dx = wheelToHorizontal(e.deltaX, e.deltaY, scrollEdges(element));
      if (dx === null) return;
      e.preventDefault();
      element.scrollLeft += dx;
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    element.addEventListener('wheel', onWheel, { passive: false });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resize?.observe(element);
    return () => {
      element.removeEventListener('scroll', update);
      element.removeEventListener('wheel', onWheel);
      resize?.disconnect();
    };
  }, [element]);

  const scrollPage = useCallback((direction: -1 | 1, smooth: boolean) => {
    element?.scrollBy({ left: direction * pageStep(element.clientWidth), behavior: smooth ? 'smooth' : 'auto' });
  }, [element]);

  return { ...edges, scrollPage };
}
