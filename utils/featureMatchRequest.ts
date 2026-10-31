import type { Filters } from '../types';

/**
 * What to ask the server's feature check (GET /properties/feature-matches)
 * for a set of filters: the amenities, and the "yes" features a listing may
 * state in its text rather than tick. Mirrors FEATURE_FLAGS on the server.
 */

export const TEXT_BACKED_FLAGS = [
    'hasBalcony', 'hasGarden', 'hasElevator', 'hasSecurity',
    'hasAirConditioning', 'hasPool', 'petsAllowed',
] as const;

export interface FeatureMatchRequest {
    features: string[];
    flags: string[];
    listingType?: 'sale' | 'rent';
}

/** The request for these filters, in a stable order; null when nothing needs the server. */
export const featureMatchRequest = (filters: Filters): FeatureMatchRequest | null => {
    const features = [...new Set((filters.amenities ?? []).map(a => a.trim()).filter(Boolean))].sort();
    const flags = TEXT_BACKED_FLAGS.filter(flag => filters[flag] === true);
    if (features.length === 0 && flags.length === 0) return null;
    const listingType = filters.listingType === 'sale' || filters.listingType === 'rent' ? filters.listingType : undefined;
    return { features, flags: [...flags], ...(listingType ? { listingType } : {}) };
};

export const hasFeatureRequest = (filters: Filters): boolean => featureMatchRequest(filters) !== null;
