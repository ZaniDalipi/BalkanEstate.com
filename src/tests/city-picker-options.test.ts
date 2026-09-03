/**
 * The city list an admin picks a gallery panel from.
 *
 * Two rules are worth pinning down: it is the same canonical list the
 * create-listing form offers a seller, and it never offers a city another
 * panel already holds.
 */

import { describe, it, expect } from 'vitest';
import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { getCountryCities, getCountryCityNames, findCountryCentre } from '../shared/geo';
import { buildCityPickerOptions } from '../features/admin/components/cityShowcaseOptions';

const montenegro = BALKAN_LOCATIONS.find(c => c.name === 'Montenegro');

describe('getCountryCities', () => {
    it('returns the canonical list a seller is offered', () => {
        expect(getCountryCities('Montenegro')).toEqual(montenegro?.cities);
    });

    it('matches a country however it is spelled or cased', () => {
        expect(getCountryCityNames('north macedonia')).toEqual(getCountryCityNames('North Macedonia'));
    });

    it('has nothing to offer for a country it holds no data for', () => {
        expect(getCountryCities('Atlantis')).toEqual([]);
        expect(getCountryCities('')).toEqual([]);
        expect(getCountryCities(null)).toEqual([]);
    });
});

describe('findCountryCentre', () => {
    it('lands inside the country it summarises', () => {
        const centre = findCountryCentre('Montenegro');
        expect(centre).not.toBeNull();
        expect(centre!.lat).toBeGreaterThan(41.5);
        expect(centre!.lat).toBeLessThan(43.5);
        expect(centre!.lng).toBeGreaterThan(18.4);
        expect(centre!.lng).toBeLessThan(20.5);
    });

    it('returns null rather than a guess for an unknown country', () => {
        expect(findCountryCentre('Atlantis')).toBeNull();
    });
});

describe('buildCityPickerOptions', () => {
    const base = { country: 'Montenegro', known: [], used: [], current: '' };

    it('offers every canonical city of the country', () => {
        const { available } = buildCityPickerOptions(base);

        expect(available).toEqual(expect.arrayContaining(['Podgorica', 'Budva', 'Kotor', 'Ulcinj']));
        expect(available).toHaveLength(montenegro?.cities.length ?? 0);
    });

    it('adds names only the database knows, without repeating the canonical ones', () => {
        const { available } = buildCityPickerOptions({
            ...base,
            known: [
                { city: 'Sveti Stefan', country: 'Montenegro' },
                { city: 'budva', country: 'Montenegro' },
                { city: 'Split', country: 'Croatia' },
            ],
        });

        expect(available).toContain('Sveti Stefan');
        expect(available.filter(name => name.toLowerCase() === 'budva')).toEqual(['Budva']);
        expect(available).not.toContain('Split');
    });

    it('withholds the cities other panels already hold, and names them', () => {
        const { available, taken } = buildCityPickerOptions({
            ...base,
            used: [
                { city: 'Budva', country: 'Montenegro' },
                { city: 'Tirana', country: 'Albania' },
            ],
        });

        expect(available).not.toContain('Budva');
        expect(taken).toEqual(['Budva']);
    });

    it('still offers the city being edited', () => {
        const { available, taken } = buildCityPickerOptions({
            ...base,
            current: 'Budva',
            used: [{ city: 'Budva', country: 'Montenegro' }],
        });

        expect(available).toContain('Budva');
        expect(taken).toEqual([]);
    });

    it('offers nothing until a country is chosen', () => {
        expect(buildCityPickerOptions({ ...base, country: '  ' })).toEqual({ available: [], taken: [] });
    });

    it('sorts what it offers, so the list does not reshuffle between renders', () => {
        const { available } = buildCityPickerOptions({
            ...base,
            known: [{ city: 'Ada Bojana', country: 'Montenegro' }],
        });

        expect(available).toEqual([...available].sort((a, b) => a.localeCompare(b)));
    });
});
