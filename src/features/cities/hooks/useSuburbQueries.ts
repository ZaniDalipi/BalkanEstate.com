/**
 * Suburb & city image React Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { getSuburbData, getCityImages, getCityGeoData } from '../api/suburbApi';

const no404Retry = (failureCount: number, error: unknown): boolean => {
  if ((error as { statusCode?: number })?.statusCode === 404) return false;
  return failureCount < 1;
};

export const suburbKeys = {
  all: ['suburbs'] as const,
  byCity: (city: string, country: string) =>
    [...suburbKeys.all, 'city', city, country] as const,
  images: (city: string, country: string) =>
    [...suburbKeys.all, 'images', city, country] as const,
  geodata: (city: string, country: string) =>
    [...suburbKeys.all, 'geodata', city, country] as const,
};

export function useSuburbData(city: string | undefined, country: string | undefined) {
  return useQuery({
    queryKey: suburbKeys.byCity(city!, country!),
    queryFn: () => getSuburbData(city!, country!),
    enabled: !!city && !!country,
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useCityImages(city: string | undefined, country: string | undefined) {
  return useQuery({
    queryKey: suburbKeys.images(city!, country!),
    queryFn: () => getCityImages(city!, country!),
    enabled: !!city && !!country,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: no404Retry,
  });
}

export function useCityGeoData(city: string | undefined, country: string | undefined) {
  return useQuery({
    queryKey: suburbKeys.geodata(city!, country!),
    queryFn: () => getCityGeoData(city!, country!),
    enabled: !!city && !!country,
    staleTime: 7 * 24 * 60 * 60 * 1000,
    gcTime: 30 * 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: no404Retry,
  });
}
