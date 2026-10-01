import type { Property } from '@/types';
import { validateActivePromotion, validateCoordinates } from '@/shared/utils/validation';

/**
 * Nothing in the searched area: what is worth showing from elsewhere.
 *
 * When the map view (or the drawn area) holds no listing, the list used to
 * fall back to *every* nearest listing — which read as if they were results
 * for the place that was searched. Now the page says plainly that the area is
 * empty and, below that, only shows listings that are actively promoted
 * (premium, highlight or featured), nearest first within each tier. An
 * ordinary listing two countries away is not an answer to "Budva"; a paid
 * showcase listing is an honest "meanwhile, here is something".
 *
 * Pure and total: bad promotion dates and unusable coordinates are filtered
 * or ranked last rather than thrown on.
 */

/** Premium (1st) > Highlight (2nd) > Featured (3rd) — same order as the highlighted section. */
const TIER_PRIORITY: Record<string, number> = {
    premium: 3,
    highlight: 2,
    featured: 1,
};

export interface OutOfAreaResult {
    /** Promoted listings outside the area, best first. May be empty. */
    listProperties: Property[];
    /** Where the first of them is — `null` when there are none. */
    location: string | null;
}

const hasUsableCoordinates = (p: Property) =>
    validateCoordinates(p.lat, p.lng).isValid;

/** Cheap planar distance — only used to order candidates, never shown. */
const distance = (p: Property, lat: number, lng: number) =>
    hasUsableCoordinates(p)
        ? Math.hypot(p.lat - lat, p.lng - lng)
        : Number.POSITIVE_INFINITY;

export const promotedOutsideArea = (
    properties: Property[],
    centre: { lat: number; lng: number } | null,
    now: number = Date.now()
): OutOfAreaResult => {
    const promoted = properties.filter(p => validateActivePromotion(p, now).isValid);
    if (promoted.length === 0) return { listProperties: [], location: null };

    const origin = centre && validateCoordinates(centre.lat, centre.lng).isValid ? centre : null;

    const ranked = [...promoted].sort((a, b) => {
        const tier = (TIER_PRIORITY[b.promotionTier ?? ''] ?? 0) - (TIER_PRIORITY[a.promotionTier ?? ''] ?? 0);
        if (tier !== 0) return tier;
        const urgent = Number(!!b.hasUrgentBadge) - Number(!!a.hasUrgentBadge);
        if (urgent !== 0) return urgent;
        if (!origin) return 0;
        const da = distance(a, origin.lat, origin.lng);
        const db = distance(b, origin.lat, origin.lng);
        // Two unlocatable listings compare equal (Infinity - Infinity is NaN).
        return da === db ? 0 : da < db ? -1 : 1;
    });

    const first = ranked[0];
    return { listProperties: ranked, location: first.city || first.country || null };
};
