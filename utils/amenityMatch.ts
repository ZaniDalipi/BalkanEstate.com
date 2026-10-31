import type { Property } from '../types';

/**
 * Amenity filters. An amenity is one requirement that may be written several
 * ways — "floor heating|ngrohje në dysheme|podno grejanje" — so a listing in
 * any of the site's languages can meet it. The AI search writes these; one a
 * person types is a single alternative.
 */

const fold = (s: string): string =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s-]+/g, ' ').trim();

/** The ways an amenity may be written, cleaned. */
export const amenityAlternatives = (amenity: string): string[] =>
    (amenity || '').split('|').map(a => a.trim()).filter(Boolean);

/** What to show for an amenity: its first (English) wording. */
export const amenityLabel = (amenity: string): string => amenityAlternatives(amenity)[0] ?? '';

/**
 * Whether a listing states the amenity in the fields the search list carries
 * (amenities, special features, title). The listing must contain the wording,
 * not the other way round: asking for "panoramic view" is not met by "view".
 */
export const listingHasAmenity = (p: Property, amenity: string): boolean => {
    const wanted = amenityAlternatives(amenity).map(fold).filter(Boolean);
    if (wanted.length === 0) return true;
    const texts = [...(p.amenities || []), ...(p.specialFeatures || []), p.title || '']
        .map(fold)
        .filter(Boolean);
    return wanted.some(term => texts.some(text => text.includes(term)));
};
