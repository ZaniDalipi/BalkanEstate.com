import { apiRequest } from '@/src/shared/api';
import type { PropertyValuation, ValuationInput } from '../types';

interface ValuationResponse {
  success: boolean;
  data: PropertyValuation;
}

interface ValuationHistoryResponse {
  success: boolean;
  count: number;
  data: PropertyValuation[];
}

interface ValuationStatsResponse {
  success: boolean;
  data: Array<{
    _id: string;
    count: number;
    avgValue: number;
    avgPricePerSqm: number;
    avgConfidence: number;
  }>;
}

/**
 * Create a new property valuation
 */
export const createValuation = async (input: ValuationInput): Promise<PropertyValuation> => {
  const response = await apiRequest<ValuationResponse>('/valuations', {
    method: 'POST',
    body: input,
  });

  return response.data;
};

/**
 * Get a valuation by ID
 */
export const getValuation = async (id: string): Promise<PropertyValuation> => {
  const response = await apiRequest<ValuationResponse>(`/valuations/${id}`);
  return response.data;
};

/**
 * Get user's valuation history
 */
export const getValuationHistory = async (limit = 10): Promise<PropertyValuation[]> => {
  const response = await apiRequest<ValuationHistoryResponse>(
    `/valuations/user/history?limit=${limit}`,
    { requiresAuth: true }
  );
  return response.data;
};

/**
 * Get valuation statistics for a city
 */
export const getCityValuationStats = async (city: string, country: string) => {
  const response = await apiRequest<ValuationStatsResponse>(
    `/valuations/stats/${encodeURIComponent(city)}/${encodeURIComponent(country)}`
  );
  return response.data;
};
