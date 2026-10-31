import { describe, it, expect } from 'vitest';
import { initialFilters } from '@/types';
import { readRentHandoff, rentHandoffState } from './rentHandoff';

describe('rent hand-off', () => {
    it('carries a rental AI search over whole', () => {
        const filters = { ...initialFilters, listingType: 'rent' as const, beds: 2, maxBeds: 2, orientation: 'south' as const };
        expect(readRentHandoff(rentHandoffState(filters))).toEqual(filters);
    });

    it('ignores anything that is not a rental filter set', () => {
        expect(readRentHandoff(null)).toBeNull();
        expect(readRentHandoff({ property: {} })).toBeNull();
        expect(readRentHandoff(rentHandoffState({ ...initialFilters, listingType: 'sale' }))).toBeNull();
    });

    it('takes only the fields a filter set has', () => {
        const carried = readRentHandoff({ aiSearchFilters: { listingType: 'rent', beds: 1, isAdmin: true } });
        expect(carried).toEqual({ ...initialFilters, listingType: 'rent', beds: 1 });
    });
});
