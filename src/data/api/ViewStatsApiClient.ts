// View Statistics API Client
// Handles all view tracking and statistics-related API calls

import { httpClient } from './httpClient';

export type EntityType = 'property' | 'agent' | 'agency';
export type Period = '7d' | '30d' | '90d' | 'all';

export interface TrackViewRequest {
  entityType: EntityType;
  entityId: string;
  sessionId?: string;
  referrer?: string;
  duration?: number;
}

export interface TrackViewResponse {
  success: boolean;
  isUnique: boolean;
  viewId: string;
}

export interface DeviceBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
}

export interface TrafficSources {
  direct: number;
  search: number;
  social: number;
  email: number;
  other: number;
}

export interface ViewStats {
  totalViews: number;
  uniqueViews: number;
  avgDuration: number;
  deviceBreakdown: DeviceBreakdown;
  trafficSources: TrafficSources;
}

export interface DailyView {
  _id: string; // Date string YYYY-MM-DD
  views: number;
  uniqueViews: number;
}

export interface TopReferrer {
  _id: string; // Referrer URL
  count: number;
}

export interface EntityStatsResponse {
  entityType: EntityType;
  entityId: string;
  period: Period;
  stats: ViewStats;
  dailyViews: DailyView[];
  topReferrers: TopReferrer[];
  entityViewStats: {
    totalViews: number;
    uniqueViews: number;
  };
}

export interface PropertyStats {
  propertyId: string;
  title: string;
  totalViews: number;
  periodViews: number;
  periodUniqueViews: number;
}

export interface MyPropertiesStatsResponse {
  period: Period;
  totalProperties: number;
  totalViews: number;
  uniqueViews: number;
  propertiesStats: PropertyStats[];
}

export interface ComparisonStats {
  thisWeek: {
    views: number;
    change: number;
  };
  lastWeek: {
    views: number;
  };
  thisMonth: {
    views: number;
    change: number;
  };
  lastMonth: {
    views: number;
  };
}

// Session ID management for anonymous tracking
const SESSION_KEY = 'balkan_estate_session_id';

function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export class ViewStatsApiClient {
  /**
   * Track a page view
   */
  async trackView(
    entityType: EntityType,
    entityId: string,
    referrer?: string
  ): Promise<TrackViewResponse> {
    const sessionId = getOrCreateSessionId();

    return await httpClient.post<TrackViewResponse>(
      '/view-stats/track',
      {
        entityType,
        entityId,
        sessionId,
        referrer: referrer || document.referrer || '',
      },
      false // Don't require auth, but will use token if available
    );
  }

  /**
   * Update view duration (call when user leaves page)
   */
  async updateViewDuration(viewId: string, duration: number): Promise<void> {
    await httpClient.patch(`/view-stats/${viewId}/duration`, { duration });
  }

  /**
   * Get view statistics for a specific entity
   */
  async getEntityStats(
    entityType: EntityType,
    entityId: string,
    period: Period = '30d'
  ): Promise<EntityStatsResponse> {
    return await httpClient.get<EntityStatsResponse>(
      `/view-stats/${entityType}/${entityId}?period=${period}`,
      true
    );
  }

  /**
   * Get view statistics for all user's properties
   */
  async getMyPropertiesStats(period: Period = '30d'): Promise<MyPropertiesStatsResponse> {
    return await httpClient.get<MyPropertiesStatsResponse>(
      `/view-stats/my-properties?period=${period}`,
      true
    );
  }

  /**
   * Get view statistics for agent's profile
   */
  async getMyAgentStats(period: Period = '30d'): Promise<EntityStatsResponse> {
    return await httpClient.get<EntityStatsResponse>(
      `/view-stats/my-agent-profile?period=${period}`,
      true
    );
  }

  /**
   * Get view statistics for user's agency
   */
  async getMyAgencyStats(period: Period = '30d'): Promise<EntityStatsResponse> {
    return await httpClient.get<EntityStatsResponse>(
      `/view-stats/my-agency?period=${period}`,
      true
    );
  }

  /**
   * Get comparison statistics (week over week, month over month)
   */
  async getComparisonStats(): Promise<ComparisonStats> {
    return await httpClient.get<ComparisonStats>('/view-stats/comparison', true);
  }
}

// Export singleton instance
export const viewStatsApiClient = new ViewStatsApiClient();
