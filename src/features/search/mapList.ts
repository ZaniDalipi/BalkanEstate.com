import L from 'leaflet';
import type { Property } from '@/types';
import { outOfAreaFallback, type OutOfAreaKind } from './outOfArea';

/**
 * The list follows the map.
 *
 * On every search page the map is the primary filter: what is listed is what
 * is on screen, a drawn area beats the viewport, and a view holding nothing
 * shows the nearest listings rather than an empty page. The buy page has
 * worked this way for a long time (`useSearchPage`); this is that behaviour
 * lifted out so the rent and villa pages answer a search identically instead
 * of each growing their own half of it. An empty area is answered by
 * `outOfAreaFallback`, the same rule the buy page uses.
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
     * Where the listings actually are, when nothing was in view and listings
     * from elsewhere are being shown instead. `null` when the list is an
     * honest answer to the view.
     */
    fallbackLocation: string | null;
    /**
     * Set when the searched area held nothing: which rule chose the listings
     * from elsewhere (see `outOfAreaFallback`). `null` otherwise.
     */
    outOfArea: OutOfAreaKind | null;
}

const inView = (listProperties: Property[]): MapNarrowingResult =>
    ({ listProperties, fallbackLocation: null, outOfArea: null });

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
        if (withinDrawn.length > 0) return inView(withinDrawn);
    }

    if (mapBounds && ready && properties.length > 0) {
        const withinView = properties.filter(p => mapBounds.contains(L.latLng(p.lat, p.lng)));
        if (withinView.length > 0) return inView(withinView);

        // Nothing here: premium from anywhere, other promotions nearby, and
        // the nearest listings when no promotion qualifies — never nothing.
        const centre = mapBounds.getCenter();
        const fallback = outOfAreaFallback(properties, { lat: centre.lat, lng: centre.lng });
        return {
            listProperties: fallback.listProperties,
            fallbackLocation: fallback.location,
            outOfArea: fallback.kind,
        };
    }

    return inView(properties);
};
