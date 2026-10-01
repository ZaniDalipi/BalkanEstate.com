// useSoldProperties Hook - Homes that have sold, for the search page's sold filter
//
// The search page loads what is on the market up front; sold homes are only
// fetched once someone asks for them, then kept for a while — they change
// rarely, and the realtime hook still invalidates them with every other list.

import { useQuery } from '@tanstack/react-query';
import { initialFilters } from '@/src/shared/types';
import { propertyKeys, getProperties } from '../api';

const SOLD_FILTERS = { ...initialFilters, listingType: 'sale' as const };

export function useSoldProperties(enabled: boolean) {
  const { data = [], isLoading } = useQuery({
    queryKey: propertyKeys.list({ status: 'sold', listingType: 'sale' }),
    queryFn: () => getProperties(SOLD_FILTERS, { limit: 3000, status: 'sold' }),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return { soldProperties: data, isLoadingSold: enabled && isLoading };
}
