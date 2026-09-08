import { describe, it, expect } from 'vitest';
import type { Property } from '@/types';
import { frameSearchTarget } from '@/src/features/search/frameSearch';

/**
 * Framing a searched place around the listings it found.
 *
 * The bug these hold shut: searching "Sukth, Durrës, Albania" flew the map to
 * the centre of Sukth at street zoom, the one matching listing sat a couple of
 * kilometres up the coast, and the visitor read a card over a map with no pins
 * on it.
 */

const SUKTH: [number, number] = [41.366, 19.54];

const at = (lat: number, lng: number, overrides: Partial<Property> = {}): Property => ({
    id: `p-${lat}-${lng}`,
    lat,
    lng,
    city: 'Sukth',
    country: 'Albania',
} as Property & typeof overrides);

describe('frameSearchTarget', () => {
    it('widens the view until a nearby listing is in it', () => {
        const place = { center: SUKTH, zoom: 16 };
        // ~3km north-west of the town centre.
        const framed = frameSearchTarget(place, [at(41.393, 19.516)])!;

        expect(framed.zoom).toBeLessThan(place.zoom);
        // The frame sits between the place and the listing, holding both.
        expect(framed.center[0]).toBeGreaterThan(41.366);
        expect(framed.center[0]).toBeLessThan(41.393);
    });

    it('never zooms in past the zoom the place asked for', () => {
        const place = { center: SUKTH, zoom: 11 };
        // A listing right on the town centre would frame to street zoom.
        const framed = frameSearchTarget(place, [at(41.3661, 19.5401)])!;

        expect(framed.zoom).toBe(11);
    });

    it('ignores listings too far away to be what was searched for', () => {
        const place = { center: SUKTH, zoom: 14 };
        // Split, several hundred kilometres up the coast.
        const framed = frameSearchTarget(place, [at(43.508, 16.44)])!;

        expect(framed).toEqual(place);
    });

    it('frames the listings alone when nothing resolved to a place', () => {
        const framed = frameSearchTarget(null, [at(41.32, 19.81), at(41.33, 19.82)])!;

        expect(framed.center[0]).toBeCloseTo(41.325, 2);
        expect(framed.center[1]).toBeCloseTo(19.815, 2);
    });

    it('answers with nothing when there is neither a place nor a listing', () => {
        expect(frameSearchTarget(null, [])).toBeNull();
    });

    it('keeps the place when it found nothing to frame around', () => {
        const place = { center: SUKTH, zoom: 13 };
        expect(frameSearchTarget(place, [])).toEqual(place);
    });

    it('skips listings with no position rather than framing on NaN', () => {
        const place = { center: SUKTH, zoom: 13 };
        const noPosition = { id: 'x' } as Property;

        expect(frameSearchTarget(place, [noPosition])).toEqual(place);
    });
});
