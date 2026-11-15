/** How far a horizontal scroller can still move each way. */
export interface ScrollEdges {
  canScrollStart: boolean;
  canScrollEnd: boolean;
}

/** 1px slack: browsers report fractional scroll positions at some zoom levels. */
const SLACK = 1;

export function scrollEdges(m: { scrollLeft: number; scrollWidth: number; clientWidth: number }): ScrollEdges {
  return {
    canScrollStart: m.scrollLeft > SLACK,
    canScrollEnd: m.scrollLeft + m.clientWidth < m.scrollWidth - SLACK,
  };
}

/**
 * The horizontal distance a wheel event should scroll a sideways row, or null
 * to leave the event to the page. A mainly-vertical wheel (a plain mouse)
 * turns sideways, but only while the row can still move that way, so at
 * either end the page scrolls on as normal. A mainly-horizontal gesture
 * (trackpad swipe) is already native: left alone.
 */
export function wheelToHorizontal(deltaX: number, deltaY: number, edges: ScrollEdges): number | null {
  if (deltaY === 0 || Math.abs(deltaX) >= Math.abs(deltaY)) return null;
  if (deltaY < 0 && !edges.canScrollStart) return null;
  if (deltaY > 0 && !edges.canScrollEnd) return null;
  return deltaY;
}

/** One arrow click moves most of a view, keeping a chip of context. */
export function pageStep(clientWidth: number): number {
  return Math.max(120, Math.round(clientWidth * 0.75));
}
