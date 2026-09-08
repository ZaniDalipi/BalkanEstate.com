import type { Property } from '@/types';
import { haversineDistanceKm } from '@/shared/geo';

/**
 * Where the map should sit after a search, so the listings are on it.
 *
 * A geocoder answers a place with a point and a zoom for the *place* — the
 * centre of Sukth at street zoom — which is not the same question as "show me
 * what is for sale in Sukth". The listing may sit two kilometres up the coast,
 * and the visitor is left reading a card over an empty map, which is what this
 * fixes: the searched place is kept in frame and the map is widened, if it
 * needs widening, until the listings around it are in frame too.
 *
 * Only listings *near* the place count. A search for Sukth must not zoom out
 * to the whole Adriatic because there is also a match in Split — those are
 * what the list's own nearby fallback is for, and it says so in words.
 */

export interface MapTarget {
    center: [number, number];
    zoom: number;
}

export interface FrameOptions {
    /** How far from the place a listing can be and still pull the frame. */
    nearKm?: number;
    /** Never zoom out past this, however far the outliers are. */
    minZoom?: number;
    /** Never zoom in past this, however tight the cluster is. */
    maxZoom?: number;
}

const DEFAULTS: Required<FrameOptions> = {
    // A town and its outskirts. Wide enough for a resort development on the
    // edge of the place named, tight enough not to swallow the next city.
    nearKm: 25,
    minZoom: 9,
    maxZoom: 16,
};

const hasPosition = (p: { lat?: number | null; lng?: number | null }): boolean =>
    Number.isFinite(p.lat) && Number.isFinite(p.lng);

/** The same ladder `getZoomFromBoundingBox` walks, on a span in degrees. */
const zoomForSpan = (span: number): number => {
    if (span > 0.5) return 10;
    if (span > 0.2) return 11;
    if (span > 0.05) return 12;
    if (span > 0.015) return 14;
    if (span > 0.005) return 16;
    if (span > 0.002) return 17;
    if (span > 0.0005) return 18;
    return 19;
};

/**
 * Frame a searched place together with the listings around it.
 *
 * `place` is where the search resolved to, `properties` the listings the
 * search is answering with. Returns the place unchanged when nothing is near
 * it, and `null` only when there is neither a place nor a listing to look at.
 */
export const frameSearchTarget = (
    place: MapTarget | null,
    properties: readonly Property[],
    options: FrameOptions = {},
): MapTarget | null => {
    const { nearKm, minZoom, maxZoom } = { ...DEFAULTS, ...options };
    const positioned = properties.filter(hasPosition);

    // No place resolved — frame whatever the search found, if anything.
    if (!place) {
        if (positioned.length === 0) return null;
        return frameOf(positioned.map(p => [p.lat, p.lng] as [number, number]), minZoom, maxZoom);
    }

    const [placeLat, placeLng] = place.center;
    const near = positioned.filter(
        p => haversineDistanceKm({ lat: placeLat, lng: placeLng }, { lat: p.lat, lng: p.lng }) <= nearKm
    );

    // Nothing of ours around it: the place itself is the honest answer, and
    // the list says in words where the listings actually are.
    if (near.length === 0) return place;

    const framed = frameOf(
        [place.center, ...near.map(p => [p.lat, p.lng] as [number, number])],
        minZoom,
        maxZoom,
    );

    // Only ever widen: a place that arrived at city zoom should not be zoomed
    // into a single villa's roof because one listing happens to be there.
    return { center: framed.center, zoom: Math.min(place.zoom, framed.zoom) };
};

/** Centre and zoom that hold every point, padded a little so nothing is on the edge. */
const frameOf = (points: [number, number][], minZoom: number, maxZoom: number): MapTarget => {
    const lats = points.map(([lat]) => lat);
    const lngs = points.map(([, lng]) => lng);
    const south = Math.min(...lats);
    const north = Math.max(...lats);
    const west = Math.min(...lngs);
    const east = Math.max(...lngs);

    // 30% breathing room, so a marker at the extreme is not under the edge of
    // the viewport (or under the floating controls).
    const span = Math.max(north - south, east - west) * 1.3;

    return {
        center: [(south + north) / 2, (west + east) / 2],
        zoom: Math.max(minZoom, Math.min(maxZoom, zoomForSpan(span))),
    };
};
