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
import { AppView } from '../types';
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
} from '../constants';

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
  color?: 'blue' | 'green' | 'purple' | 'orange';
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
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5 animate-pulse">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 bg-neutral-200 rounded w-24" />
          <div className="h-10 w-10 bg-neutral-200 rounded-lg" />
        </div>
        <div className="h-8 bg-neutral-200 rounded w-20" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-neutral-600">{title}</p>
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        {change !== undefined && (
          <span className={`flex items-center text-sm font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? (
              <ArrowTrendingUpIcon className="h-4 w-4 mr-0.5" />
            ) : (
              <ArrowTrendingDownIcon className="h-4 w-4 mr-0.5" />
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>}
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
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    error: 'border-red-200 bg-red-50',
    info: 'border-blue-200 bg-blue-50',
  };

  const iconStyles = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600',
    info: 'text-blue-600',
  };

  const Icon = iconMap[insight.icon] || LightBulbIcon;

  return (
    <div className={`rounded-xl border-2 p-4 ${priorityStyles[insight.priority]}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white ${iconStyles[insight.priority]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-neutral-900">{insight.title}</h4>
          <p className="text-sm text-neutral-600 mt-1">{insight.message}</p>
          {insight.properties && insight.properties.length > 0 && (
            <div className="mt-3 space-y-2">
              {insight.properties.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => onAction?.(prop.id)}
                  className="flex items-center justify-between w-full px-3 py-2 bg-white rounded-lg hover:bg-neutral-100 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-neutral-700 truncate">{prop.title}</span>
                  {prop.views !== undefined && (
                    <span className="text-xs text-neutral-500 ml-2">{prop.views} views</span>
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
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">Active</span>;
      case 'sold':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Sold</span>;
      case 'pending':
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white rounded-lg border border-neutral-200 hover:shadow-md cursor-pointer transition-all"
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
        rank <= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-neutral-100 text-neutral-600'
      }`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-neutral-900 truncate">{property.title}</h4>
          {property.isPromoted && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
              <SparklesIcon className="h-3 w-3" />
              Promoted
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {getStatusBadge(property.status)}
          {property.price && (
            <span className="text-sm text-neutral-500">{formatPrice(property.price, 'Serbia')}</span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-xl font-bold text-primary">{property.periodViews}</p>
        <p className="text-xs text-neutral-500">
          {property.periodUniqueViews !== undefined && `${property.periodUniqueViews} unique · `}
          {property.totalViews} total
        </p>
      </div>
    </div>
  );
};

// Premium Upgrade Banner
const PremiumUpgradeBanner: React.FC<{ message?: string; onUpgradeClick: () => void }> = ({ message, onUpgradeClick }) => (
  <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      <div className="p-3 bg-white/20 rounded-lg w-fit">
        <LockClosedIcon className="h-8 w-8" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold">Unlock Premium Analytics</h3>
        <p className="text-white/80 text-sm mt-1">
          {message || 'Upgrade to Pro to access detailed analytics, smart insights, traffic sources, and downloadable reports.'}
        </p>
      </div>
      <button
        onClick={onUpgradeClick}
        className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-neutral-100 transition-colors w-full md:w-auto"
      >
        Upgrade Now
      </button>
    </div>
  </div>
);

// Main Analytics Page Component
const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const { state, dispatch } = useAppContext();
  const { currentUser } = state;

  const [period, setPeriod] = useState<Period>('30d');

  const navigateToProperty = (propertyId: string) => {
    window.history.pushState({}, '', `/property/${propertyId}`);
    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: propertyId });
  };

  const navigateToView = (view: AppView) => {
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-xl shadow-sm border border-neutral-200 p-8 max-w-md w-full">
          <LockClosedIcon className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Sign in Required</h2>
          <p className="text-neutral-500 mb-6">Please sign in to view your analytics.</p>
          <button
            onClick={openAuthModal}
            className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={navigateBack}
              className="p-2 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-neutral-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                <ChartBarIcon className="h-6 w-6 text-primary" />
                Analytics Dashboard
              </h1>
              <p className="text-sm text-neutral-500">Track your listings performance</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-neutral-200 px-3 py-2">
              <CalendarIcon className="h-4 w-4 text-neutral-400" />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="bg-transparent border-none text-sm font-medium text-neutral-700 focus:ring-0 cursor-pointer"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {isPremium && (
              <button
                onClick={handleDownloadReport}
                disabled={downloadReport.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{downloadReport.isPending ? 'Downloading...' : 'Export CSV'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {dashboardError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600">Failed to load analytics. Please try again later.</p>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            subtitle={`${dashboard?.overview?.monthlyUniqueViews || 0} unique`}
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
            title="Avg. Views"
            value={dashboard?.overview?.avgViewsPerProperty || 0}
            subtitle={`${dashboard?.overview?.promotedProperties || 0} promoted`}
            icon={StarIcon}
            loading={isLoading}
            color="orange"
          />
        </div>

        {/* Premium Upgrade Banner */}
        {!isPremium && !isLoading && (
          <div className="mb-6">
            <PremiumUpgradeBanner message={propertiesStats?.upgradeMessage} onUpgradeClick={openPricingModal} />
          </div>
        )}

        {/* Smart Insights */}
        {isPremium && dashboard?.insights && dashboard.insights.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <LightBulbIcon className="h-5 w-5 text-yellow-500" />
              Smart Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboard.insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} onAction={handlePropertyClick} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Properties List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
              <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="font-bold text-neutral-900">Property Performance</h2>
                <span className="text-sm text-neutral-500">Sorted by views</span>
              </div>
              <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 bg-neutral-100 rounded-lg animate-pulse" />
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
                  <div className="text-center py-10">
                    <HomeIcon className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-500 mb-4">No properties yet</p>
                    <button
                      onClick={() => navigateToView('create-listing')}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
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
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5">
                <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <TrophyIcon className="h-5 w-5 text-yellow-500" />
                  Top Performers
                </h3>
                <div className="space-y-3">
                  {dashboard.topPerformers.slice(0, 3).map((property, index) => (
                    <div
                      key={property.id}
                      onClick={() => handlePropertyClick(property.id)}
                      className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors"
                    >
                      <span className="text-lg font-bold text-yellow-600">{index + 1}</span>
                      <p className="flex-1 font-medium text-neutral-900 truncate text-sm">{property.title}</p>
                      <span className="font-bold text-primary">{property.monthlyViews}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Needs Attention */}
            {dashboard?.needsAttention && dashboard.needsAttention.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5">
                <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                  Needs Attention
                </h3>
                <div className="space-y-3">
                  {dashboard.needsAttention.slice(0, 3).map((property) => (
                    <div
                      key={property.id}
                      onClick={() => handlePropertyClick(property.id)}
                      className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 truncate text-sm">{property.title}</p>
                        <p className="text-xs text-orange-600">Only {property.monthlyViews} views</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigateToProperty(property.id); }}
                        className="px-3 py-1 bg-orange-600 text-white text-xs font-medium rounded-full hover:bg-orange-700 transition-colors"
                      >
                        Promote
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {isPremium && dashboard?.recentActivity && dashboard.recentActivity.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5">
                <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <ClockIcon className="h-5 w-5 text-blue-500" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {dashboard.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm">
                      <div className="p-1.5 bg-neutral-100 rounded">
                        {activity.deviceType === 'mobile' ? (
                          <DevicePhoneMobileIcon className="h-4 w-4 text-neutral-500" />
                        ) : activity.deviceType === 'tablet' ? (
                          <GlobeAltIcon className="h-4 w-4 text-neutral-500" />
                        ) : (
                          <ComputerDesktopIcon className="h-4 w-4 text-neutral-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-neutral-900 truncate">{activity.propertyTitle}</p>
                        <p className="text-xs text-neutral-500 flex items-center gap-1">
                          {activity.referrerType === 'search' && <><MagnifyingGlassIcon className="h-3 w-3" /> Search</>}
                          {activity.referrerType === 'social' && <><UserGroupIcon className="h-3 w-3" /> Social</>}
                          {activity.referrerType === 'email' && <><EnvelopeIcon className="h-3 w-3" /> Email</>}
                          {activity.referrerType === 'direct' && <><GlobeAltIcon className="h-3 w-3" /> Direct</>}
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
            <div className={`rounded-xl p-5 ${isPremium ? 'bg-gradient-to-br from-purple-500 to-blue-600' : 'bg-white border border-neutral-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                {isPremium ? (
                  <StarIcon className="h-6 w-6 text-yellow-300" />
                ) : (
                  <LockClosedIcon className="h-6 w-6 text-neutral-400" />
                )}
                <h3 className={`font-bold ${isPremium ? 'text-white' : 'text-neutral-900'}`}>
                  {isPremium ? 'Pro Analytics Active' : 'Free Plan'}
                </h3>
              </div>
              <p className={`text-sm ${isPremium ? 'text-white/80' : 'text-neutral-500'}`}>
                {isPremium
                  ? 'You have access to all premium analytics features.'
                  : 'Upgrade to unlock detailed analytics and reports.'}
              </p>
              {!isPremium && (
                <button
                  onClick={openPricingModal}
                  className="mt-4 w-full px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
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
