import { useQuery } from '@tanstack/react-query';
import { developmentKeys } from '../api/developmentKeys';
import { getListingResidence } from '../api/developmentsApi';

/** The residence a listing belongs to, for "Part of …" on the listing page. */
export const useListingResidence = (listingId: string | undefined) =>
  useQuery({
    queryKey: developmentKeys.forListing(listingId ?? ''),
    queryFn: () => getListingResidence(listingId as string),
    enabled: !!listingId,
    staleTime: 5 * 60_000,
    select: (data) => data.residence,
  });
