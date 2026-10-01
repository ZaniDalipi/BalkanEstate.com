// useClosedProperties Hook - Homes that sold or are let, for the sold / rented filter
//
// Search pages load what is on the market up front; the rest is only fetched
// once someone asks for it, then kept for a while — it changes rarely, and the
// realtime hook still invalidates it with every other list.

import { useQuery } from '@tanstack/react-query';
import { initialFilters, type Filters } from '@/src/shared/types';
import { propertyKeys, getProperties } from '../api';

export interface ClosedPropertiesScope {
  /** 'sale' fetches sold homes only; 'any' fetches sold and rented. */
  listingType: 'sale' | 'any';
  /** Narrow to one type, e.g. the luxury villas collection. */
  propertyType?: Filters['propertyType'];
}

export function useClosedProperties(enabled: boolean, scope: ClosedPropertiesScope) {
  const { listingType, propertyType = 'any' } = scope;
  const { data = [], isLoading } = useQuery({
    queryKey: propertyKeys.list({ status: 'closed', listingType, propertyType }),
    queryFn: async () => {
      const filters: Filters = { ...initialFilters, listingType, propertyType };
      const statuses = listingType === 'sale' ? (['sold'] as const) : (['sold', 'rented'] as const);
      const pages = await Promise.all(statuses.map((status) => getProperties(filters, { limit: 3000, status })));
      return pages.flat();
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return { closedProperties: data, isLoadingClosed: enabled && isLoading };
}
