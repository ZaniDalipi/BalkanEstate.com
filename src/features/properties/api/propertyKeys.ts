// Property Query Keys Factory
// Centralized query key management for property-related queries

/**
 * Query key factory for properties feature
 *
 * Pattern:
 * - All property keys start with ['properties']
 * - Nested keys for specific queries
 * - Filters are included in keys for proper caching
 *
 * Benefits:
 * - Easy invalidation: queryClient.invalidateQueries({ queryKey: propertyKeys.all })
 * - Easy prefetching: queryClient.prefetchQuery({ queryKey: propertyKeys.detail(id) })
 * - Type-safe query keys
 */
export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters?: any) => [...propertyKeys.lists(), { filters }] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
  myListings: () => [...propertyKeys.all, 'my-listings'] as const,
  favorites: () => [...propertyKeys.all, 'favorites'] as const,
} as const;
