import { useState, useEffect } from 'react';
import { apiRequest } from '@/src/shared/api';

export interface ActivityItem {
  _id: string;
  eventType: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  pagePath?: string;
  pageTitle?: string;
  targetType?: string;
  targetId?: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  deviceType?: string;
  browser?: string;
  country?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface DashboardStats {
  subscriptionClicks: { value: number; change: string };
  subscriptionCompletions: { value: number; change: string };
  conversionRate: { value: string; change: string };
  pageViews: { value: number; change: string };
  newUsers: { value: number; change: string };
  newProperties: number;
  newInquiries: number;
}

export interface HeatmapData {
  pageViews: Array<{ path: string; views: number; uniqueVisitors: number }>;
  buttonClicks: Array<{ button: string; page: string; clicks: number }>;
  userFlows: Array<{ flow: string; count: number }>;
  deviceBreakdown: Record<string, number>;
  subscriptionFunnel: {
    pricingPageViews: number;
    subscribeButtonClicks: number;
    modalOpened: number;
    checkoutStarted: number;
    completed: number;
  };
}

export interface SubscriptionEvent {
  _id: string;
  eventType: string;
  userId?: { name: string; email: string };
  productId?: string;
  amount?: number;
  currency?: string;
  eventDate: string;
}

export const filterOptions = [
  { value: 'all', label: 'All Activities' },
  { value: 'user', label: 'User Actions' },
  { value: 'subscription', label: 'Subscriptions' },
  { value: 'property', label: 'Property Actions' },
  { value: 'inquiry', label: 'Inquiries' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'search', label: 'Searches' },
  { value: 'admin', label: 'Admin' },
  { value: 'system', label: 'System' },
];

export const dateRangeOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

export function useActivityLog() {
  const [activeTab, setActiveTab] = useState<'activity' | 'analytics' | 'heatmap'>('analytics');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [recentSubscriptions, setRecentSubscriptions] = useState<SubscriptionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('week');

  useEffect(() => {
    if (activeTab === 'activity') {
      fetchActivities();
    } else if (activeTab === 'analytics') {
      fetchDashboardStats();
      fetchRecentSubscriptions();
    } else if (activeTab === 'heatmap') {
      fetchHeatmapData();
    }
  }, [activeTab, currentPage, filter, dateRange]);

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest(
        `/analytics/activity-log?page=${currentPage}&category=${filter}&dateRange=${dateRange}`,
        { requiresAuth: true }
      );
      setActivities((data as any).activities || []);
      setTotalPages((data as any).pagination?.totalPages || 1);
    } catch (err) {
      setActivities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest(
        `/analytics/dashboard?dateRange=${dateRange}`,
        { requiresAuth: true }
      );
      setDashboardStats((data as any).summary || null);
    } catch (err) {
      setDashboardStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHeatmapData = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest(
        `/analytics/heatmap?dateRange=${dateRange}`,
        { requiresAuth: true }
      );
      setHeatmapData((data as any) || null);
    } catch (err) {
      setHeatmapData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentSubscriptions = async () => {
    try {
      const data = await apiRequest(
        `/analytics/subscriptions/recent?limit=5`,
        { requiresAuth: true }
      );
      setRecentSubscriptions((data as any).events || []);
    } catch (err) {
      setRecentSubscriptions([]);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return {
    activeTab,
    setActiveTab,
    activities,
    dashboardStats,
    heatmapData,
    recentSubscriptions,
    isLoading,
    currentPage,
    setCurrentPage,
    totalPages,
    filter,
    setFilter,
    dateRange,
    setDateRange,
    formatTimestamp,
  };
}
