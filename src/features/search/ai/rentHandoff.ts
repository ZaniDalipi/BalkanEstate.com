import type { Filters } from '@/types';
import { initialFilters } from '@/types';

/**
 * An AI search for a rental belongs on the rentals page: the buy page only
 * loads homes for sale. The buy page hands the whole filter set over in the
 * navigation state, and the rentals page starts from it, so nothing the user
 * asked for is lost on the way.
 */

const KEY = 'aiSearchFilters';

/** Navigation state that carries an AI search to the rentals page. */
export const rentHandoffState = (filters: Filters): Record<string, Filters> => ({ [KEY]: filters });

/**
 * The AI search a navigation carried, or null. The state is whatever the
 * history entry holds, so only a rental filter set is taken, and only the
 * fields a filter set has.
 */
export const readRentHandoff = (state: unknown): Filters | null => {
    if (!state || typeof state !== 'object') return null;
    const carried = (state as Record<string, unknown>)[KEY];
    if (!carried || typeof carried !== 'object') return null;
    const filters = carried as Partial<Filters>;
    if (filters.listingType !== 'rent') return null;
    const known = Object.keys(initialFilters).concat(
        'constructionStatus', 'minKitchens', 'requireKnownDistances', 'orientation', 'maxBeds',
    );
    const picked = Object.fromEntries(Object.entries(filters).filter(([k]) => known.includes(k)));
    return { ...initialFilters, ...picked, listingType: 'rent' };
};
