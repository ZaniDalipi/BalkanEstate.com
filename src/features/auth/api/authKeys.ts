// Auth Query Keys Factory
// Centralized query key management for auth-related queries

/**
 * Query key factory for auth feature
 *
 * Pattern:
 * - All auth keys start with ['auth']
 * - Nested keys for specific queries
 * - Makes invalidation and prefetching easier
 */
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
  user: (id: string) => [...authKeys.all, 'user', id] as const,
} as const;
