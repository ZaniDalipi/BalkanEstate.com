// Agency Dashboard Query Keys Factory
// Centralized query key management for agency dashboard queries

export const agencyDashboardKeys = {
  all: ['agency-dashboard'] as const,
  overview: (agencyId: string) => [...agencyDashboardKeys.all, 'overview', agencyId] as const,
  agents: (agencyId: string) => [...agencyDashboardKeys.all, 'agents', agencyId] as const,
  agentDetail: (agencyId: string, agentId: string) => [...agencyDashboardKeys.agents(agencyId), agentId] as const,
  properties: (agencyId: string, filters?: Record<string, unknown>) => [...agencyDashboardKeys.all, 'properties', agencyId, { filters }] as const,
  inquiries: (agencyId: string, filters?: Record<string, unknown>) => [...agencyDashboardKeys.all, 'inquiries', agencyId, { filters }] as const,
  analytics: (agencyId: string, range?: string) => [...agencyDashboardKeys.all, 'analytics', agencyId, range] as const,
  financial: (agencyId: string) => [...agencyDashboardKeys.all, 'financial', agencyId] as const,
  teamFeed: (agencyId: string) => [...agencyDashboardKeys.all, 'team-feed', agencyId] as const,
  teamNotes: (agencyId: string) => [...agencyDashboardKeys.all, 'team-notes', agencyId] as const,
} as const;
