import { useQuery } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import { listUnits } from '../api/developmentsApi';
import { EXTRA_UNIT_TYPES } from '../utils/unitCompanions';

/** The residence's parking spots and storage rooms, for "comes with" in the unit editor. */
export function useExtraUnits(developmentId: string, enabled = true) {
  const filters = { unitType: [...EXTRA_UNIT_TYPES], sort: 'unitNumber' as const, limit: 200 };
  const query = useQuery({
    queryKey: developmentKeys.units(developmentId, filters),
    queryFn: () => listUnits(developmentId, filters),
    enabled: !!developmentId && enabled,
  });
  return { extras: query.data?.items ?? [], isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
