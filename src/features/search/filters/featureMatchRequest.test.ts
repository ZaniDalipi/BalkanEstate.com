import { describe, it, expect } from 'vitest';
import { initialFilters } from '@/types';
import { featureMatchRequest, hasFeatureRequest } from '@/utils/featureMatchRequest';

describe('featureMatchRequest', () => {
    it('asks for nothing when no amenity or "yes" feature is set', () => {
        expect(featureMatchRequest(initialFilters)).toBeNull();
        expect(hasFeatureRequest({ ...initialFilters, petsAllowed: false })).toBe(false);
    });

    it('sends amenities in a stable order with the "yes" features and the market', () => {
        expect(featureMatchRequest({
            ...initialFilters, amenities: ['sauna', ' fireplace ', 'sauna'], hasPool: true, hasBalcony: true,
        })).toEqual({ features: ['fireplace', 'sauna'], flags: ['hasBalcony', 'hasPool'], listingType: 'sale' });
    });

    it('leaves the market out when any is allowed', () => {
        expect(featureMatchRequest({ ...initialFilters, listingType: 'any', hasGarden: true }))
            .toEqual({ features: [], flags: ['hasGarden'] });
    });
});
