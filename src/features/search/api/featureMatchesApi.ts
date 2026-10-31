import { apiRequest } from '@/src/shared/api';
import type { FeatureMatchRequest } from '@/utils/featureMatchRequest';

/** Ids of listings whose full text (tags, title, description) has every requested feature. */
export const fetchFeatureMatches = async (request: FeatureMatchRequest): Promise<string[]> => {
    const params = new URLSearchParams();
    request.features.forEach(feature => params.append('features', feature));
    if (request.flags.length > 0) params.append('flags', request.flags.join(','));
    if (request.listingType) params.append('listingType', request.listingType);
    const response = await apiRequest<{ ids: string[] }>(`/properties/feature-matches?${params.toString()}`);
    return Array.isArray(response.ids) ? response.ids : [];
};
