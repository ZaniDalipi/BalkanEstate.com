/**
 * Where the property page's sections sit, for the "On this page" menu.
 *
 * Two things make menu order a poor guide:
 *   - sections live in two columns, and the right one (quick actions,
 *     calculators) is sticky on desktop: it stays on screen, so its position
 *     says nothing about how far the reader has scrolled;
 *   - some sections sit inside others (air quality inside the neighbourhood).
 * So the menu is ordered by where each section really is, and the current
 * section is the one that most recently reached the top of the screen,
 * ignoring sticky ones.
 */

export interface SectionPosition {
  key: string;
  /** Viewport top of the section as laid out now, in px. */
  top: number;
  /** Inside a sticky or fixed container: always on screen, never "current". */
  pinned: boolean;
}

/**
 * The section the reader is in: of the unpinned sections whose top has
 * reached the `line` (px from the viewport top), the one nearest to it; on a
 * tie the later one (a section nested at the start of another). Before any
 * has, the page top.
 *
 * At the very bottom of the page the last sections can never reach the line,
 * so there it is the lowest unpinned section that has come into view
 * (`viewportHeight` given).
 */
export const pickActiveSection = (
  positions: SectionPosition[],
  line: number,
  fallback = 'top',
  atBottom?: { viewportHeight: number }
): string => {
  let best: SectionPosition | null = null;
  const reach = atBottom ? atBottom.viewportHeight : line;
  for (const p of positions) {
    if (p.pinned || p.top > reach) continue;
    if (!best || p.top >= best.top) best = p;
  }
  return best ? best.key : fallback;
};

/** Keys sorted top to bottom by their natural page position; ties keep their given order. */
export const orderByPosition = (positions: Array<{ key: string; naturalTop: number }>): string[] =>
  positions
    .map((p, index) => ({ ...p, index }))
    .sort((a, b) => a.naturalTop - b.naturalTop || a.index - b.index)
    .map((p) => p.key);

/** The nearest ancestor (or the element) that is sticky or fixed, if any. */
export const pinnedContainer = (el: HTMLElement): HTMLElement | null => {
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    const position = getComputedStyle(node).position;
    if (position === 'sticky' || position === 'fixed') return node;
  }
  return null;
};

/**
 * Where a section sits in the page's own flow, measured now (all sections are
 * measured in one go, so a shared scroll offset cancels out). A section in a
 * sticky container counts from where that container's column starts, not
 * from where it happens to be pinned.
 */
export const naturalTop = (el: HTMLElement, pinned: HTMLElement | null): number => {
  const top = el.getBoundingClientRect().top;
  if (!pinned?.parentElement) return top;
  return pinned.parentElement.getBoundingClientRect().top + (top - pinned.getBoundingClientRect().top);
};
