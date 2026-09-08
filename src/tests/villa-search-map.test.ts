/**
 * Searching the villas page moves the map.
 *
 * Typing a place and pressing Enter used to refetch the collection and leave
 * the map wherever it was, so the list narrowed to Budva while the map still
 * showed the whole Balkans. These assert the ladder that decides where it goes,
 * in order, because each rung is there for a query the one below it gets wrong.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Property } from '@/types';

const searchPlaces = vi.fn();
const searchLocation = vi.fn();

vi.mock('@/src/features/search/universal/places', () => ({
    searchPlaces: (...args: unknown[]) => searchPlaces(...args),
}));

vi.mock('@/services/osmService', async () => {
    // The zoom heuristic is real — the point of the test is which box it is given.
    const actual = await vi.importActual<typeof import('@/services/osmService')>('@/services/osmService');
    return { ...actual, searchLocation: (...args: unknown[]) => searchLocation(...args) };
});

import { resolveVillaSearchTarget } from '@/src/features/villas/hooks/villaSearchTarget';

const villa = (over: Partial<Property>): Property => ({
    id: 'v1', title: 'A villa', city: 'Tirana', country: 'Albania',
    lat: 41.32, lng: 19.82, propertyType: 'luxury-villa',
    ...over,
} as Property);

beforeEach(() => {
    searchPlaces.mockReset().mockReturnValue([]);
    searchLocation.mockReset().mockResolvedValue([]);
});

describe('where a villa search sends the map', () => {
    it('uses the app gazetteer first, without a network call', async () => {
        searchPlaces.mockReturnValue([{ place: { lat: 42.28, lng: 18.84, zoom: 12 } }]);

        const target = await resolveVillaSearchTarget('Budva', []);

        expect(target).toEqual({ center: [42.28, 18.84], zoom: 12 });
        expect(searchLocation).not.toHaveBeenCalled();
    });

    it('falls back to the villas on the page for a name no gazetteer holds', async () => {
        // The case from the screenshot: a development, not a place. Geocoding it
        // worldwide is what would land the map on Rolling Hills, California.
        const villas = [
            villa({ id: 'a', title: 'Rolling Hills 2 Shitet vile me pishine', lat: 41.4, lng: 19.8 }),
            villa({ id: 'b', title: 'Rolling Hills Liqeni', lat: 41.42, lng: 19.82 }),
            villa({ id: 'c', title: 'Seaside retreat', city: 'Vlore', lat: 40.46, lng: 19.49 }),
        ];

        const target = await resolveVillaSearchTarget('rolling hills', villas);

        expect(searchLocation).not.toHaveBeenCalled();
        // Centred between the two that matched, and nowhere near the third.
        expect(target?.center[0]).toBeCloseTo(41.41, 2);
        expect(target?.center[1]).toBeCloseTo(19.81, 2);
    });

    it('leaves a single villa room to breathe rather than filling the screen', async () => {
        const target = await resolveVillaSearchTarget('Liqeni', [
            villa({ title: 'Rolling Hills Liqeni', lat: 41.42, lng: 19.82 }),
        ]);

        // A lone villa is a zero-span box, which the raw heuristic scores at 19.
        expect(target).toEqual({ center: [41.42, 19.82], zoom: 15 });
    });

    it('geocodes anything neither the gazetteer nor the listings know', async () => {
        searchLocation.mockResolvedValue([
            { lat: '41.3275', lon: '19.8187', boundingbox: ['41.30', '41.35', '19.79', '19.84'] },
        ]);

        const target = await resolveVillaSearchTarget('Rruga e Kavajes 42', []);

        expect(searchLocation).toHaveBeenCalledWith('Rruga e Kavajes 42');
        expect(target?.center).toEqual([41.3275, 19.8187]);
        expect(target?.zoom).toBe(12);
    });

    it('leaves the map alone when nothing recognises the query', async () => {
        expect(await resolveVillaSearchTarget('qqqzzz', [villa({})])).toBeNull();
    });

    it('leaves the map alone for an empty or blank query', async () => {
        expect(await resolveVillaSearchTarget('   ', [villa({})])).toBeNull();
        expect(searchPlaces).not.toHaveBeenCalled();
    });

    it('ignores a matched villa that has no coordinates', async () => {
        const target = await resolveVillaSearchTarget('Rolling', [
            villa({ title: 'Rolling Hills', lat: undefined as never, lng: undefined as never }),
        ]);

        expect(target).toBeNull();
    });
});
