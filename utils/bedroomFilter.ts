import type { Filters } from '../types';

/**
 * Bedrooms are a minimum (`beds`) with an optional maximum (`maxBeds`): the AI
 * search sets both to the same number for "2 bedrooms", or a range for "2 to 3".
 * The pickers only offer minimums, so picking one by hand drops the maximum.
 */

/** `filters` with one field changed; a hand-picked bedroom count drops any maximum. */
export const applyFilterChange = <K extends keyof Filters>(filters: Filters, key: K, value: Filters[K]): Filters => ({
    ...filters,
    [key]: value,
    ...(key === 'beds' ? { maxBeds: null } : {}),
});

/** How a bedroom option reads: "2" when exactly two are asked for, "2–3" for a range, else "2+". */
export const bedroomOptionLabel = (n: number, filters: Pick<Filters, 'beds' | 'maxBeds'>): string => {
    const max = filters.maxBeds ?? null;
    if (filters.beds !== n || max === null || max < n) return `${n}+`;
    return max === n ? `${n}` : `${n}–${max}`;
};

/** Whether a listing's bedroom count is within the asked range. */
export const bedsWithinRange = (beds: number | undefined, filters: Pick<Filters, 'beds' | 'maxBeds'>): boolean => {
    const count = beds ?? 0;
    if (filters.beds && count < filters.beds) return false;
    if (filters.maxBeds != null && count > filters.maxBeds) return false;
    return true;
};
