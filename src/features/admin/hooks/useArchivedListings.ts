import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminKeys } from '@/src/shared/query/queryKeys';
import { listArchivedListings, type ArchiveListParams } from '../api/archivedListingsAdminApi';

/** A page of the listing archive for the current filters. */
export function useArchivedListings(params: ArchiveListParams) {
  return useQuery({
    queryKey: adminKeys.archivedListings(params),
    queryFn: () => listArchivedListings(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
