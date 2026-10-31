/** Share of the screen above the half-height sheet where the open apartment should sit (its middle). */
export const REVEAL_AT = 0.22;

/**
 * How far to scroll so an element's middle lands at `at` of the viewport
 * height; an element taller than the space above the sheet is lined up by its
 * top instead. Positive scrolls down.
 */
export function revealDelta(rect: { top: number; height: number }, viewportHeight: number, visibleHeight: number, at = REVEAL_AT): number {
  if (rect.height > visibleHeight) return Math.round(rect.top - 8);
  return Math.round(rect.top + rect.height / 2 - viewportHeight * at);
}

/** The nearest ancestor that scrolls vertically, or the page. */
function scrollParent(el: HTMLElement): HTMLElement | Window {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if ((overflowY === 'auto' || overflowY === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return window;
}

/**
 * Scroll the open apartment (marked `data-unit-id`) inside `container` — or
 * the container itself when the apartment isn't drawn — into the space above
 * a sheet covering `sheetShare` of the screen.
 */
export function revealAboveSheet(container: HTMLElement, unitId: string, sheetShare: number, smooth: boolean): void {
  const target = container.querySelector<HTMLElement | SVGElement>(`[data-unit-id="${CSS.escape(unitId)}"]`) ?? container;
  const viewport = window.innerHeight;
  const delta = revealDelta(target.getBoundingClientRect(), viewport, viewport * (1 - sheetShare));
  if (delta === 0) return;
  scrollParent(container).scrollBy({ top: delta, behavior: smooth ? 'smooth' : 'auto' });
}
