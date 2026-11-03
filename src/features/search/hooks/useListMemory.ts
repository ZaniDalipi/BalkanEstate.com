import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Remember where the visitor was in the results while the list is taken off
 * the page, and put them back there when it returns.
 *
 * On a phone the list is released (unmounted) once it has slid behind the map,
 * because keeping hundreds of photos alive next to a WebGL map is what gets
 * Safari to kill the tab. What the unmounted list loses is its scroll offset
 * and how many cards it had paged in; this keeps both, so coming back from the
 * map lands on the same card. A change of filters starts the results over.
 *
 * `released` is true while the list is not rendered.
 */
export function useListMemory(released: boolean, filtersKey: unknown) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollTop = useRef(0);
  const visibleCount = useRef<number | undefined>(undefined);

  // Scroll does not bubble, but it can be captured on the way down.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.hasAttribute('data-scroll-container')) {
        scrollTop.current = target.scrollTop;
      }
    };
    panel.addEventListener('scroll', onScroll, true);
    return () => panel.removeEventListener('scroll', onScroll, true);
  }, []);

  // New criteria, new results: do not return to the old position.
  useEffect(() => {
    scrollTop.current = 0;
    visibleCount.current = undefined;
  }, [filtersKey]);

  // The list is back in the DOM: restore the offset before it is painted.
  useLayoutEffect(() => {
    if (released || scrollTop.current <= 0) return;
    const container = panelRef.current?.querySelector<HTMLElement>('[data-scroll-container]');
    if (container) container.scrollTop = scrollTop.current;
  }, [released]);

  const onVisibleCountChange = useCallback((count: number) => {
    visibleCount.current = count;
  }, []);

  return {
    panelRef,
    /** Cards to start with when the list comes back. */
    initialVisibleCount: visibleCount.current,
    onVisibleCountChange,
  };
}

export default useListMemory;
