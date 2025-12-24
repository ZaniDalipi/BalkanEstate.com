import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import {
  useDashboardOverview,
  useMyPropertiesViewStats,
  useDownloadReport,
} from '../src/features/view-stats/hooks';
import { Period, Insight } from '../src/data/api/ViewStatsApiClient';
import { formatPrice } from '../utils/currency';
import {
  ChartBarIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  SparklesIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  HomeIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  ArrowLeftIcon,
  LockClosedIcon,
  StarIcon,
  ClockIcon,
  UserGroupIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  CurrencyEuroIcon,
  FireIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  loading,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        {change !== undefined && (
          <span
            className={`flex items-center text-sm font-semibold ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? (
              <ArrowTrendingUpIcon className="h-4 w-4 mr-0.5" />
            ) : (
              <ArrowTrendingDownIcon className="h-4 w-4 mr-0.5" />
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
};

// Insight Card Component
interface InsightCardProps {
  insight: Insight;
  onAction?: (propertyId: string) => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, onAction }) => {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    sparkles: SparklesIcon,
    trophy: TrophyIcon,
    'trending-up': ArrowTrendingUpIcon,
    exclamation: ExclamationTriangleIcon,
    clock: ClockIcon,
    currency: CurrencyEuroIcon,
  };

  const priorityStyles = {
    success: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20',
    warning: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
    error: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
    info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
  };

  const iconStyles = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  const Icon = iconMap[insight.icon] || LightBulbIcon;

  return (
    <div className={`rounded-xl border-2 p-4 ${priorityStyles[insight.priority]}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${iconStyles[insight.priority]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white">{insight.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{insight.message}</p>
          {insight.properties && insight.properties.length > 0 && (
            <div className="mt-3 space-y-2">
              {insight.properties.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => onAction?.(prop.id)}
                  className="flex items-center justify-between w-full px-3 py-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                    {prop.title}
                  </span>
                  {prop.views !== undefined && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {prop.views} views
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Property Row Component
interface PropertyRowProps {
  property: {
    propertyId: string;
    title: string;
    status?: string;
    isPromoted?: boolean;
    promotionTier?: string;
    price?: number;
    periodViews: number;
    periodUniqueViews?: number;
    totalViews: number;
  };
  rank: number;
  onClick?: () => void;
}

const PropertyRow: React.FC<PropertyRowProps> = ({ property, rank, onClick }) => {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</span>;
      case 'sold':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Sold</span>;
      case 'pending':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md cursor-pointer transition-all"
    >
      {/* Rank */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
        rank <= 3
          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
      }`}>
        {rank}
      </div>

      {/* Property Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 dark:text-white truncate">{property.title}</h4>
          {property.isPromoted && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1">
              <SparklesIcon className="h-3 w-3" />
              Promoted
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {getStatusBadge(property.status)}
          {property.price && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatPrice(property.price)}
            </span>
          )}
        </div>
      </div>

      {/* Views Stats */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{property.periodViews}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {property.periodUniqueViews !== undefined && `${property.periodUniqueViews} unique · `}
          {property.totalViews} total
        </p>
      </div>
    </div>
  );
};

// Premium Upgrade Banner
const PremiumUpgradeBanner: React.FC<{ message?: string; onUpgradeClick: () => void }> = ({ message, onUpgradeClick }) => {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-white/20 rounded-lg">
          <LockClosedIcon className="h-8 w-8" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold">Unlock Premium Analytics</h3>
          <p className="text-white/80 text-sm mt-1">
            {message || 'Upgrade to Pro to access detailed analytics, smart insights, traffic sources, device breakdown, and downloadable reports.'}
          </p>
        </div>
        <button
          onClick={onUpgradeClick}
          className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
        >
          Upgrade Now
        </button>
      </div>
    </div>
  );
};

// Main Analytics Page Component
const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const { state, dispatch } = useAppContext();
  const { currentUser } = state;

  const [period, setPeriod] = useState<Period>('30d');

  // Navigation helpers
  const navigateToProperty = (propertyId: string) => {
    window.history.pushState({}, '', `/property/${propertyId}`);
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
  };

  const navigateToView = (view: string) => {
    window.history.pushState({}, '', `/${view}`);
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
  };

  const navigateBack = () => {
    window.history.back();
  };

  const openPricingModal = () => {
    dispatch({ type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: true } });
  };

  const openAuthModal = () => {
    dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });
  };

  // Fetch dashboard data
  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } = useDashboardOverview();
  const { data: propertiesStats, isLoading: propertiesLoading } = useMyPropertiesViewStats(period);
  const downloadReport = useDownloadReport();

  const isLoading = dashboardLoading || propertiesLoading;
  const isPremium = dashboard?.subscriptionInfo?.isPremium ?? false;

  const handlePropertyClick = (propertyId: string) => {
    navigateToProperty(propertyId);
  };

  const handleDownloadReport = async () => {
    try {
      await downloadReport.mutateAsync(period);
    } catch {
      // Error handling is done by the mutation
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LockClosedIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Sign in Required</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Please sign in to view your analytics.
          </p>
          <button
            onClick={openAuthModal}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={navigateBack}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ChartBarIcon className="h-7 w-7 text-blue-600" />
                Analytics Dashboard
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Track your listings performance and get insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <CalendarIcon className="h-5 w-5 text-gray-400 ml-2" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer pr-8"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Download Report Button */}
            {isPremium && (
              <button
                onClick={handleDownloadReport}
                disabled={downloadReport.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                {downloadReport.isPending ? 'Downloading...' : 'Export CSV'}
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {dashboardError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-8">
            <p className="text-red-600 dark:text-red-400">
              Failed to load analytics. Please try again later.
            </p>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Properties"
            value={dashboard?.overview?.totalProperties || 0}
            subtitle={`${dashboard?.overview?.activeProperties || 0} active`}
            icon={HomeIcon}
            loading={isLoading}
            color="blue"
          />
          <StatCard
            title="Monthly Views"
            value={dashboard?.overview?.monthlyViews || 0}
            subtitle={`${dashboard?.overview?.monthlyUniqueViews || 0} unique visitors`}
            icon={EyeIcon}
            loading={isLoading}
            color="green"
          />
          <StatCard
            title="Weekly Views"
            value={dashboard?.overview?.weeklyViews || 0}
            subtitle="Last 7 days"
            icon={ChartBarIcon}
            loading={isLoading}
            color="purple"
          />
          <StatCard
            title="Avg. Views/Property"
            value={dashboard?.overview?.avgViewsPerProperty || 0}
            subtitle={`${dashboard?.overview?.promotedProperties || 0} promoted`}
            icon={StarIcon}
            loading={isLoading}
            color="orange"
          />
        </div>

        {/* Premium Upgrade Banner (for free users) */}
        {!isPremium && !isLoading && (
          <div className="mb-8">
            <PremiumUpgradeBanner message={propertiesStats?.upgradeMessage} onUpgradeClick={openPricingModal} />
          </div>
        )}

        {/* Smart Insights (Premium Only) */}
        {isPremium && dashboard?.insights && dashboard.insights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-yellow-500" />
              Smart Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard.insights.map((insight, index) => (
                <InsightCard
                  key={index}
                  insight={insight}
                  onAction={handlePropertyClick}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Properties List */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 dark:text-white">Property Performance</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Sorted by views ({period})
                </span>
              </div>

              <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                  ))
                ) : propertiesStats?.propertiesStats && propertiesStats.propertiesStats.length > 0 ? (
                  propertiesStats.propertiesStats.map((property, index) => (
                    <PropertyRow
                      key={property.propertyId}
                      property={property}
                      rank={index + 1}
                      onClick={() => handlePropertyClick(property.propertyId)}
                    />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <HomeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No properties yet</p>
                    <button
                      onClick={() => navigateToView('create-listing')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      List Your First Property
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top Performers */}
            {dashboard?.topPerformers && dashboard.topPerformers.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrophyIcon className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </h3>
                <div className="space-y-3">
                  {dashboard.topPerformers.slice(0, 3).map((property, index) => (
                    <div
                      key={property.id}
                      onClick={() => handlePropertyClick(property.id)}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <span className="text-lg font-bold text-yellow-600">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                          {property.title}
                        </p>
                      </div>
                      <span className="font-bold text-blue-600">{property.monthlyViews}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Needs Attention */}
            {dashboard?.needsAttention && dashboard.needsAttention.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                  Needs Attention
                </h3>
                <div className="space-y-3">
                  {dashboard.needsAttention.slice(0, 3).map((property) => (
                    <div
                      key={property.id}
                      onClick={() => handlePropertyClick(property.id)}
                      className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                          {property.title}
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          Only {property.monthlyViews} views this month
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to property and open promotion options
                          navigateToProperty(property.id);
                        }}
                        className="px-3 py-1 bg-orange-600 text-white text-xs font-medium rounded-full hover:bg-orange-700 transition-colors"
                      >
                        Promote
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity (Premium Only) */}
            {isPremium && dashboard?.recentActivity && dashboard.recentActivity.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-blue-500" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {dashboard.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded">
                        {activity.deviceType === 'mobile' ? (
                          <DevicePhoneMobileIcon className="h-4 w-4 text-gray-500" />
                        ) : activity.deviceType === 'tablet' ? (
                          <GlobeAltIcon className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ComputerDesktopIcon className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 dark:text-white truncate">
                          {activity.propertyTitle}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          {activity.referrerType === 'search' ? (
                            <><MagnifyingGlassIcon className="h-3 w-3" /> Search</>
                          ) : activity.referrerType === 'social' ? (
                            <><UserGroupIcon className="h-3 w-3" /> Social</>
                          ) : activity.referrerType === 'email' ? (
                            <><EnvelopeIcon className="h-3 w-3" /> Email</>
                          ) : (
                            <><GlobeAltIcon className="h-3 w-3" /> Direct</>
                          )}
                          {' · '}
                          {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subscription Status */}
            <div className={`rounded-xl p-6 ${
              isPremium
                ? 'bg-gradient-to-br from-purple-500 to-blue-600'
                : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {isPremium ? (
                  <StarIcon className="h-6 w-6 text-yellow-300" />
                ) : (
                  <LockClosedIcon className="h-6 w-6 text-gray-400" />
                )}
                <h3 className={`font-bold ${isPremium ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {isPremium ? 'Pro Analytics Active' : 'Free Plan'}
                </h3>
              </div>
              <p className={`text-sm ${isPremium ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                {isPremium
                  ? 'You have access to all premium analytics features, insights, and reports.'
                  : 'Upgrade to unlock detailed analytics, smart insights, and downloadable reports.'}
              </p>
              {!isPremium && (
                <button
                  onClick={openPricingModal}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upgrade to Pro
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
