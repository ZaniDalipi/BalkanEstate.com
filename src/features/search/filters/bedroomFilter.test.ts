import { describe, it, expect } from 'vitest';
import { initialFilters } from '@/types';
import { applyFilterChange, bedroomOptionLabel, bedsWithinRange } from '@/utils/bedroomFilter';

describe('bedroomOptionLabel', () => {
    it('reads "2" for exactly two, "2–3" for a range and "2+" otherwise', () => {
        expect(bedroomOptionLabel(2, { beds: 2, maxBeds: 2 })).toBe('2');
        expect(bedroomOptionLabel(2, { beds: 2, maxBeds: 3 })).toBe('2–3');
        expect(bedroomOptionLabel(2, { beds: 2, maxBeds: null })).toBe('2+');
        expect(bedroomOptionLabel(3, { beds: 2, maxBeds: 2 })).toBe('3+');
    });
});

describe('bedsWithinRange', () => {
    it('keeps only the asked count when it is exact', () => {
        const exact = { beds: 2, maxBeds: 2 };
        expect([1, 2, 3].map(n => bedsWithinRange(n, exact))).toEqual([false, true, false]);
    });

    it('treats a listing without a count as none', () => {
        expect(bedsWithinRange(undefined, { beds: 1, maxBeds: null })).toBe(false);
        expect(bedsWithinRange(undefined, { beds: null, maxBeds: 2 })).toBe(true);
    });
});

describe('applyFilterChange', () => {
    it('drops the maximum when bedrooms are picked by hand, and only then', () => {
        const exact = { ...initialFilters, beds: 2, maxBeds: 2 };
        expect(applyFilterChange(exact, 'beds', 3)).toMatchObject({ beds: 3, maxBeds: null });
        expect(applyFilterChange(exact, 'beds', null)).toMatchObject({ beds: null, maxBeds: null });
        expect(applyFilterChange(exact, 'baths', 2)).toMatchObject({ beds: 2, maxBeds: 2, baths: 2 });
    });
});
