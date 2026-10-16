import { useQuery } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import {
  getMyDevelopment,
  getPublicDevelopment,
  getDevelopmentStructure,
  listUnits,
} from '../api/developmentsApi';

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

/** Buildings, entrances and floors of a development (dashboard inventory). */
export function useDevelopmentStructure(id: string | undefined) {
  const query = useQuery({
    queryKey: [...developmentKeys.detail(id ?? ''), 'structure'] as const,
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

/** Paginated units of a development (dashboard inventory). */
export function useDevelopmentUnits(
  id: string | undefined,
  filters: { buildingId?: string; floorId?: string; availability?: string; limit?: number; skip?: number } = {}
) {
  const query = useQuery({
    queryKey: developmentKeys.units(id ?? '', filters),
    queryFn: () => listUnits(id as string, filters),
    enabled: !!id,
  });
  return {
    units: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
