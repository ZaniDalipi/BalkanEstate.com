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
  publicUnits: (slug: string) => [...developmentKeys.publicDetail(slug), 'units'] as const,
  publicUnit: (slug: string, unitId: string) =>
    [...developmentKeys.publicDetail(slug), 'unit', unitId] as const,
  publicScene: (slug: string, targetType: string, targetId: string) =>
    [...developmentKeys.publicDetail(slug), 'scene', targetType, targetId] as const,
  /** Every published view of one target (the explorer's camera perspectives). */
  publicViews: (slug: string, targetType: string, targetId: string) =>
    [...developmentKeys.publicDetail(slug), 'views', targetType, targetId] as const,
  follow: (slug: string) => [...developmentKeys.publicDetail(slug), 'follow'] as const,

  // Dashboard (authored)
  mine: () => [...developmentKeys.all, 'mine'] as const,
  mineList: (filters?: object) =>
    [...developmentKeys.mine(), 'list', { filters }] as const,
  detail: (id: string) => [...developmentKeys.all, 'detail', id] as const,
  /** Prefix of every inventory query of a development — invalidate this after a unit write. */
  unitsAll: (id: string) => [...developmentKeys.detail(id), 'units'] as const,
  units: (id: string, filters?: object) =>
    [...developmentKeys.detail(id), 'units', { filters }] as const,
  structure: (id: string) => [...developmentKeys.detail(id), 'structure'] as const,
  scenes: (id: string) => [...developmentKeys.detail(id), 'scenes'] as const,
  /** Activity tab: audit entries of one development, per action-family filter. */
  audit: (id: string, filter?: string) => [...developmentKeys.detail(id), 'audit', { filter: filter ?? '' }] as const,
  attachableListings: (id: string, q: string) =>
    [...developmentKeys.detail(id), 'attachable-listings', q] as const,

  // Listing-creation suggestions (nearby developments for a point)
  nearby: (params?: object) =>
    [...developmentKeys.all, 'nearby', { params }] as const,
} as const;
