import { useQuery } from '@tanstack/react-query';
import { getCityPriceHistory, getEconomicIndicators } from '../api/cityInsightsApi';

const no404Retry = (failureCount: number, error: unknown): boolean => {
  if ((error as { statusCode?: number })?.statusCode === 404) return false;
  return failureCount < 1;
};

export const cityInsightsKeys = {
  all: ['cityInsights'] as const,
  history: (city: string, country: string) =>
    [...cityInsightsKeys.all, 'history', city, country] as const,
  economic: (country: string) =>
    [...cityInsightsKeys.all, 'economic', country] as const,
};

export function useCityPriceHistory(city: string | undefined, country: string | undefined) {
  return useQuery({
    queryKey: cityInsightsKeys.history(city!, country!),
    queryFn: () => getCityPriceHistory(city!, country!),
    enabled: !!city && !!country,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: no404Retry,
  });
}

export function useEconomicIndicators(country: string | undefined) {
  return useQuery({
    queryKey: cityInsightsKeys.economic(country!),
    queryFn: () => getEconomicIndicators(country!),
    enabled: !!country,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: no404Retry,
  });
}
