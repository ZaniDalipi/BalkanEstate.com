import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  UsersIcon,
  HomeIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  TicketIcon,
  ShieldCheckIcon,
  TrashIcon,
  PencilIcon,
  PlusIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  MagnifyingGlassIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
} from '@/constants';
import { apiRequest } from '@/src/shared/api';

interface ActivityItem {
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

interface DashboardStats {
  subscriptionClicks: { value: number; change: string };
  subscriptionCompletions: { value: number; change: string };
  conversionRate: { value: string; change: string };
  pageViews: { value: number; change: string };
  newUsers: { value: number; change: string };
  newProperties: number;
  newInquiries: number;
}

interface HeatmapData {
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

interface SubscriptionEvent {
  _id: string;
  eventType: string;
  userId?: { name: string; email: string };
  productId?: string;
  amount?: number;
  currency?: string;
  eventDate: string;
}

const ActivityLog: React.FC = () => {
  const { t } = useTranslation(['admin']);
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
      setActivities(data.activities || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
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
      setDashboardStats(data.summary || null);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
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
      setHeatmapData(data || null);
    } catch (err) {
      console.error('Failed to fetch heatmap data:', err);
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
      setRecentSubscriptions(data.events || []);
    } catch (err) {
      console.error('Failed to fetch recent subscriptions:', err);
      setRecentSubscriptions([]);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'user': return <UsersIcon className="w-4 h-4" />;
      case 'property': return <HomeIcon className="w-4 h-4" />;
      case 'inquiry': return <EnvelopeIcon className="w-4 h-4" />;
      case 'subscription': return <CreditCardIcon className="w-4 h-4" />;
      case 'search': return <MagnifyingGlassIcon className="w-4 h-4" />;
      case 'navigation': return <CursorArrowRaysIcon className="w-4 h-4" />;
      case 'agent': return <ShieldCheckIcon className="w-4 h-4" />;
      case 'admin': return <ShieldCheckIcon className="w-4 h-4" />;
      case 'system': return <ClockIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'user': return 'bg-blue-100 text-blue-600';
      case 'property': return 'bg-green-100 text-green-600';
      case 'inquiry': return 'bg-purple-100 text-purple-600';
      case 'subscription': return 'bg-emerald-100 text-emerald-600';
      case 'search': return 'bg-amber-100 text-amber-600';
      case 'navigation': return 'bg-sky-100 text-sky-600';
      case 'agent': return 'bg-indigo-100 text-indigo-600';
      case 'admin': return 'bg-red-100 text-red-600';
      case 'system': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
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

  const filterOptions = [
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

  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  const StatCard = ({
    title,
    value,
    change,
    icon,
    color = 'blue'
  }: {
    title: string;
    value: string | number;
    change?: string;
    icon: React.ReactNode;
    color?: string;
  }) => {
    const isPositive = change && parseFloat(change) >= 0;
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      amber: 'bg-amber-50 text-amber-600',
      emerald: 'bg-emerald-50 text-emerald-600',
    };

    return (
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            {icon}
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
              {Math.abs(parseFloat(change))}%
            </div>
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500 mt-1">{title}</div>
      </div>
    );
  };

  const renderAnalyticsDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Subscribe Clicks"
          value={dashboardStats?.subscriptionClicks.value || 0}
          change={dashboardStats?.subscriptionClicks.change}
          icon={<CursorArrowRaysIcon className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="New Subscriptions"
          value={dashboardStats?.subscriptionCompletions.value || 0}
          change={dashboardStats?.subscriptionCompletions.change}
          icon={<CreditCardIcon className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Conversion Rate"
          value={`${dashboardStats?.conversionRate.value || 0}%`}
          change={dashboardStats?.conversionRate.change}
          icon={<ChartBarIcon className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Page Views"
          value={dashboardStats?.pageViews.value || 0}
          change={dashboardStats?.pageViews.change}
          icon={<GlobeAltIcon className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
          <div className="text-3xl font-bold text-blue-600">{dashboardStats?.newUsers.value || 0}</div>
          <div className="text-sm text-gray-500">New Users</div>
          {dashboardStats?.newUsers.change && (
            <div className={`text-xs mt-1 ${parseFloat(dashboardStats.newUsers.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(dashboardStats.newUsers.change) >= 0 ? '+' : ''}{dashboardStats.newUsers.change}% vs prev
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
          <div className="text-3xl font-bold text-green-600">{dashboardStats?.newProperties || 0}</div>
          <div className="text-sm text-gray-500">New Listings</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
          <div className="text-3xl font-bold text-purple-600">{dashboardStats?.newInquiries || 0}</div>
          <div className="text-sm text-gray-500">New Inquiries</div>
        </div>
      </div>

      {/* Recent Subscriptions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CreditCardIcon className="w-5 h-5 text-emerald-600" />
          Recent Subscription Events
        </h3>
        {recentSubscriptions.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No subscription events yet</p>
        ) : (
          <div className="space-y-3">
            {recentSubscriptions.map((event) => (
              <div key={event._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    event.eventType.includes('purchased') ? 'bg-green-100 text-green-600' :
                    event.eventType.includes('canceled') ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <CreditCardIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {event.eventType.replace(/_/g, ' ').replace(/subscription /i, '')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {event.userId?.email || 'Unknown user'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {event.amount && (
                    <p className="font-semibold text-gray-900">
                      {event.currency || 'EUR'} {event.amount}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">{formatTimestamp(event.eventDate)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderHeatmap = () => (
    <div className="space-y-6">
      {/* Subscription Funnel */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-purple-600" />
          Subscription Funnel
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Pricing Page Views', value: heatmapData?.subscriptionFunnel?.pricingPageViews || 0, color: 'bg-blue-500' },
            { label: 'Subscribe Button Clicks', value: heatmapData?.subscriptionFunnel?.subscribeButtonClicks || 0, color: 'bg-indigo-500' },
            { label: 'Modal Opened', value: heatmapData?.subscriptionFunnel?.modalOpened || 0, color: 'bg-purple-500' },
            { label: 'Checkout Started', value: heatmapData?.subscriptionFunnel?.checkoutStarted || 0, color: 'bg-violet-500' },
            { label: 'Completed', value: heatmapData?.subscriptionFunnel?.completed || 0, color: 'bg-emerald-500' },
          ].map((step, index) => {
            const maxValue = heatmapData?.subscriptionFunnel?.pricingPageViews || 1;
            const percentage = Math.round((step.value / maxValue) * 100);
            return (
              <div key={step.label} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{step.label}</span>
                    <span className="text-sm font-bold text-gray-900">{step.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${step.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500 w-12 text-right">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Pages */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5 text-blue-600" />
            Top Pages
          </h3>
          {!heatmapData?.pageViews?.length ? (
            <p className="text-gray-500 text-center py-4">No page view data yet</p>
          ) : (
            <div className="space-y-2">
              {heatmapData.pageViews.slice(0, 8).map((page, index) => (
                <div key={page.path} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-6">{index + 1}.</span>
                    <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">
                      {page.path || '/'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{page.uniqueVisitors} users</span>
                    <span className="text-sm font-bold text-gray-900">{page.views} views</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CursorArrowRaysIcon className="w-5 h-5 text-amber-600" />
            Top Button Clicks
          </h3>
          {!heatmapData?.buttonClicks?.length ? (
            <p className="text-gray-500 text-center py-4">No button click data yet</p>
          ) : (
            <div className="space-y-2">
              {heatmapData.buttonClicks.slice(0, 8).map((click, index) => (
                <div key={`${click.button}-${click.page}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-400 w-6">{index + 1}.</span>
                    <div>
                      <span className="text-sm font-medium text-gray-700">{click.button}</span>
                      <span className="text-xs text-gray-400 block">{click.page}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{click.clicks}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Device Breakdown & User Flows */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DevicePhoneMobileIcon className="w-5 h-5 text-indigo-600" />
            Device Breakdown
          </h3>
          {!heatmapData?.deviceBreakdown || Object.keys(heatmapData.deviceBreakdown).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No device data yet</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(heatmapData.deviceBreakdown).map(([device, count]) => {
                const total = Object.values(heatmapData.deviceBreakdown).reduce((a, b) => a + b, 0);
                const percentage = Math.round((count / total) * 100);
                return (
                  <div key={device} className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      device === 'mobile' ? 'bg-blue-100 text-blue-600' :
                      device === 'tablet' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {device === 'mobile' ? <DevicePhoneMobileIcon className="w-5 h-5" /> :
                       device === 'tablet' ? <DevicePhoneMobileIcon className="w-5 h-5" /> :
                       <ComputerDesktopIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 capitalize">{device}</span>
                        <span className="text-sm font-bold text-gray-900">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
            Common User Flows
          </h3>
          {!heatmapData?.userFlows?.length ? (
            <p className="text-gray-500 text-center py-4">No user flow data yet</p>
          ) : (
            <div className="space-y-2">
              {heatmapData.userFlows.slice(0, 5).map((flow, index) => (
                <div key={flow.flow} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-medium text-gray-500">Flow #{index + 1}</span>
                    <span className="text-sm font-bold text-gray-900">{flow.count} sessions</span>
                  </div>
                  <p className="text-xs text-gray-600 font-mono">{flow.flow}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Improvement Suggestions */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm p-6 border border-indigo-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">💡</span>
          Suggestions for Improvement
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {heatmapData?.subscriptionFunnel && (
            <>
              {heatmapData.subscriptionFunnel.pricingPageViews > 0 &&
               heatmapData.subscriptionFunnel.subscribeButtonClicks < heatmapData.subscriptionFunnel.pricingPageViews * 0.1 && (
                <div className="bg-white/80 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-1">Low Button Click Rate</h4>
                  <p className="text-sm text-gray-600">
                    Only {Math.round((heatmapData.subscriptionFunnel.subscribeButtonClicks / heatmapData.subscriptionFunnel.pricingPageViews) * 100)}%
                    of pricing page visitors click subscribe. Consider making CTAs more prominent.
                  </p>
                </div>
              )}
              {heatmapData.subscriptionFunnel.modalOpened > 0 &&
               heatmapData.subscriptionFunnel.completed < heatmapData.subscriptionFunnel.modalOpened * 0.2 && (
                <div className="bg-white/80 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-1">Checkout Drop-off</h4>
                  <p className="text-sm text-gray-600">
                    Users are dropping off during checkout. Consider simplifying the payment flow or adding trust signals.
                  </p>
                </div>
              )}
            </>
          )}
          {heatmapData?.deviceBreakdown?.mobile && heatmapData.deviceBreakdown.mobile > (heatmapData.deviceBreakdown.desktop || 0) && (
            <div className="bg-white/80 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-1">Mobile-First Users</h4>
              <p className="text-sm text-gray-600">
                Most users are on mobile. Ensure mobile experience is optimized for conversions.
              </p>
            </div>
          )}
          <div className="bg-white/80 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-1">A/B Testing</h4>
            <p className="text-sm text-gray-600">
              Consider A/B testing pricing page layouts, CTA copy, and subscription modal designs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderActivityList = () => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading activity log...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="p-8 text-center">
          <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No activities found</p>
          <p className="text-sm text-gray-400 mt-2">Activities will appear here as users interact with the platform</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {activities.map((activity) => (
            <div
              key={activity._id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${getCategoryColor(activity.category)}`}>
                  {getCategoryIcon(activity.category)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{activity.action}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(activity.category)}`}>
                      {activity.category}
                    </span>
                  </div>
                  {activity.label && (
                    <p className="text-sm text-gray-500 mb-2">{activity.label}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                    {activity.userId && (
                      <span className="flex items-center gap-1">
                        <UsersIcon className="w-3 h-3" />
                        {activity.userId.email}
                      </span>
                    )}
                    {activity.pagePath && (
                      <span className="flex items-center gap-1">
                        <GlobeAltIcon className="w-3 h-3" />
                        {activity.pagePath}
                      </span>
                    )}
                    {activity.deviceType && (
                      <span className="flex items-center gap-1">
                        {activity.deviceType === 'mobile' ?
                          <DevicePhoneMobileIcon className="w-3 h-3" /> :
                          <ComputerDesktopIcon className="w-3 h-3" />}
                        {activity.deviceType}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="hidden lg:block text-right">
                  <div className="text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics & Activity</h2>
            <p className="text-gray-500">Track subscriptions, user behavior, and platform activity</p>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {dateRangeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChartBarIcon className="w-4 h-4 inline-block mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'heatmap'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CursorArrowRaysIcon className="w-4 h-4 inline-block mr-2" />
            User Behavior
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClockIcon className="w-4 h-4 inline-block mr-2" />
            Activity Log
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'analytics' && renderAnalyticsDashboard()}
      {activeTab === 'heatmap' && renderHeatmap()}
      {activeTab === 'activity' && (
        <>
          {/* Filters for Activity Tab */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {filterOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          {renderActivityList()}
        </>
      )}
    </div>
  );
};

export default ActivityLog;
