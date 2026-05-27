import { apiRequest } from '@/src/shared/api';
import type {
  CityPriceHistory,
  EconomicIndicators,
} from '@/src/shared/types/cityInsights.types';

export const getCityPriceHistory = async (
  city: string,
  country: string
): Promise<CityPriceHistory> => {
  return apiRequest<CityPriceHistory>(
    `/cities/history/${encodeURIComponent(city)}/${encodeURIComponent(country)}`,
    { requiresAuth: false }
  );
};

export const getEconomicIndicators = async (
  country: string
): Promise<EconomicIndicators> => {
  return apiRequest<EconomicIndicators>(
    `/cities/economic/${encodeURIComponent(country)}`,
    { requiresAuth: false }
  );
};
