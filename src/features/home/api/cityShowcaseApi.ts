import { apiRequest } from '@/src/shared/api';

/** A city panel, validated and ready to render. */
export interface ShowcaseCity {
    id: string;
    city: string;
    country: string;
    /** Sent to the search page as the location query. */
    searchQuery: string;
    imageUrl: string;
}

/** Shape returned by `GET /api/city-showcase` — every field optional until checked. */
interface ApiCityShowcase {
    _id?: string;
    city?: string;
    country?: string;
    searchQuery?: string;
    imageUrl?: string;
}

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

/**
 * A panel is only usable if it can both be painted and acted on.
 *
 * The photo URL is checked for an `https:` scheme rather than merely being
 * present: it is interpolated into an `img src`, and a `javascript:` or `data:`
 * value reaching that attribute is the difference between a missing picture and
 * an injection. The server rejects those too — this is the second half of a
 * boundary check, not a duplicate of it.
 */
function isUsable(row: ApiCityShowcase): boolean {
    return (
        isNonEmptyString(row._id) &&
        isNonEmptyString(row.city) &&
        isNonEmptyString(row.country) &&
        isNonEmptyString(row.searchQuery) &&
        isNonEmptyString(row.imageUrl) &&
        /^https:\/\//i.test(row.imageUrl.trim())
    );
}

function toShowcaseCity(row: ApiCityShowcase): ShowcaseCity {
    return {
        id: row._id as string,
        city: (row.city as string).trim(),
        country: (row.country as string).trim(),
        searchQuery: (row.searchQuery as string).trim(),
        imageUrl: (row.imageUrl as string).trim(),
    };
}

/**
 * Admin-curated cities for the home-page gallery.
 *
 * This endpoint is the only source of the gallery's content — there is no
 * built-in list behind it, so an empty result means the section does not
 * render. Rows that fail validation are dropped rather than faked out with
 * placeholder values: a panel with no photo or no search term is a data
 * problem for an admin to fix, not something to paper over on the home page.
 *
 * Rejections propagate; the caller is a React Query hook, which is where
 * retry and error state belong.
 */
export async function getShowcaseCities(): Promise<ShowcaseCity[]> {
    const data = await apiRequest<{ cities?: ApiCityShowcase[] }>(
        '/city-showcase',
        { requiresAuth: false },
    );
    return (data.cities ?? []).filter(isUsable).map(toShowcaseCity);
}
