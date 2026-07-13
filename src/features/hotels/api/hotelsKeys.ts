import type { HotelFilters } from '@/src/shared/types/hotel.types';

export const hotelsKeys = {
  all: ['hotels'] as const,
  lists: () => [...hotelsKeys.all, 'list'] as const,
  list: (filters?: HotelFilters) => [...hotelsKeys.lists(), { filters }] as const,
  details: () => [...hotelsKeys.all, 'detail'] as const,
  detail: (id: string) => [...hotelsKeys.details(), id] as const,
  myListings: () => [...hotelsKeys.all, 'my-listings'] as const,
} as const;
