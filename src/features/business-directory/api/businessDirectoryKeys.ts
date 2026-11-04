import type { BusinessListingFilters } from '@/src/shared/types/businessListing.types';

export const businessDirectoryKeys = {
  all: ['business-listings'] as const,
  lists: () => [...businessDirectoryKeys.all, 'list'] as const,
  list: (filters?: BusinessListingFilters) => [...businessDirectoryKeys.lists(), { filters }] as const,
  details: () => [...businessDirectoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...businessDirectoryKeys.details(), id] as const,
  myListings: () => [...businessDirectoryKeys.all, 'my-listings'] as const,
  place: (id: string) => [...businessDirectoryKeys.all, 'place', id] as const,
  /** Coordinates arrive rounded (~10 m) so small GPS jitter reuses the route. */
  route: (from: { lat: number; lng: number }, to: { lat: number; lng: number }, mode: string) =>
    [...businessDirectoryKeys.all, 'route', mode, from.lat, from.lng, to.lat, to.lng] as const,
} as const;
