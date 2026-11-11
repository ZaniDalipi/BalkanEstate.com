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
 * map's width grows to the full row. Both share one duration and easing, so the
 * list's right edge and the map's left edge stay together the whole way. The
 * list turns `invisible` once the slide is over (visibility transitions
 * discretely and stays visible until the end), which also takes it out of the
 * tab order and the accessibility tree while it is folded away.
 *
 * Phones and tablets are untouched: they show one panel at a time with the
 * List / Map switch (see `searchLayout.ts` and `panelHandoff.ts`).
 */

/** The `id` of the list panel, for the toggle's `aria-controls`. One search page is on screen at a time. */
export const SEARCH_LIST_PANEL_ID = 'search-list-panel';

/** The slide's length; keep in step with `duration-300` below. */
export const LIST_COLLAPSE_MS = 300;

const SLIDE = 'lg:duration-300 lg:ease-[cubic-bezier(0.32,0.72,0,1)] lg:motion-reduce:transition-none';

/**
 * Whether the list is folded away right now. The stored preference only
 * applies to split view: on a phone or tablet the List / Map switch decides,
 * and the preference comes back when the window is wide again.
 */
export function isListCollapsed(isSplitView: boolean, preferCollapsed: boolean): boolean {
    return isSplitView && preferCollapsed;
}

/**
 * The list panel's split-view classes. Below `lg` the panel stays
 * `absolute inset-0` (the page's own classes); in split view it keeps that
 * position and is pinned to the left instead of joining the flex row, so it
 * can slide away without moving the map.
 */
export function splitListPanelClass(collapsed: boolean): string {
    const base = `lg:inset-y-0 lg:left-0 lg:right-auto lg:w-[45%] xl:w-[55%] lg:transition-[translate,visibility] ${SLIDE}`;
    return collapsed ? `${base} lg:-translate-x-full lg:invisible` : base;
}

/** The map panel's split-view classes: beside the list, or the whole row. */
export function splitMapPanelClass(collapsed: boolean): string {
    const base = `lg:ml-auto lg:transition-[width] ${SLIDE}`;
    return collapsed ? `${base} lg:w-full` : `${base} lg:w-[55%] xl:w-[45%]`;
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
