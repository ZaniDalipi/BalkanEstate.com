import type { Property } from '@/types';
import { createPropertyMatcher } from '@/shared/search';
import { searchPlaces } from '@/src/features/search/universal/places';
import { searchLocation, getZoomFromBoundingBox } from '@/services/osmService';

/**
 * Where the map should go when someone searches the villas page.
 *
 * Pure and separate from the hook so the order can be asserted directly: the
 * ladder is the whole behaviour, and each rung exists because the one below it
 * gets a class of query wrong.
 *
 *   1. **The gazetteer.** The app's own place index, which answers from memory,
 *      so a known city or village moves the map with no network round trip.
 *   2. **The villas on the page.** Matched with the engine the list itself
 *      filters by, so the map and the list cannot disagree about what was
 *      found. This rung exists because a development name — "Rolling Hills" —
 *      is in no gazetteer, and handing it to a worldwide geocoder flies the map
 *      to a Rolling Hills in another country while the list shows the one in
 *      Tirana.
 *   3. **The geocoder.** Everything else: an address, a landmark, a business.
 *
 * `null` means "leave the map alone", which is the honest answer for a query
 * nothing recognises — the text search has still run, so the visitor sees a
 * filtered list rather than the map jumping somewhere arbitrary.
 */

export interface MapTarget {
    center: [number, number];
    zoom: number;
}

/**
 * How far in a matched villa may take the map.
 *
 * `getZoomFromBoundingBox` bottoms out at 19 — a single building filling the
 * screen — and one villa's "bounding box" is a point. A villa should arrive
 * with its neighbourhood around it.
 */
const MAX_PROPERTY_ZOOM = 15;

const hasPosition = (p: { lat?: number | null; lng?: number | null }): boolean =>
    Number.isFinite(p.lat) && Number.isFinite(p.lng);

export async function resolveVillaSearchTarget(
    query: string,
    villas: readonly Property[],
): Promise<MapTarget | null> {
    const text = query.trim();
    if (!text) return null;

    const [local] = searchPlaces(text, { limit: 1 });
    if (local && hasPosition(local.place)) {
        return {
            center: [local.place.lat as number, local.place.lng as number],
            zoom: local.place.zoom,
        };
    }

    const matcher = createPropertyMatcher(text);
    const matched = villas.filter((p) => matcher.matches(p) && hasPosition(p));
    if (matched.length > 0) {
        const lats = matched.map((p) => p.lat);
        const lngs = matched.map((p) => p.lng);
        const [south, north] = [Math.min(...lats), Math.max(...lats)];
        const [west, east] = [Math.min(...lngs), Math.max(...lngs)];

        return {
            center: [(south + north) / 2, (west + east) / 2],
            zoom: Math.min(
                getZoomFromBoundingBox([String(south), String(north), String(west), String(east)]),
                MAX_PROPERTY_ZOOM,
            ),
        };
    }

    const results = await searchLocation(text);
    if (results.length === 0) return null;

    const [best] = results;
    return {
        center: [Number(best.lat), Number(best.lon)],
        zoom: getZoomFromBoundingBox(best.boundingbox),
    };
}
