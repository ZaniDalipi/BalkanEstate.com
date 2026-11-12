/**
 * Hiding the list in split view, so the map takes the whole page.
 *
 * Search, Rentals and Villas lay the list and the map side by side on a
 * desktop. The visitor can fold the list away; the map then grows into its
 * place. One rule for all three pages lives here: change it here, not in a page.
 *
 * How it moves: in split view the list is positioned over the left of the row
 * and the map is pushed to the right (`ml-auto`). Collapsing slides the list
 * out (`translate`, compositor only, so its cards never re-lay out) while the
 * map's width grows to the full row. Both move on the same spring (opening
 * lands with a small overshoot, closing settles without one), so the list's
 * right edge and the map's left edge stay together the whole way. The
 * list turns `invisible` once the slide is over (visibility transitions
 * discretely and stays visible until the end), which also takes it out of the
 * tab order and the accessibility tree while it is folded away.
 *
 * Phones and tablets are untouched: they show one panel at a time with the
 * List / Map switch (see `searchLayout.ts` and `panelHandoff.ts`).
 */

/** The `id` of the list panel, for the toggle's `aria-controls`. One search page is on screen at a time. */
export const SEARCH_LIST_PANEL_ID = 'search-list-panel';

/** Opening: a spring that lands with a ~1% overshoot (`--ease-split-open` in src/index.css). */
export const LIST_OPEN_MS = 700;
/** Closing: a critically damped spring, no bounce (`--ease-split-close`). */
export const LIST_CLOSE_MS = 500;

// Tailwind only sees whole class names, so each string is written out in full.
// The duration a transition uses is the one on the state it moves *to*:
// open classes time the opening, collapsed classes time the closing.
const REDUCED = 'lg:motion-reduce:transition-none lg:motion-reduce:*:transition-none';
const LIST_OPEN = 'lg:duration-700 lg:ease-split-open lg:*:duration-700 lg:*:ease-split-open lg:*:delay-[60ms]';
const LIST_CLOSED = 'lg:duration-500 lg:ease-split-close lg:*:duration-500 lg:*:ease-split-close';

/**
 * Whether the list is folded away right now. The stored preference only
 * applies to split view: on a phone or tablet the List / Map switch decides,
 * and the preference comes back when the window is wide again.
 */
export function isListCollapsed(isSplitView: boolean, preferCollapsed: boolean): boolean {
    return isSplitView && preferCollapsed;
}

/**
 * The list panel's split-view classes (none outside split view, so phones,
 * tablets and sideways phones keep exactly their own classes).
 *
 * In split view the panel stays `absolute`, pinned left at its usual width, so
 * it can slide away without moving the map. Its direct children slide 8%
 * further and, coming back, start 60ms late: the content moves at a slightly
 * different pace from the panel, which reads as depth (parallax).
 */
export function splitListPanelClass(isSplitView: boolean, collapsed: boolean): string {
    if (!isSplitView) return '';
    const base = `lg:inset-y-0 lg:left-0 lg:right-auto lg:w-[45%] xl:w-[55%] lg:transition-[translate,visibility] lg:*:transition-[translate] ${REDUCED}`;
    return collapsed
        ? `${base} ${LIST_CLOSED} lg:-translate-x-full lg:invisible lg:*:-translate-x-[8%]`
        : `${base} ${LIST_OPEN}`;
}

/**
 * The map panel's split-view classes: beside the list, or the whole row. Same
 * springs as the list, so their edges stay together.
 *
 * Folded, the panel also sets `--map-dock-h`: the room the search dock takes
 * at the top of the map (`MapSearchDock`: 12px gap + 48px bar). The map's own
 * top-left overlays (the coordinates chip, the climate legend) add it to
 * their `top`, so they slide below the dock instead of sitting under it.
 */
export function splitMapPanelClass(isSplitView: boolean, collapsed: boolean): string {
    if (!isSplitView) return '';
    const base = 'lg:ml-auto lg:transition-[width] lg:motion-reduce:transition-none';
    return collapsed
        ? `${base} lg:duration-500 lg:ease-split-close lg:w-full lg:[--map-dock-h:3.75rem]`
        : `${base} lg:duration-700 lg:ease-split-open lg:w-[55%] xl:w-[45%]`;
}

/**
 * Read a remembered preference from storage, which anything may have written:
 * only a real `true` folds the list away, so a missing or damaged value opens
 * the page the usual way, with the list showing.
 */
export function readCollapsedPreference(persisted: unknown): boolean {
    if (typeof persisted !== 'object' || persisted === null) return false;
    return (persisted as { isSearchListCollapsed?: unknown }).isSearchListCollapsed === true;
}

/**
 * How many listings the folded-away list holds, for the "Show list" badge.
 * `null` while the count isn't known (still loading, or not a usable number),
 * so the badge is left out rather than showing a wrong or empty number.
 */
export function listCountBadge(count: number | null | undefined, locale: string): string | null {
    if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) return null;
    const whole = Math.floor(count);
    try {
        return new Intl.NumberFormat(locale).format(whole);
    } catch {
        return String(whole);
    }
}
