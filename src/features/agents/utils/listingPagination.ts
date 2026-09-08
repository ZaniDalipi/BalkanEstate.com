/**
 * Paging an agent's listings. A productive agent carries a hundred properties
 * or more, and rendering them all put a hundred PropertyCards — each with its
 * own image gallery and hover preloading — into a single scroll. Pages keep
 * the card count bounded and give a visitor a sense of where they are.
 */

/**
 * Listings per page in the profile's listings tab.
 *
 * Six rather than five: the tab's grid is two-up, and a wide card measures
 * 544px, so six is three complete rows — about two screens before the pager,
 * the same height five would take while leaving a lone card in the last row.
 */
export const LISTINGS_PER_PAGE = 6;

/** Total pages needed for `total` items — always at least one, so an empty
 *  list is page 1 of 1 rather than page 1 of 0. */
export const pageCount = (total: number, perPage: number = LISTINGS_PER_PAGE): number =>
    Math.max(1, Math.ceil(Math.max(0, total) / perPage));

/**
 * The slice of `items` on `page`, clamped into range. A list that shrinks
 * under the page a visitor is on — a filter narrowing it, fresh data arriving
 * — would otherwise leave them looking at nothing.
 */
export const pageSlice = <T,>(items: T[], page: number, perPage: number = LISTINGS_PER_PAGE) => {
    const totalPages = pageCount(items.length, perPage);
    const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
    const firstIndex = (current - 1) * perPage;

    return { page: current, totalPages, firstIndex, items: items.slice(firstIndex, firstIndex + perPage) };
};

/**
 * Page numbers for the pager, windowed around the current page so a long list
 * doesn't print forty buttons. `null` marks a gap the caller renders as an
 * ellipsis. The first and last pages are always offered.
 */
export const pageWindow = (current: number, total: number): (number | null)[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const around = [current - 1, current, current + 1].filter(n => n > 1 && n < total);
    const pages = [1, ...around, total];

    return pages.reduce<(number | null)[]>((acc, page, i) => {
        if (i > 0 && page - (pages[i - 1] as number) > 1) acc.push(null);
        acc.push(page);
        return acc;
    }, []);
};
