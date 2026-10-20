import { SHORT_LANDSCAPE_QUERY } from '@/src/hooks/useMediaQuery';

/**
 * Which layout the Search, Rentals and Villas pages use.
 *
 * - `mobile`  — under 768px: full-screen list or map, floating search pill.
 * - `tablet`  — one panel at a time (list or map) with the List/Map switch.
 * - `split`   — list and map side by side (desktop).
 *
 * Width alone used to decide, so a phone held sideways that is 1024px+ wide
 * got the split view with ~400px of height: two cramped half-panels. Any short
 * landscape screen (SHORT_LANDSCAPE_QUERY, the `landscape:` variant) is
 * treated as a tablet instead, so it gets the switch and one full panel. The
 * CSS side is the `landscape:` overrides on the panels and the slide rules for
 * `.search-list-panel` / `.search-map-stage` in src/index.css.
 */
export type SearchLayout = 'mobile' | 'tablet' | 'split';

export function getSearchLayout(win: Window = window): SearchLayout {
    const width = win.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    let isShortLandscape = false;
    try {
        isShortLandscape = typeof win.matchMedia === 'function' && win.matchMedia(SHORT_LANDSCAPE_QUERY).matches;
    } catch {
        isShortLandscape = false;
    }
    return isShortLandscape ? 'tablet' : 'split';
}
