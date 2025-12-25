import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import {
  useDashboardOverview,
  useMyPropertiesViewStats,
  useDownloadReport,
} from '../src/features/view-stats/hooks';
import { Period } from '../src/data/api/ViewStatsApiClient';
import { AppView } from '../types';
import {
  ChartBarIcon,
  EyeIcon,
  LightBulbIcon,
  HomeIcon,
  DocumentArrowDownIcon,
  ArrowLeftIcon,
  LockClosedIcon,
  StarIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '../constants';
import {
  StatCard,
  InsightCard,
  PropertyRow,
  DeviceChart,
  TrafficChart,
  HourlyHeatmap,
  PremiumUpgradeBanner,
  PERIOD_OPTIONS,
  truncateText,
} from '../src/features/analytics';

/**
 * Analytics Dashboard Page
 * Displays property performance metrics, insights and charts
 */
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

  const navigateToView = (view: AppView) => {
    window.history.pushState({}, '', `/${view}`);
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
  };

  const openPricingModal = () =>
    dispatch({ type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: true } });
  const openAuthModal = () =>
    dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });

  // Data fetching
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboardOverview();
  const {
    data: propertiesStats,
    isLoading: propertiesLoading,
    refetch: refetchProperties,
  } = useMyPropertiesViewStats(period);
  const downloadReport = useDownloadReport();

  // Retry handler
  const handleRetry = () => {
    refetchDashboard();
    refetchProperties();
  };

  // Get error message
  const getErrorMessage = (error: any): string => {
    if (!error) return '';
    if (error.message?.includes('401') || error.message?.includes('Not authorized')) {
      return 'Session expired. Please sign in again.';
    }
    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
    if (error.message?.includes('500')) {
      return 'Server error. Please try again later.';
    }
    return 'Failed to load analytics. Please try again.';
  };

  // Computed values
  const isLoading = dashboardLoading || propertiesLoading;
  const isPremium = dashboard?.subscriptionInfo?.isPremium ?? false;
  const maxViews =
    propertiesStats?.propertiesStats?.reduce((max, p) => Math.max(max, p.periodViews), 0) || 1;

  // Real data from API with fallbacks
  const weeklyData = dashboard?.weeklyViewsData || [
    0, 0, 0, 0, 0, 0,
    dashboard?.overview?.weeklyViews || 0,
  ];
  const deviceStats = dashboard?.deviceBreakdown || { desktop: 0, mobile: 0, tablet: 0 };
  const trafficStats = dashboard?.trafficSources || {
    direct: 0, search: 0, social: 0, email: 0, other: 0,
  };

  // Auth required screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-lg border border-neutral-200 p-8 max-w-sm w-full">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LockClosedIcon className="h-8 w-8 text-neutral-400" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 mb-2">Sign in Required</h2>
          <p className="text-neutral-500 text-sm mb-6">
            Please sign in to view your analytics dashboard.
          </p>
          <button
            onClick={openAuthModal}
            className="w-full px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <Header
          period={period}
          onPeriodChange={setPeriod}
          isPremium={isPremium}
          onDownload={() => downloadReport.mutateAsync(period)}
          isDownloading={downloadReport.isPending}
        />

        {/* Error state */}
        {dashboardError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <p className="text-red-600 text-sm">{getErrorMessage(dashboardError)}</p>
              </div>
              <button
                onClick={handleRetry}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <StatCard
            title="Today"
            value={dashboard?.overview?.todayViews || 0}
            subtitle="Live views"
            icon={ClockIcon}
            loading={isLoading}
            color="blue"
            delay={0}
          />
          <StatCard
            title="Weekly"
            value={dashboard?.overview?.weeklyViews || 0}
            change={dashboard?.overview?.weeklyChange}
            icon={ChartBarIcon}
            loading={isLoading}
            color="purple"
            delay={100}
          />
          <StatCard
            title="Monthly"
            value={dashboard?.overview?.monthlyViews || 0}
            change={dashboard?.overview?.monthlyChange}
            icon={EyeIcon}
            loading={isLoading}
            color="green"
            chartData={weeklyData}
            delay={200}
          />
          <StatCard
            title="Properties"
            value={dashboard?.overview?.totalProperties || 0}
            subtitle={`${dashboard?.overview?.activeProperties || 0} active`}
            icon={HomeIcon}
            loading={isLoading}
            color="orange"
            delay={300}
          />
          <StatCard
            title="Avg/Property"
            value={dashboard?.overview?.avgViewsPerProperty || 0}
            subtitle={`${dashboard?.overview?.promotedProperties || 0} promoted`}
            icon={StarIcon}
            loading={isLoading}
            color="blue"
            delay={400}
          />
        </div>

        {/* Premium Banner */}
        {!isPremium && !isLoading && (
          <div className="mb-6">
            <PremiumUpgradeBanner onUpgradeClick={openPricingModal} />
          </div>
        )}

        {/* Insights */}
        {isPremium && dashboard?.insights && dashboard.insights.length > 0 && (
          <InsightsSection
            insights={dashboard.insights}
            onNavigateToProperty={navigateToProperty}
          />
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Properties List */}
          <PropertiesSection
            propertiesStats={propertiesStats?.propertiesStats}
            isLoading={isLoading}
            maxViews={maxViews}
            onPropertyClick={navigateToProperty}
            onAddProperty={() => navigateToView('create-listing')}
          />

          {/* Sidebar */}
          <Sidebar
            topPerformers={dashboard?.topPerformers}
            needsAttention={dashboard?.needsAttention}
            deviceStats={deviceStats}
            trafficStats={trafficStats}
            hourlyDistribution={dashboard?.hourlyDistribution}
            isPremium={isPremium}
            onPropertyClick={navigateToProperty}
            onUpgradeClick={openPricingModal}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

interface HeaderProps {
  period: Period;
  onPeriodChange: (period: Period) => void;
  isPremium: boolean;
  onDownload: () => void;
  isDownloading: boolean;
}

const Header: React.FC<HeaderProps> = ({
  period,
  onPeriodChange,
  isPremium,
  onDownload,
  isDownloading,
}) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <button
        onClick={() => window.history.back()}
        className="p-2 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4 text-neutral-600" />
      </button>
      <div>
        <h1 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-primary" />
          Analytics
        </h1>
        <p className="text-xs text-neutral-500">Track performance & insights</p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      {/* Period selector */}
      <div className="flex bg-white rounded-lg border border-neutral-200 p-0.5">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onPeriodChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              period === opt.value
                ? 'bg-primary text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Download button */}
      {isPremium && (
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          <DocumentArrowDownIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  </div>
);

interface InsightsSectionProps {
  insights: NonNullable<ReturnType<typeof useDashboardOverview>['data']>['insights'];
  onNavigateToProperty: (id: string) => void;
}

const InsightsSection: React.FC<InsightsSectionProps> = ({ insights, onNavigateToProperty }) => (
  <div className="mb-6">
    <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
      <LightBulbIcon className="h-4 w-4 text-amber-500" />
      Insights
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {insights.slice(0, 3).map((insight, i) => (
        <InsightCard key={i} insight={insight} onAction={onNavigateToProperty} />
      ))}
    </div>
  </div>
);

interface PropertiesSectionProps {
  propertiesStats?: Array<{
    propertyId: string;
    title: string;
    status?: string;
    isPromoted?: boolean;
    price?: number;
    periodViews: number;
    periodUniqueViews?: number;
    totalViews: number;
  }>;
  isLoading: boolean;
  maxViews: number;
  onPropertyClick: (id: string) => void;
  onAddProperty: () => void;
}

const PropertiesSection: React.FC<PropertiesSectionProps> = ({
  propertiesStats,
  isLoading,
  maxViews,
  onPropertyClick,
  onAddProperty,
}) => (
  <div className="lg:col-span-2">
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <h2 className="font-bold text-neutral-900 text-sm">Properties</h2>
        <span className="text-xs text-neutral-400">{propertiesStats?.length || 0} listings</span>
      </div>
      <div className="divide-y divide-neutral-50 max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : propertiesStats && propertiesStats.length > 0 ? (
          propertiesStats.map((property, index) => (
            <PropertyRow
              key={property.propertyId}
              property={property}
              rank={index + 1}
              maxViews={maxViews}
              onClick={() => onPropertyClick(property.propertyId)}
            />
          ))
        ) : (
          <EmptyState onAddProperty={onAddProperty} />
        )}
      </div>
    </div>
  </div>
);

const LoadingSkeleton: React.FC = () => (
  <>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="p-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-neutral-100 rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-neutral-100 rounded w-3/4 mb-2 animate-pulse" />
            <div className="h-1.5 bg-neutral-100 rounded w-1/2 animate-pulse" />
          </div>
          <div className="h-6 w-10 bg-neutral-100 rounded animate-pulse" />
        </div>
      </div>
    ))}
  </>
);

const EmptyState: React.FC<{ onAddProperty: () => void }> = ({ onAddProperty }) => (
  <div className="text-center py-10">
    <HomeIcon className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
    <p className="text-neutral-500 text-sm mb-4">No properties yet</p>
    <button
      onClick={onAddProperty}
      className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
    >
      Add Property
    </button>
  </div>
);

interface SidebarProps {
  topPerformers?: Array<{ id: string; title: string; monthlyViews: number }>;
  needsAttention?: Array<{ id: string; title: string; monthlyViews: number }>;
  deviceStats: { desktop: number; mobile: number; tablet: number };
  trafficStats: { direct: number; search: number; social: number; email: number; other: number };
  hourlyDistribution?: number[] | null;
  isPremium: boolean;
  onPropertyClick: (id: string) => void;
  onUpgradeClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  topPerformers,
  needsAttention,
  deviceStats,
  trafficStats,
  hourlyDistribution,
  isPremium,
  onPropertyClick,
  onUpgradeClick,
}) => (
  <div className="space-y-4">
    {/* Top 3 */}
    {topPerformers && topPerformers.length > 0 && (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
        <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
          <TrophyIcon className="h-4 w-4 text-yellow-500" />
          Top 3
        </h3>
        <div className="space-y-2">
          {topPerformers.slice(0, 3).map((prop, i) => (
            <div
              key={prop.id}
              onClick={() => onPropertyClick(prop.id)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer"
            >
              <span className="text-sm">{['🥇', '🥈', '🥉'][i]}</span>
              <span className="flex-1 text-sm text-neutral-700 truncate">
                {truncateText(prop.title, 20)}
              </span>
              <span className="text-sm font-bold text-primary">{prop.monthlyViews}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Device Stats (Premium) */}
    {isPremium && deviceStats && (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
        <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
          <ComputerDesktopIcon className="h-4 w-4 text-blue-500" />
          Devices
        </h3>
        <DeviceChart
          desktop={deviceStats.desktop}
          mobile={deviceStats.mobile}
          tablet={deviceStats.tablet}
        />
      </div>
    )}

    {/* Traffic Sources (Premium) */}
    {isPremium && trafficStats && (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
        <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
          <GlobeAltIcon className="h-4 w-4 text-green-500" />
          Traffic
        </h3>
        <TrafficChart
          direct={trafficStats.direct}
          search={trafficStats.search}
          social={trafficStats.social}
          email={trafficStats.email}
          other={trafficStats.other}
        />
      </div>
    )}

    {/* Hourly Activity Heatmap (Premium) */}
    {isPremium && hourlyDistribution && hourlyDistribution.length === 24 && (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
        <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-purple-500" />
          Peak Hours
        </h3>
        <HourlyHeatmap data={hourlyDistribution} />
      </div>
    )}

    {/* Needs Attention */}
    {needsAttention && needsAttention.length > 0 && (
      <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
        <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
          Low Views
        </h3>
        <div className="space-y-2">
          {needsAttention.slice(0, 2).map((prop) => (
            <div
              key={prop.id}
              onClick={() => onPropertyClick(prop.id)}
              className="flex items-center justify-between p-2 bg-white rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
            >
              <span className="text-xs text-neutral-700 truncate flex-1">
                {truncateText(prop.title, 18)}
              </span>
              <span className="text-xs text-orange-600 font-medium ml-2">
                {prop.monthlyViews} views
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Subscription Card */}
    <div
      className={`rounded-xl p-4 ${
        isPremium
          ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white'
          : 'bg-white border border-neutral-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isPremium ? (
          <StarIcon className="h-5 w-5 text-yellow-300" />
        ) : (
          <LockClosedIcon className="h-5 w-5 text-neutral-400" />
        )}
        <h3 className="font-bold text-sm">{isPremium ? 'Pro Active' : 'Free Plan'}</h3>
      </div>
      <p className={`text-xs ${isPremium ? 'text-white/80' : 'text-neutral-500'}`}>
        {isPremium ? 'Full access to all features' : 'Upgrade for advanced analytics'}
      </p>
      {!isPremium && (
        <button
          onClick={onUpgradeClick}
          className="mt-3 w-full px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
        >
          Upgrade
        </button>
      )}
    </div>
  </div>
);

export default AnalyticsPage;
