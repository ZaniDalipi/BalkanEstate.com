/**
 * Query-key factory for the developments feature. Centralised so cache
 * invalidation after a mutation always targets the exact same keys the queries
 * use (see CLAUDE.md → query keys).
 */
export const developmentKeys = {
  all: ['developments'] as const,

  // Public (published) discovery
  public: () => [...developmentKeys.all, 'public'] as const,
  publicList: (filters?: object) =>
    [...developmentKeys.public(), 'list', { filters }] as const,
  publicDetail: (slug: string) => [...developmentKeys.public(), 'detail', slug] as const,

  // Dashboard (authored)
  mine: () => [...developmentKeys.all, 'mine'] as const,
  mineList: (filters?: object) =>
    [...developmentKeys.mine(), 'list', { filters }] as const,
  detail: (id: string) => [...developmentKeys.all, 'detail', id] as const,
  units: (id: string, filters?: object) =>
    [...developmentKeys.detail(id), 'units', { filters }] as const,

  // Listing-creation suggestions (nearby developments for a point)
  nearby: (params?: object) =>
    [...developmentKeys.all, 'nearby', { params }] as const,
} as const;
