import { useQuery } from '@tanstack/react-query';
import { businessDirectoryKeys, getBusinessCategories } from '../api';
import type { ListingType } from '@/src/shared/types/businessListing.types';

/** Categories in use (built-in counts + owner-named ones). Empty while loading or on failure: callers fall back to the built-ins. */
export function useBusinessCategories(listingType?: ListingType) {
  const { data } = useQuery({
    queryKey: businessDirectoryKeys.categories(listingType),
    queryFn: () => getBusinessCategories(listingType),
    staleTime: 5 * 60 * 1000,
  });
  return data ?? { categories: [], custom: [] };
}
