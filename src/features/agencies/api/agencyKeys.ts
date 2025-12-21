// Agency Query Keys Factory
// Centralized query key management for agency-related queries

export const agencyKeys = {
  all: ['agencies'] as const,
  lists: () => [...agencyKeys.all, 'list'] as const,
  list: (filters?: any) => [...agencyKeys.lists(), { filters }] as const,
  featured: () => [...agencyKeys.all, 'featured'] as const,
  details: () => [...agencyKeys.all, 'detail'] as const,
  detail: (id: string) => [...agencyKeys.details(), id] as const,
  joinRequests: (agencyId: string) => [...agencyKeys.detail(agencyId), 'join-requests'] as const,
} as const;
