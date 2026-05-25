// Suburb data API module
// Fetches per-suburb real estate data for the interactive choropleth map

import { apiRequest } from '@/src/shared/api';
import type { SuburbData } from '@/src/shared/types/suburb.types';

/**
 * Fetch suburb data for a given city and country.
 * Results are cached server-side for 7 days.
 */
export const getSuburbData = async (
  city: string,
  country: string
): Promise<SuburbData> => {
  const response = await apiRequest<{ suburbs: SuburbData; source: string }>(
    `/cities/suburbs/${encodeURIComponent(city)}/${encodeURIComponent(country)}`,
    { requiresAuth: false }
  );
  return response.suburbs;
};
