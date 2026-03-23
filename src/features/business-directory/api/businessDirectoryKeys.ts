import type { BusinessListingFilters } from '@/src/shared/types/businessListing.types';

export const businessDirectoryKeys = {
  all: ['business-listings'] as const,
  lists: () => [...businessDirectoryKeys.all, 'list'] as const,
  list: (filters?: BusinessListingFilters) => [...businessDirectoryKeys.lists(), { filters }] as const,
  details: () => [...businessDirectoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...businessDirectoryKeys.details(), id] as const,
  myListings: () => [...businessDirectoryKeys.all, 'my-listings'] as const,
} as const;
