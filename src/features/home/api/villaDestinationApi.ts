import { apiRequest } from '@/src/shared/api';
import type { VillaDestination } from '../data/villaDestinations';

/** Shape returned by `GET /api/villa-destinations`. */
interface ApiDestination {
    _id?: string;
    name?: string;
    query?: string;
    country?: string;
    imageUrl?: string;
    imageCredit?: string;
    imageCreditUrl?: string;
    imageCity?: string;
    imageCountry?: string;
    lat?: number;
    lng?: number;
    zoom?: number;
}

/** Coordinates arrive from an API, so validate before trusting them on a map. */
function isUsable(d: ApiDestination): boolean {
    return (
        typeof d.query === 'string' && d.query.trim().length > 0 &&
        typeof d.name === 'string' && d.name.trim().length > 0 &&
        typeof d.lat === 'number' && Number.isFinite(d.lat) && d.lat >= -90 && d.lat <= 90 &&
        typeof d.lng === 'number' && Number.isFinite(d.lng) && d.lng >= -180 && d.lng <= 180
    );
}

function toDestination(d: ApiDestination, index: number): VillaDestination {
    const zoom = Number(d.zoom);
    return {
        // Admin-managed rows have no i18n key, so the id doubles as a lookup
        // that simply misses and falls back to `fallback` — the admin's own
        // wording. That is the intended behaviour, not a gap.
        id: d._id ?? `api-${index}`,
        fallback: (d.name ?? '').trim(),
        query: (d.query ?? '').trim(),
        country: (d.country ?? '').trim(),
        imageCity: (d.imageCity ?? d.name ?? '').trim(),
        imageCountry: (d.imageCountry ?? d.country ?? '').trim(),
        imageUrl: d.imageUrl?.trim() || undefined,
        imageCredit: d.imageCredit?.trim() || undefined,
        imageCreditUrl: d.imageCreditUrl?.trim() || undefined,
        center: [d.lat as number, d.lng as number],
        zoom: Number.isFinite(zoom) && zoom >= 1 && zoom <= 20 ? zoom : 12,
    };
}

/**
 * Admin-curated destinations for the home-page corridor.
 *
 * Returns an empty array when there are none or the request fails; the caller
 * treats that as "use the built-in list", so the section keeps rendering on a
 * fresh database or a flaky network rather than collapsing.
 */
export async function getVillaDestinations(): Promise<VillaDestination[]> {
    // Through `apiRequest` like every other feature API, rather than a bare
    // fetch: it is the layer that carries the base URL, credentials, error
    // shape and 401 handling (Claude.md — all API calls go through the HTTP
    // client). This endpoint is public, hence `requiresAuth: false`.
    const data = await apiRequest<{ destinations?: ApiDestination[] }>(
        '/villa-destinations',
        { requiresAuth: false },
    );
    return (data.destinations ?? []).filter(isUsable).map(toDestination);
}
