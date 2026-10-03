import type { Property } from '@/types';
import type { PropertyPromotionTier } from '@/src/shared/types/property.types';
import { validateActivePromotion, validateCoordinates } from '@/shared/utils/validation';
import { haversineDistanceKm, type Coordinates } from '@/shared/geo';

/**
 * Nothing in the searched area: what is worth showing from elsewhere.
 *
 * Used by every search page (buy, rent, villas) once the map view — or the
 * drawn area — holds no listing. The page says plainly that the area is
 * empty (`OutOfAreaBanner`) and the list below it is chosen by importance:
 *
 *   1. Premium — the most expensive promotion — is always shown, wherever it is.
 *   2. Highlight and featured are shown only when they are within their
 *      tier's radius of the searched spot (`OUT_OF_AREA_RADIUS_KM`): a paid
 *      listing next door is a fair "meanwhile"; one three countries away is not.
 *   3. When no promotion qualifies, the nearest ordinary listings are shown
 *      (the nearest town first), so the visitor is never left with nothing
 *      while there are listings to show.
 *
 * Pure and total: expired or unparsable promotions are not promotions,
 * listings with unusable coordinates rank last, and an invalid centre only
 * drops the distance rules — it never throws.
 */

/** How far from the searched spot each lower tier may be and still be shown. */
export const OUT_OF_AREA_RADIUS_KM: Readonly<Record<Exclude<PropertyPromotionTier, 'premium' | 'standard'>, number>> = {
    highlight: 150,
    featured: 75,
};

/** Premium (1st) > Highlight (2nd) > Featured (3rd) — same order as the highlighted section. */
const TIER_PRIORITY: Record<string, number> = {
    premium: 3,
    highlight: 2,
    featured: 1,
};

export type OutOfAreaKind = 'promoted' | 'nearest';

export interface OutOfAreaResult {
    /** What to list under the banner, best first. Empty only when `properties` is. */
    listProperties: Property[];
    /** Which rule chose them — the banner words itself accordingly. */
    kind: OutOfAreaKind;
    /** Where the first of them is — `null` when there are none. */
    location: string | null;
}

const isValidCentre = (centre: Coordinates | null): centre is Coordinates =>
    centre !== null && validateCoordinates(centre.lat, centre.lng).isValid;

/** Kilometres from the centre, `Infinity` for a listing with no usable pin. */
const kmFrom = (centre: Coordinates | null, p: Property): number =>
    centre && validateCoordinates(p.lat, p.lng).isValid
        ? haversineDistanceKm(centre, { lat: p.lat, lng: p.lng })
        : Number.POSITIVE_INFINITY;

/** Ascending, with two `Infinity`s equal (Infinity - Infinity is NaN). */
const byNumber = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);

const locationOf = (p: Property | undefined) => (p ? p.city || p.country || null : null);

/** Is this promoted listing close enough (or important enough) to show? */
const qualifies = (p: Property, km: number): boolean => {
    if (p.promotionTier === 'premium') return true;
    const radius = OUT_OF_AREA_RADIUS_KM[p.promotionTier as keyof typeof OUT_OF_AREA_RADIUS_KM];
    // An unknown tier, or a distance that cannot be measured, is not shown.
    return radius !== undefined && km <= radius;
};

const promoted = (properties: Property[], centre: Coordinates | null, now: number): Property[] =>
    properties
        .filter(p => validateActivePromotion(p, now).isValid)
        .map(p => ({ p, km: kmFrom(centre, p) }))
        .filter(({ p, km }) => qualifies(p, km))
        .sort((a, b) =>
            (TIER_PRIORITY[b.p.promotionTier ?? ''] ?? 0) - (TIER_PRIORITY[a.p.promotionTier ?? ''] ?? 0)
            || Number(!!b.p.hasUrgentBadge) - Number(!!a.p.hasUrgentBadge)
            || byNumber(a.km, b.km)
        )
        .map(({ p }) => p);

/**
 * The nearest ordinary listings, preferring a whole town over a scattering of
 * far-apart ones, so the answer reads as "not here, but here".
 */
const nearest = (properties: Property[], centre: Coordinates | null): Property[] => {
    const byDistance = properties
        .map(p => ({ p, km: kmFrom(centre, p) }))
        .sort((a, b) => byNumber(a.km, b.km))
        .map(({ p }) => p);
    const closest = byDistance[0];
    if (!closest) return [];

    const sameCity = byDistance.filter(p => p.city && p.city.toLowerCase() === closest.city?.toLowerCase());
    if (sameCity.length > 0) return sameCity;

    const sameCountry = byDistance.filter(p => p.country && p.country.toLowerCase() === closest.country?.toLowerCase());
    if (sameCountry.length > 0) return sameCountry;

    return byDistance;
};

export const outOfAreaFallback = (
    properties: Property[],
    centre: Coordinates | null,
    now: number = Date.now()
): OutOfAreaResult => {
    const origin = isValidCentre(centre) ? centre : null;

    const shown = promoted(properties, origin, now);
    if (shown.length > 0) return { listProperties: shown, kind: 'promoted', location: locationOf(shown[0]) };

    const fallback = nearest(properties, origin);
    return { listProperties: fallback, kind: 'nearest', location: locationOf(fallback[0]) };
};
