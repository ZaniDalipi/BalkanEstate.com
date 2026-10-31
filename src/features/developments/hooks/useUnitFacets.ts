import { useQuery } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import { getUnitFacets } from '../api/developmentsApi';

/** Live unit counts for the dashboard dropdowns; refetched after any unit change. */
export const useUnitFacets = (developmentId: string | undefined) =>
  useQuery({
    queryKey: developmentKeys.unitFacets(developmentId ?? ''),
    queryFn: () => getUnitFacets(developmentId as string),
    enabled: !!developmentId,
    staleTime: 30_000,
  });
