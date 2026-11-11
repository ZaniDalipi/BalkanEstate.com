import { useQuery } from '@tanstack/react-query';
import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { businessDirectoryKeys } from '../api/businessDirectoryKeys';
import { geocodePlace } from '../api/businessExtrasApi';
import { countryCodeFor, pinnedPlace, placeQueries, type BusinessPlace } from '../utils/businessPlace';

/** Try the address, then the city; the first that is found wins. */
async function lookUp(l: BusinessListing): Promise<BusinessPlace | null> {
  const code = countryCodeFor(l.country);
  for (const { query, precision } of placeQueries(l)) {
    try {
      const position = await geocodePlace(query, code);
      if (position) return { position, precision };
    } catch {
      // A failed lookup is the same as no match: try the next, coarser one.
    }
  }
  return null;
}

/**
 * Where the business is on the map: the owner's pin, or — when they never
 * set one — the address (or city) looked up, marked approximate.
 */
export function useBusinessPlace(listing: BusinessListing): { place: BusinessPlace | null; isLocating: boolean } {
  const pinned = pinnedPlace(listing);
  const { data, isLoading } = useQuery({
    queryKey: businessDirectoryKeys.place(listing.id),
    queryFn: () => lookUp(listing),
    enabled: !pinned,
    retry: false,
    staleTime: 24 * 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
  });
  return { place: pinned ?? data ?? null, isLocating: !pinned && isLoading };
}
