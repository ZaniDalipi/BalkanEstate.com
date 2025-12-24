// View Statistics API Client
// Handles all view tracking and statistics-related API calls

import { httpClient } from './httpClient';

export type EntityType = 'property' | 'agent' | 'agency';
export type Period = '7d' | '30d' | '90d' | 'all';

export interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'agency_owner' | 'agency_agent' | 'buyer';
  isPremium: boolean;
  canAccessDetailedStats: boolean;
  canAccessReports: boolean;
  canAccessInsights: boolean;
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
  avgDuration?: number;
  deviceBreakdown?: DeviceBreakdown;
  trafficSources?: TrafficSources;
}

export interface DailyView {
  _id: string;
  views: number;
  uniqueViews: number;
}

export interface HourlyView {
  _id: number;
  views: number;
}

export interface TopReferrer {
  _id: string;
  count: number;
}

export interface Insight {
  type: string;
  icon: string;
  title: string;
  message: string;
  priority: 'success' | 'warning' | 'error' | 'info';
  propertyId?: string;
  properties?: Array<{
    id: string;
    title: string;
    views?: number;
  }>;
}

export interface EntityStatsResponse {
  entityType: EntityType;
  entityId: string;
  period: Period;
  subscriptionInfo: SubscriptionInfo;
  stats: ViewStats;
  dailyViews?: DailyView[];
  hourlyDistribution?: HourlyView[];
  topReferrers?: TopReferrer[];
  entityViewStats: {
    totalViews: number;
    uniqueViews: number;
  };
  isLimited: boolean;
  upgradeMessage?: string;
}

export interface PropertyStats {
  propertyId: string;
  title: string;
  status?: string;
  isPromoted?: boolean;
  promotionTier?: string;
  price?: number;
  createdAt?: string;
  totalViews: number;
  periodViews: number;
  periodUniqueViews?: number;
  avgDuration?: number;
}

export interface MyPropertiesStatsResponse {
  period: Period;
  totalProperties: number;
  totalViews: number;
  uniqueViews: number;
  avgViewsPerProperty?: number;
  propertiesStats: PropertyStats[];
  insights?: Insight[];
  topPerformers?: PropertyStats[];
  underperformers?: PropertyStats[];
  subscriptionInfo: SubscriptionInfo;
  isLimited: boolean;
  upgradeMessage?: string;
}

export interface ComparisonStats {
  thisWeek: {
    views: number;
    uniqueViews?: number;
    change: number;
  };
  lastWeek: {
    views: number;
  };
  thisMonth: {
    views: number;
    uniqueViews?: number;
    change: number;
  };
  lastMonth: {
    views: number;
  };
  subscriptionInfo: SubscriptionInfo;
  isLimited: boolean;
}

export interface DashboardProperty {
  id: string;
  title: string;
  status: string;
  isPromoted: boolean;
  promotionTier?: string;
  price: number;
  monthlyViews: number;
  monthlyUniqueViews: number;
  totalViews: number;
}

export interface RecentActivity {
  propertyTitle: string;
  deviceType: string;
  referrerType: string;
  createdAt: string;
}

export interface DashboardOverview {
  totalProperties: number;
  activeProperties: number;
  promotedProperties: number;
  totalAllTimeViews: number;
  monthlyViews: number;
  monthlyUniqueViews: number;
  weeklyViews: number;
  avgViewsPerProperty: number;
}

export interface DashboardResponse {
  overview: DashboardOverview;
  properties: DashboardProperty[];
  topPerformers: DashboardProperty[];
  needsAttention: DashboardProperty[];
  insights: Insight[];
  recentActivity: RecentActivity[];
  subscriptionInfo: SubscriptionInfo;
  isLimited: boolean;
}

export interface ReportProperty {
  id: string;
  title: string;
  address: string;
  city: string;
  price: number;
  status: string;
  isPromoted: boolean;
  promotionTier?: string;
  totalViews: number;
  uniqueViews: number;
  avgDuration: number;
  deviceBreakdown: DeviceBreakdown;
  trafficSources: {
    direct: number;
    search: number;
    social: number;
  };
}

export interface ReportSummary {
  period: string;
  generatedAt: string;
  totalProperties: number;
  activeProperties: number;
  promotedProperties: number;
  totalViews: number;
  totalUniqueViews: number;
  avgViewsPerProperty: number;
}

export interface ReportResponse {
  report: {
    summary: ReportSummary;
    properties: ReportProperty[];
    dailyBreakdown: DailyView[];
  };
  subscriptionInfo: SubscriptionInfo;
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
      false
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

  /**
   * Get dashboard overview with all stats
   */
  async getDashboardOverview(): Promise<DashboardResponse> {
    return await httpClient.get<DashboardResponse>('/view-stats/dashboard', true);
  }

  /**
   * Generate analytics report (Premium only)
   */
  async generateReport(period: Period = '30d', format: 'json' | 'csv' = 'json'): Promise<ReportResponse | Blob> {
    if (format === 'csv') {
      // For CSV, we need to handle the blob response
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/view-stats/report?period=${period}&format=csv`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('balkan_estate_token')}`,
          },
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate report');
      }
      return await response.blob();
    }

    return await httpClient.get<ReportResponse>(
      `/view-stats/report?period=${period}&format=${format}`,
      true
    );
  }

  /**
   * Download report as CSV file
   */
  async downloadReportCSV(period: Period = '30d'): Promise<void> {
    const blob = await this.generateReport(period, 'csv') as Blob;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${period}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Export singleton instance
export const viewStatsApiClient = new ViewStatsApiClient();
