// React Query keys for agent-related queries
// Following the query key factory pattern

export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...agentKeys.lists(), filters] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
  teamMembers: (agencyId: string) => [...agentKeys.all, 'team', agencyId] as const,
  saved: () => [...agentKeys.all, 'saved'] as const,
  reviews: (agentId: string) => [...agentKeys.all, 'reviews', agentId] as const,
};
