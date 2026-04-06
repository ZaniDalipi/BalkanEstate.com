import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  UsersIcon,
  HomeIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
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
import type {
  ActivityItem,
  DashboardStats,
  HeatmapData,
  SubscriptionEvent,
} from './useActivityLog';

// ============================================================================
// StatCard Component
// ============================================================================

const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color?: string;
}> = ({ title, value, change, icon, color = 'blue' }) => {
  const isPositive = change && parseFloat(change) >= 0;
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>
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

// ============================================================================
// Analytics Dashboard
// ============================================================================

interface AnalyticsDashboardProps {
  dashboardStats: DashboardStats | null;
  recentSubscriptions: SubscriptionEvent[];
  formatTimestamp: (timestamp: string) => string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  dashboardStats,
  recentSubscriptions,
  formatTimestamp,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  return (
  <div className="space-y-6">
    {/* Stats Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title={t('admin:activityLog.subscribeClicks')}
        value={dashboardStats?.subscriptionClicks.value || 0}
        change={dashboardStats?.subscriptionClicks.change}
        icon={<CursorArrowRaysIcon className="w-5 h-5" />}
        color="blue"
      />
      <StatCard
        title={t('admin:activityLog.newSubscriptions')}
        value={dashboardStats?.subscriptionCompletions.value || 0}
        change={dashboardStats?.subscriptionCompletions.change}
        icon={<CreditCardIcon className="w-5 h-5" />}
        color="emerald"
      />
      <StatCard
        title={t('admin:activityLog.conversionRate')}
        value={`${dashboardStats?.conversionRate.value || 0}%`}
        change={dashboardStats?.conversionRate.change}
        icon={<ChartBarIcon className="w-5 h-5" />}
        color="purple"
      />
      <StatCard
        title={t('admin:activityLog.pageViews')}
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
        <div className="text-sm text-gray-500">{t('admin:activityLog.newUsers')}</div>
        {dashboardStats?.newUsers.change && (
          <div className={`text-xs mt-1 ${parseFloat(dashboardStats.newUsers.change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {parseFloat(dashboardStats.newUsers.change) >= 0 ? '+' : ''}{dashboardStats.newUsers.change}% {t('admin:activityLog.vsPrev')}
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
        <div className="text-3xl font-bold text-green-600">{dashboardStats?.newProperties || 0}</div>
        <div className="text-sm text-gray-500">{t('admin:activityLog.newListings')}</div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
        <div className="text-3xl font-bold text-purple-600">{dashboardStats?.newInquiries || 0}</div>
        <div className="text-sm text-gray-500">{t('admin:activityLog.newInquiries')}</div>
      </div>
    </div>

    {/* Recent Subscriptions */}
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <CreditCardIcon className="w-5 h-5 text-emerald-600" />
        {t('admin:activityLog.recentSubscriptionEvents')}
      </h3>
      {recentSubscriptions.length === 0 ? (
        <p className="text-gray-500 text-center py-4">{t('admin:activityLog.noSubscriptionEvents')}</p>
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
                    {event.userId?.email || t('admin:activityLog.unknownUser')}
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
};

// ============================================================================
// Heatmap Panel
// ============================================================================

interface HeatmapPanelProps {
  heatmapData: HeatmapData | null;
}

export const HeatmapPanel: React.FC<HeatmapPanelProps> = ({ heatmapData }) => {
  const { t } = useTranslation(['admin', 'common']);
  return (
  <div className="space-y-6">
    {/* Subscription Funnel */}
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ChartBarIcon className="w-5 h-5 text-purple-600" />
        {t('admin:activityLog.subscriptionFunnel')}
      </h3>
      <div className="space-y-3">
        {[
          { label: t('admin:activityLog.pricingPageViews'), value: heatmapData?.subscriptionFunnel?.pricingPageViews || 0, color: 'bg-blue-500' },
          { label: t('admin:activityLog.subscribeButtonClicks'), value: heatmapData?.subscriptionFunnel?.subscribeButtonClicks || 0, color: 'bg-indigo-500' },
          { label: t('admin:activityLog.modalOpened'), value: heatmapData?.subscriptionFunnel?.modalOpened || 0, color: 'bg-purple-500' },
          { label: t('admin:activityLog.checkoutStarted'), value: heatmapData?.subscriptionFunnel?.checkoutStarted || 0, color: 'bg-violet-500' },
          { label: t('admin:activityLog.completed'), value: heatmapData?.subscriptionFunnel?.completed || 0, color: 'bg-emerald-500' },
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
          {t('admin:activityLog.topPages')}
        </h3>
        {!heatmapData?.pageViews?.length ? (
          <p className="text-gray-500 text-center py-4">{t('admin:activityLog.noPageViewData')}</p>
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
                  <span className="text-sm text-gray-500">{page.uniqueVisitors} {t('admin:activityLog.users')}</span>
                  <span className="text-sm font-bold text-gray-900">{page.views} {t('admin:activityLog.views')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CursorArrowRaysIcon className="w-5 h-5 text-amber-600" />
          {t('admin:activityLog.topButtonClicks')}
        </h3>
        {!heatmapData?.buttonClicks?.length ? (
          <p className="text-gray-500 text-center py-4">{t('admin:activityLog.noButtonClickData')}</p>
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
          {t('admin:activityLog.deviceBreakdown')}
        </h3>
        {!heatmapData?.deviceBreakdown || Object.keys(heatmapData.deviceBreakdown).length === 0 ? (
          <p className="text-gray-500 text-center py-4">{t('admin:activityLog.noDeviceData')}</p>
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
          {t('admin:activityLog.commonUserFlows')}
        </h3>
        {!heatmapData?.userFlows?.length ? (
          <p className="text-gray-500 text-center py-4">{t('admin:activityLog.noUserFlowData')}</p>
        ) : (
          <div className="space-y-2">
            {heatmapData.userFlows.slice(0, 5).map((flow, index) => (
              <div key={flow.flow} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium text-gray-500">Flow #{index + 1}</span>
                  <span className="text-sm font-bold text-gray-900">{flow.count} {t('admin:activityLog.sessions')}</span>
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
        {t('admin:activityLog.suggestionsForImprovement')}
      </h3>
      <div className="grid md:grid-cols-2 gap-4">
        {heatmapData?.subscriptionFunnel && (
          <>
            {heatmapData.subscriptionFunnel.pricingPageViews > 0 &&
             heatmapData.subscriptionFunnel.subscribeButtonClicks < heatmapData.subscriptionFunnel.pricingPageViews * 0.1 && (
              <div className="bg-white/80 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-1">{t('admin:activityLog.lowButtonClickRate')}</h4>
                <p className="text-sm text-gray-600">
                  {t('admin:activityLog.lowButtonClickRateDesc', { percentage: Math.round((heatmapData.subscriptionFunnel.subscribeButtonClicks / heatmapData.subscriptionFunnel.pricingPageViews) * 100) })}
                </p>
              </div>
            )}
            {heatmapData.subscriptionFunnel.modalOpened > 0 &&
             heatmapData.subscriptionFunnel.completed < heatmapData.subscriptionFunnel.modalOpened * 0.2 && (
              <div className="bg-white/80 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-1">{t('admin:activityLog.checkoutDropOff')}</h4>
                <p className="text-sm text-gray-600">
                  {t('admin:activityLog.checkoutDropOffDesc')}
                </p>
              </div>
            )}
          </>
        )}
        {heatmapData?.deviceBreakdown?.mobile && heatmapData.deviceBreakdown.mobile > (heatmapData.deviceBreakdown.desktop || 0) && (
          <div className="bg-white/80 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-1">{t('admin:activityLog.mobileFirstUsers')}</h4>
            <p className="text-sm text-gray-600">
              {t('admin:activityLog.mobileFirstUsersDesc')}
            </p>
          </div>
        )}
        <div className="bg-white/80 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-1">{t('admin:activityLog.abTesting')}</h4>
          <p className="text-sm text-gray-600">
            {t('admin:activityLog.abTestingDesc')}
          </p>
        </div>
      </div>
    </div>
  </div>
  );
};

// ============================================================================
// Activity List
// ============================================================================

interface ActivityListProps {
  activities: ActivityItem[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  formatTimestamp: (timestamp: string) => string;
}

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

export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  isLoading,
  currentPage,
  totalPages,
  setCurrentPage,
  formatTimestamp,
}) => {
  const { t } = useTranslation(['admin', 'common']);
  return (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
    {isLoading ? (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('admin:activityLog.loadingActivityLog')}</p>
      </div>
    ) : activities.length === 0 ? (
      <div className="p-8 text-center">
        <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">{t('admin:activityLog.noActivitiesFound')}</p>
        <p className="text-sm text-gray-400 mt-2">{t('admin:activityLog.activitiesWillAppear')}</p>
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
                  {new Date(activity.timestamp).toLocaleDateString('en-GB')}
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
          {t('admin:activityLog.pageOf', { current: currentPage, total: totalPages })}
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
};
