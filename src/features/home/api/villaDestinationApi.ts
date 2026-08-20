import { API_CONFIG } from '@/src/shared/constants/app.constants';
import type { VillaDestination } from '../data/villaDestinations';

/** Shape returned by `GET /api/villa-destinations`. */
interface ApiDestination {
    _id?: string;
    name?: string;
    query?: string;
    country?: string;
    imageUrl?: string;
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
export async function getVillaDestinations(signal?: AbortSignal): Promise<VillaDestination[]> {
    const response = await fetch(`${API_CONFIG.BASE_URL}/villa-destinations`, { signal });
    if (!response.ok) throw new Error(`Failed to load villa destinations (${response.status})`);

    const data: { destinations?: ApiDestination[] } = await response.json();
    return (data.destinations ?? []).filter(isUsable).map(toDestination);
}
