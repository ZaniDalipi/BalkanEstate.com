/**
 * Searching an agent's own listings. A visitor on a profile page types what
 * they remember — a city with the diacritics dropped, a property ID off an
 * email, half a title — so the filter has to be forgiving without becoming
 * useless (two terms narrow, they don't widen).
 */

import { describe, it, expect } from 'vitest';
import type { Property } from '@/types';
import { filterPropertiesByQuery, matchesPropertyQuery, parseSearchTerms } from '@/src/features/agents/utils/propertySearch';

const property = (over: Partial<Property> = {}): Property => ({
    id: 'p1',
    sellerId: 'agent-1',
    listingType: 'sale',
    status: 'active',
    price: 120000,
    address: 'Rruga e Kavajës 12',
    city: 'Tirana',
    country: 'Albania',
    sqft: 90,
    yearBuilt: 2020,
    description: 'A bright apartment with a balcony overlooking the boulevard.',
    specialFeatures: [],
    materials: [],
    amenities: [],
    propertyType: 'apartment',
    title: 'Shitet apartament 2+1',
    ...over,
} as Property);

const listings: Property[] = [
    property({ id: 'a', title: 'Shitet apartament 2+1', city: 'Tirana', propertyType: 'apartment', propertyId: 'BE-101' }),
    property({ id: 'b', title: 'Porto Lalzi Shitet Vilë', city: 'Durrës', propertyType: 'villa', propertyId: 'BE-102' }),
    property({ id: 'c', title: 'Shitet Tokë Liqeni i Thatë', city: 'Tirana', propertyType: 'land', propertyId: 'BE-103' }),
];

describe('agent listing search', () => {
    it('matches a city typed without its diacritics', () => {
        expect(filterPropertiesByQuery(listings, 'durres').map(p => p.id)).toEqual(['b']);
    });

    it('finds a property by its ID', () => {
        expect(filterPropertiesByQuery(listings, 'be-103').map(p => p.id)).toEqual(['c']);
    });

    it('matches part of a title, whatever the case', () => {
        expect(filterPropertiesByQuery(listings, 'APARTAMENT').map(p => p.id)).toEqual(['a']);
    });

    it('narrows on every term rather than widening', () => {
        // "villa" alone hits b; adding "tirana" must leave nothing, not both.
        expect(filterPropertiesByQuery(listings, 'villa tirana')).toEqual([]);
        expect(filterPropertiesByQuery(listings, 'land tirana').map(p => p.id)).toEqual(['c']);
    });

    it('leaves the list alone when nothing was typed', () => {
        expect(filterPropertiesByQuery(listings, '')).toHaveLength(3);
        expect(filterPropertiesByQuery(listings, '   ')).toHaveLength(3);
    });

    it('does not match on the description, which would hit almost everything', () => {
        expect(filterPropertiesByQuery(listings, 'balcony')).toEqual([]);
    });

    it('sanitises the query through the shared validator', () => {
        // Script tags are stripped rather than matched literally, and the
        // 200-character cap keeps a pasted wall of text from being one term.
        expect(parseSearchTerms('<script>alert(1)</script>')).not.toContain('<script>');
        expect(parseSearchTerms('x'.repeat(500))[0].length).toBeLessThanOrEqual(200);
    });

    it('survives properties with missing or malformed fields', () => {
        const broken = [
            { id: 'x' } as Property,
            null as unknown as Property,
            property({ id: 'y', title: undefined, city: 'Tirana' }),
        ];
        expect(() => filterPropertiesByQuery(broken, 'tirana')).not.toThrow();
        expect(filterPropertiesByQuery(broken, 'tirana').map(p => p?.id)).toEqual(['y']);
    });

    it('treats an empty term list as a match for anything', () => {
        expect(matchesPropertyQuery(listings[0], [])).toBe(true);
    });
});
