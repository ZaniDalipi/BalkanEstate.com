import L from 'leaflet';
import type { Property } from '@/types';

/**
 * The list follows the map.
 *
 * On every search page the map is the primary filter: what is listed is what
 * is on screen, a drawn area beats the viewport, and a view holding nothing
 * shows the nearest listings rather than an empty page. The buy page has
 * worked this way for a long time (`useSearchPage`); this is that behaviour
 * lifted out so the rent and villa pages answer a search identically instead
 * of each growing their own half of it.
 */

export interface MapNarrowingInput {
    /** Already filtered and sorted — this only narrows and reorders. */
    properties: Property[];
    /** A user-drawn area, when there is one. */
    drawnBounds: L.LatLngBounds | null;
    /** The current viewport. */
    mapBounds: L.LatLngBounds | null;
    /**
     * False while the dataset is still arriving: narrowing a half-loaded list
     * by bounds shows an empty page for a moment and then fills in.
     */
    ready: boolean;
}

export interface MapNarrowingResult {
    listProperties: Property[];
    /**
     * Where the listings actually are, when nothing was in view and the
     * nearest ones are being shown instead. `null` when the list is an
     * honest answer to the view.
     */
    fallbackLocation: string | null;
}

/** Cheap planar distance — only ever used to order candidates, never shown. */
const distance = (lat1: number, lng1: number, lat2: number, lng2: number) =>
    Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));

/**
 * Nothing in view: the nearest listings, preferring a whole town over a
 * scattering of far-apart ones, so the answer reads as "not here, but here".
 */
const nearest = (properties: Property[], lat: number, lng: number): MapNarrowingResult => {
    if (properties.length === 0) return { listProperties: [], fallbackLocation: null };

    const byDistance = [...properties].sort(
        (a, b) => distance(lat, lng, a.lat, a.lng) - distance(lat, lng, b.lat, b.lng)
    );
    const closest = byDistance[0];

    // Priority 1: the town the nearest listing is in.
    const sameCity = byDistance.filter(p => p.city?.toLowerCase() === closest.city?.toLowerCase());
    if (sameCity.length > 0) return { listProperties: sameCity, fallbackLocation: closest.city || null };

    // Priority 2: the same country, nearest first.
    const sameCountry = byDistance.filter(p => p.country?.toLowerCase() === closest.country?.toLowerCase());
    if (sameCountry.length > 0) {
        return { listProperties: sameCountry, fallbackLocation: sameCountry[0]?.city || closest.country || null };
    }

    // Priority 3: everything there is, nearest first.
    return { listProperties: byDistance, fallbackLocation: closest.city || closest.country || null };
};

export const narrowToMapView = ({
    properties,
    drawnBounds,
    mapBounds,
    ready,
}: MapNarrowingInput): MapNarrowingResult => {
    if (drawnBounds) {
        const withinDrawn = properties.filter(p => drawnBounds.contains(L.latLng(p.lat, p.lng)));
        // An area with nothing in it falls through to the viewport rules
        // rather than showing an empty list.
        if (withinDrawn.length > 0) return { listProperties: withinDrawn, fallbackLocation: null };
    }

    if (mapBounds && ready && properties.length > 0) {
        const withinView = properties.filter(p => mapBounds.contains(L.latLng(p.lat, p.lng)));
        if (withinView.length > 0) return { listProperties: withinView, fallbackLocation: null };

        const centre = mapBounds.getCenter();
        const fallback = nearest(properties, centre.lat, centre.lng);
        // Never answer with nothing while there are listings to show.
        if (fallback.listProperties.length === 0) return { listProperties: properties, fallbackLocation: null };
        return fallback;
    }

    return { listProperties: properties, fallbackLocation: null };
};
