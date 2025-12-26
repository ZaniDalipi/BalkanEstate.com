import { useQuery, useMutation } from '@tanstack/react-query';
import {
  viewStatsApiClient,
  EntityType,
  Period,
  EntityStatsResponse,
  MyPropertiesStatsResponse,
  ComparisonStats,
  DashboardResponse,
  ReportResponse,
} from '@/src/data/api/ViewStatsApiClient';

// Query keys for React Query cache management
export const viewStatsKeys = {
  all: ['viewStats'] as const,
  entity: (type: EntityType, id: string, period: Period) =>
    [...viewStatsKeys.all, 'entity', type, id, period] as const,
  myProperties: (period: Period) => [...viewStatsKeys.all, 'myProperties', period] as const,
  myAgent: (period: Period) => [...viewStatsKeys.all, 'myAgent', period] as const,
  myAgency: (period: Period) => [...viewStatsKeys.all, 'myAgency', period] as const,
  comparison: () => [...viewStatsKeys.all, 'comparison'] as const,
  dashboard: () => [...viewStatsKeys.all, 'dashboard'] as const,
  report: (period: Period) => [...viewStatsKeys.all, 'report', period] as const,
};

/**
 * Hook to get view statistics for a specific entity
 */
export function useEntityViewStats(
  entityType: EntityType,
  entityId: string | undefined,
  period: Period = '30d',
  enabled = true
) {
  return useQuery<EntityStatsResponse>({
    queryKey: viewStatsKeys.entity(entityType, entityId || '', period),
    queryFn: () => viewStatsApiClient.getEntityStats(entityType, entityId!, period),
    enabled: enabled && !!entityId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to get view statistics for all user's properties
 */
export function useMyPropertiesViewStats(period: Period = '30d', enabled = true) {
  return useQuery<MyPropertiesStatsResponse>({
    queryKey: viewStatsKeys.myProperties(period),
    queryFn: () => viewStatsApiClient.getMyPropertiesStats(period),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.message?.includes('401') || error?.message?.includes('Not authorized')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook to get view statistics for agent's profile
 */
export function useMyAgentViewStats(period: Period = '30d', enabled = true) {
  return useQuery<EntityStatsResponse>({
    queryKey: viewStatsKeys.myAgent(period),
    queryFn: () => viewStatsApiClient.getMyAgentStats(period),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to get view statistics for user's agency
 */
export function useMyAgencyViewStats(period: Period = '30d', enabled = true) {
  return useQuery<EntityStatsResponse>({
    queryKey: viewStatsKeys.myAgency(period),
    queryFn: () => viewStatsApiClient.getMyAgencyStats(period),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to get comparison statistics (week over week, month over month)
 */
export function useViewStatsComparison(enabled = true) {
  return useQuery<ComparisonStats>({
    queryKey: viewStatsKeys.comparison(),
    queryFn: () => viewStatsApiClient.getComparisonStats(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to get dashboard overview with all stats
 */
export function useDashboardOverview(enabled = true) {
  return useQuery<DashboardResponse>({
    queryKey: viewStatsKeys.dashboard(),
    queryFn: () => viewStatsApiClient.getDashboardOverview(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors (401)
      if (error?.message?.includes('401') || error?.message?.includes('Not authorized')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

/**
 * Hook to generate analytics report (Premium only)
 */
export function useAnalyticsReport(period: Period = '30d', enabled = true) {
  return useQuery<ReportResponse>({
    queryKey: viewStatsKeys.report(period),
    queryFn: async () => {
      const result = await viewStatsApiClient.generateReport(period, 'json');
      return result as ReportResponse;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for downloading CSV report
 */
export function useDownloadReport() {
  return useMutation({
    mutationFn: (period: Period) => viewStatsApiClient.downloadReportCSV(period),
  });
}
