export const valuationKeys = {
  all: ['valuations'] as const,
  lists: () => [...valuationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...valuationKeys.lists(), filters] as const,
  details: () => [...valuationKeys.all, 'detail'] as const,
  detail: (id: string) => [...valuationKeys.details(), id] as const,
  history: () => [...valuationKeys.all, 'history'] as const,
  stats: (city: string, country: string) => [...valuationKeys.all, 'stats', city, country] as const,
};
