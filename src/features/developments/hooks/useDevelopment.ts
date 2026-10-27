import { useQuery } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import {
  getMyDevelopment,
  getPublicDevelopment,
  getPublicDevelopmentUnits,
  getPublicUnit,
  getDevelopmentStructure,
  listUnits,
} from '../api/developmentsApi';
import type { UnitListQuery } from '../types';

/** A single development the caller can author (dashboard). */
export function useMyDevelopment(id: string | undefined) {
  const query = useQuery({
    queryKey: developmentKeys.detail(id ?? ''),
    queryFn: () => getMyDevelopment(id as string),
    enabled: !!id,
  });
  return {
    development: query.data?.development,
    role: query.data?.role,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** A single published development by slug (public). */
export function usePublicDevelopment(slug: string | undefined) {
  const query = useQuery({
    queryKey: developmentKeys.publicDetail(slug ?? ''),
    queryFn: () => getPublicDevelopment(slug as string),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
  return {
    development: query.data?.development,
    buildings: query.data?.buildings ?? [],
    floors: query.data?.floors ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** Public units of a published development (buyer-facing browser). */
export function usePublicDevelopmentUnits(slug: string | undefined) {
  const query = useQuery({
    queryKey: developmentKeys.publicUnits(slug ?? ''),
    queryFn: () => getPublicDevelopmentUnits(slug as string),
    enabled: !!slug,
    staleTime: 2 * 60_000,
  });
  return {
    units: query.data?.units ?? [],
    summary: query.data?.summary,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** A single public unit with its context and linked listings (detail page). */
export function usePublicUnit(slug: string | undefined, unitId: string | undefined) {
  const query = useQuery({
    queryKey: developmentKeys.publicUnit(slug ?? '', unitId ?? ''),
    queryFn: () => getPublicUnit(slug as string, unitId as string),
    enabled: !!slug && !!unitId,
    staleTime: 2 * 60_000,
  });
  return {
    unit: query.data?.unit,
    development: query.data?.development,
    listings: query.data?.listings ?? [],
    companions: query.data?.companions ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** Buildings, entrances and floors of a development (dashboard inventory). */
export function useDevelopmentStructure(id: string | undefined) {
  const query = useQuery({
    queryKey: developmentKeys.structure(id ?? ''),
    queryFn: () => getDevelopmentStructure(id as string),
    enabled: !!id,
  });
  return {
    buildings: query.data?.buildings ?? [],
    entrances: query.data?.entrances ?? [],
    floors: query.data?.floors ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** Paginated, searchable, sortable units of a development (dashboard inventory). */
export function useDevelopmentUnits(id: string | undefined, filters: UnitListQuery = {}) {
  const query = useQuery({
    queryKey: developmentKeys.units(id ?? '', filters),
    queryFn: () => listUnits(id as string, filters),
    enabled: !!id,
    // Keep the previous page on screen while the next one loads (no table flash).
    placeholderData: (prev) => prev,
  });
  return {
    units: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
