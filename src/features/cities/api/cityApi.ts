// Cities API module
// Handles city market data and recommendations API calls

import { apiRequest } from '@/src/shared/api';
import type { CityMarketData } from '@/src/shared/types';

// --- City Market Data API ---

export const getFeaturedCities = async (limit: number = 12): Promise<CityMarketData[]> => {
  const response = await apiRequest<{ cities: CityMarketData[] }>(
    `/cities/featured?limit=${limit}`,
    { requiresAuth: false }
  );
  return response.cities;
};

export const getCitiesByCountry = async (country: string): Promise<CityMarketData[]> => {
  const response = await apiRequest<{ cities: CityMarketData[] }>(
    `/cities/country/${encodeURIComponent(country)}`,
    { requiresAuth: false }
  );
  return response.cities;
};

export const getCityMarketData = async (
  city: string,
  country: string
): Promise<CityMarketData> => {
  const response = await apiRequest<{ data: CityMarketData }>(
    `/cities/market-data/${encodeURIComponent(city)}/${encodeURIComponent(country)}`,
    { requiresAuth: false }
  );
  return response.data;
};

export const triggerMarketDataUpdate = async (): Promise<void> => {
  await apiRequest('/cities/update-market-data', {
    method: 'POST',
    requiresAuth: true,
  });
};
