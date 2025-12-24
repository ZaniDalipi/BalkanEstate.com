import { useQuery } from '@tanstack/react-query';
import {
  viewStatsApiClient,
  EntityType,
  Period,
  EntityStatsResponse,
  MyPropertiesStatsResponse,
  ComparisonStats,
} from '../../../data/api/ViewStatsApiClient';

// Query keys for React Query cache management
export const viewStatsKeys = {
  all: ['viewStats'] as const,
  entity: (type: EntityType, id: string, period: Period) =>
    [...viewStatsKeys.all, 'entity', type, id, period] as const,
  myProperties: (period: Period) => [...viewStatsKeys.all, 'myProperties', period] as const,
  myAgent: (period: Period) => [...viewStatsKeys.all, 'myAgent', period] as const,
  myAgency: (period: Period) => [...viewStatsKeys.all, 'myAgency', period] as const,
  comparison: () => [...viewStatsKeys.all, 'comparison'] as const,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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
