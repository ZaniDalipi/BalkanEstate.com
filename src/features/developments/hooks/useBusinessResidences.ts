import { useQuery } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import { getBusinessResidences } from '../api/developmentsApi';

/** The published residences a Business Directory company builds (shown on its directory page). */
export function useBusinessResidences(business: string | undefined) {
  const query = useQuery({
    queryKey: developmentKeys.publicByBusiness(business ?? ''),
    queryFn: () => getBusinessResidences(business as string),
    enabled: !!business,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return { residences: query.data?.residences ?? [], isLoading: query.isLoading, error: query.error };
}
