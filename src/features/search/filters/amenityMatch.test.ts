import { describe, it, expect } from 'vitest';
import type { Property } from '@/types';
import { amenityAlternatives, amenityLabel, listingHasAmenity } from '@/utils/amenityMatch';

const listing = (fields: Partial<Property>) => ({ amenities: [], specialFeatures: [], ...fields }) as unknown as Property;

describe('amenityAlternatives / amenityLabel', () => {
    it('splits the wordings and shows the first', () => {
        expect(amenityAlternatives(' floor heating | ngrohje në dysheme |')).toEqual(['floor heating', 'ngrohje në dysheme']);
        expect(amenityLabel('floor heating|ngrohje në dysheme')).toBe('floor heating');
        expect(amenityLabel('sauna')).toBe('sauna');
    });
});

describe('listingHasAmenity', () => {
    it('finds any wording, ignoring accents, case and hyphens', () => {
        expect(listingHasAmenity(listing({ amenities: ['Ngrohje në dyshemë'] }), 'floor heating|ngrohje ne dysheme')).toBe(true);
        expect(listingHasAmenity(listing({ specialFeatures: ['Under-floor heating'] }), 'under floor heating')).toBe(true);
    });

    it('reads the title too', () => {
        expect(listingHasAmenity(listing({ title: 'Penthouse with PANORAMIC VIEW' }), 'panoramic view')).toBe(true);
    });

    it('is not met by a shorter, vaguer tag', () => {
        expect(listingHasAmenity(listing({ amenities: ['view'] }), 'panoramic view')).toBe(false);
    });

    it('is not met when nothing mentions it', () => {
        expect(listingHasAmenity(listing({ amenities: ['sauna'] }), 'fireplace|kamin')).toBe(false);
    });
});
