import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import {
  useDashboardOverview,
  useMyPropertiesViewStats,
  useDownloadReport,
} from '@/src/features/view-stats/hooks';
import { Period } from '@/src/data/api/ViewStatsApiClient';
import { AppView } from '@/types';
import { getMyListings } from '@/src/features/properties/api/propertyApi';
import RentalDashboardStats from '@/src/features/rental/components/RentalDashboardStats';
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
  SparklesIcon,
  FireIcon,
  BoltIcon,
  RocketLaunchIcon,
} from '@/constants';
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
} from '@/src/features/analytics';

// Animated number counter hook
const useAnimatedCounter = (end: number, duration: number = 1000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }

    let startTime: number | null = null;
    const startValue = 0;

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(startValue + (end - startValue) * easeOutQuart));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
};

// Floating particle component
const FloatingParticle: React.FC<{ delay: number; size: 'sm' | 'md' | 'lg' }> = ({ delay, size }) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  return (
    <div
      className={`absolute ${sizeClasses[size]} rounded-full bg-gradient-to-r from-primary/40 to-purple-400/40 animate-float`}
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${3 + Math.random() * 4}s`,
      }}
    />
  );
};

/**
 * Analytics Dashboard Page
 * Displays property performance metrics, insights and charts
 */
const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const { state, dispatch } = useAppContext();
  const { currentUser } = state;
  const [period, setPeriod] = useState<Period>('30d');
  const [myProperties, setMyProperties] = useState<any[]>([]);

  // Fetch user's listings for rental portfolio stats
  useEffect(() => {
    if (!currentUser) return;
    getMyListings().then(setMyProperties).catch(() => {});
  }, [currentUser]);

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
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
  const openAuthModal = () =>
    dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });

  // Data fetching
  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isFetching: dashboardFetching,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboardOverview();
  const {
    data: propertiesStats,
    isLoading: propertiesLoading,
    isFetching: propertiesFetching,
    refetch: refetchProperties,
  } = useMyPropertiesViewStats(period);
  const downloadReport = useDownloadReport();

  // Retry handler - refetch both dashboard and properties data
  const handleRetry = async () => {
    try {
      await Promise.all([
        refetchDashboard(),
        refetchProperties(),
      ]);
    } catch (error) {
      // Error removed
    }
  };

  // Track if any data is being fetched (initial or refetch)
  const isFetching = dashboardFetching || propertiesFetching;

  // Get error message
  const getErrorMessage = (error: any): string => {
    if (!error) return '';
    if (error.message?.includes('401') || error.message?.includes('Not authorized')) {
      return t('analytics:errors.sessionExpired');
    }
    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      return t('analytics:errors.networkError');
    }
    if (error.message?.includes('500')) {
      return t('analytics:errors.serverError');
    }
    return t('analytics:errors.loadFailed');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative text-center bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 max-w-sm w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/30">
            <ChartBarIcon className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{t('analytics:signInRequired')}</h2>
          <p className="text-white/60 text-sm mb-6">
            {t('analytics:signInMessage')}
          </p>
          <button
            onClick={openAuthModal}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40"
          >
            {t('analytics:signIn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 overflow-y-auto relative">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-purple-200/30 via-blue-200/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-200/20 via-purple-200/10 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <FloatingParticle key={i} delay={i * 0.5} size={i % 3 === 0 ? 'lg' : i % 2 === 0 ? 'md' : 'sm'} />
        ))}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.4; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.8; }
          50% { transform: translateY(-10px) translateX(-10px); opacity: 0.6; }
          75% { transform: translateY(-30px) translateX(5px); opacity: 0.9; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        {/* Hero Header */}
        <div className="relative mb-8 rounded-3xl overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />

          {/* Animated orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 animate-pulse-glow" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-300/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 animate-pulse-glow" style={{ animationDelay: '2s' }} />

          <div className="relative px-6 py-8 md:px-8 md:py-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Left side - Title and stats */}
              <div className="flex items-start gap-4">
                <button
                  onClick={() => window.history.back()}
                  className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all group"
                >
                  <ArrowLeftIcon className="h-5 w-5 text-white group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                      <RocketLaunchIcon className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white">
                      {t('analytics:title')}
                    </h1>
                    {isPremium && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-400/90 text-amber-900 text-xs font-bold rounded-full">
                        <StarIcon className="h-3 w-3" />
                        PRO
                      </span>
                    )}
                  </div>
                  <p className="text-white/70 text-sm md:text-base">{t('analytics:subtitle')}</p>
                </div>
              </div>

              {/* Right side - Controls */}
              <div className="flex items-center gap-3">
                {/* Period selector - Glass style */}
                <div className="flex bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-1">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setPeriod(opt.value)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        period === opt.value
                          ? 'bg-white text-purple-700 shadow-lg'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {t(`analytics:periods.${opt.value}`)}
                    </button>
                  ))}
                </div>

                {/* Download button */}
                {isPremium && (
                  <button
                    onClick={() => downloadReport.mutateAsync(period)}
                    disabled={downloadReport.isPending}
                    className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all border border-white/20 disabled:opacity-50 group"
                  >
                    <DocumentArrowDownIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick stats row */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickStat
                label={t('analytics:stats.today')}
                value={dashboard?.overview?.todayViews || 0}
                icon={<BoltIcon className="h-4 w-4" />}
                color="from-yellow-400 to-orange-400"
                loading={isLoading}
              />
              <QuickStat
                label={t('analytics:stats.weekly')}
                value={dashboard?.overview?.weeklyViews || 0}
                change={dashboard?.overview?.weeklyChange}
                icon={<FireIcon className="h-4 w-4" />}
                color="from-pink-400 to-rose-400"
                loading={isLoading}
              />
              <QuickStat
                label={t('analytics:stats.monthly')}
                value={dashboard?.overview?.monthlyViews || 0}
                change={dashboard?.overview?.monthlyChange}
                icon={<ChartBarIcon className="h-4 w-4" />}
                color="from-cyan-400 to-blue-400"
                loading={isLoading}
              />
              <QuickStat
                label={t('analytics:stats.properties')}
                value={dashboard?.overview?.totalProperties || 0}
                icon={<HomeIcon className="h-4 w-4" />}
                color="from-emerald-400 to-teal-400"
                loading={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Error state */}
        {dashboardError && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-red-700 font-medium text-sm">{t('analytics:errors.title', 'Error loading data')}</p>
                  <p className="text-red-600 text-xs">{getErrorMessage(dashboardError)}</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                disabled={isFetching}
                className="px-4 py-2 text-sm font-medium bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                {isFetching ? t('analytics:errors.retrying') : t('analytics:errors.retry')}
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid - Glass cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            title={t('analytics:stats.today')}
            value={dashboard?.overview?.todayViews || 0}
            subtitle={t('analytics:stats.liveViews')}
            icon={ClockIcon}
            loading={isLoading}
            color="blue"
            delay={0}
          />
          <StatCard
            title={t('analytics:stats.weekly')}
            value={dashboard?.overview?.weeklyViews || 0}
            change={dashboard?.overview?.weeklyChange}
            icon={ChartBarIcon}
            loading={isLoading}
            color="purple"
            delay={100}
          />
          <StatCard
            title={t('analytics:stats.monthly')}
            value={dashboard?.overview?.monthlyViews || 0}
            change={dashboard?.overview?.monthlyChange}
            icon={EyeIcon}
            loading={isLoading}
            color="green"
            chartData={weeklyData}
            delay={200}
          />
          <StatCard
            title={t('analytics:stats.properties')}
            value={dashboard?.overview?.totalProperties || 0}
            subtitle={t('analytics:stats.activeProperties', { count: dashboard?.overview?.activeProperties || 0 })}
            icon={HomeIcon}
            loading={isLoading}
            color="orange"
            delay={300}
          />
          <StatCard
            title={t('analytics:stats.avgPerProperty')}
            value={dashboard?.overview?.avgViewsPerProperty || 0}
            subtitle={t('analytics:stats.promoted', { count: dashboard?.overview?.promotedProperties || 0 })}
            icon={StarIcon}
            loading={isLoading}
            color="blue"
            delay={400}
          />
        </div>

        {/* Rental Portfolio Stats */}
        {myProperties.some(p => p.listingType === 'rent') && (
          <div className="mb-6">
            <RentalDashboardStats properties={myProperties} />
          </div>
        )}

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

// Quick stat component for hero header
interface QuickStatProps {
  label: string;
  value: number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

const QuickStat: React.FC<QuickStatProps> = ({ label, value, change, icon, color, loading }) => {
  const animatedValue = useAnimatedCounter(loading ? 0 : value, 1200);

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 animate-pulse">
        <div className="h-4 bg-white/20 rounded w-16 mb-2" />
        <div className="h-6 bg-white/20 rounded w-12" />
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all group">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg bg-gradient-to-r ${color}`}>
          {icon}
        </div>
        <span className="text-white/70 text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white group-hover:scale-105 transition-transform">
          {animatedValue.toLocaleString()}
        </span>
        {change !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change >= 0 ? '↑' : '↓'}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
};

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
}) => {
  const { t } = useTranslation(['analytics']);
  return (
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
            {t('analytics:title')}
          </h1>
          <p className="text-xs text-neutral-500">{t('analytics:subtitle')}</p>
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
              {t(`analytics:periods.${opt.value}`)}
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
};

interface InsightsSectionProps {
  insights: NonNullable<ReturnType<typeof useDashboardOverview>['data']>['insights'];
  onNavigateToProperty: (id: string) => void;
}

const InsightsSection: React.FC<InsightsSectionProps> = ({ insights, onNavigateToProperty }) => {
  const { t } = useTranslation(['analytics']);
  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
        <LightBulbIcon className="h-4 w-4 text-amber-500" />
        {t('analytics:insights.title')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.slice(0, 3).map((insight, i) => (
          <InsightCard key={i} insight={insight} onAction={onNavigateToProperty} />
        ))}
      </div>
    </div>
  );
};

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
}) => {
  const { t } = useTranslation(['analytics']);
  return (
    <div className="lg:col-span-2">
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-bold text-neutral-900 text-sm">{t('analytics:properties.title')}</h2>
          <span className="text-xs text-neutral-400">{t('analytics:stats.listings', { count: propertiesStats?.length || 0 })}</span>
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
};

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

const EmptyState: React.FC<{ onAddProperty: () => void }> = ({ onAddProperty }) => {
  const { t } = useTranslation(['analytics']);
  return (
    <div className="text-center py-10">
      <HomeIcon className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
      <p className="text-neutral-500 text-sm mb-4">{t('analytics:properties.noProperties')}</p>
      <button
        onClick={onAddProperty}
        className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
      >
        {t('analytics:properties.addProperty')}
      </button>
    </div>
  );
};

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
}) => {
  const { t } = useTranslation(['analytics']);
  return (
    <div className="space-y-4">
      {/* Top 3 */}
      {topPerformers && topPerformers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
          <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
            <TrophyIcon className="h-4 w-4 text-yellow-500" />
            {t('analytics:sidebar.topPerformers')}
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
            {t('analytics:sidebar.devices')}
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
            {t('analytics:sidebar.traffic')}
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
            {t('analytics:sidebar.peakHours')}
          </h3>
          <HourlyHeatmap data={hourlyDistribution} />
        </div>
      )}

      {/* Needs Attention */}
      {needsAttention && needsAttention.length > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
          <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
            {t('analytics:sidebar.needsAttention')}
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
                  {t('analytics:properties.views', { count: prop.monthlyViews })}
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
          <h3 className="font-bold text-sm">{isPremium ? t('analytics:premium.proActive') : t('analytics:premium.freePlan')}</h3>
        </div>
        <p className={`text-xs ${isPremium ? 'text-white/80' : 'text-neutral-500'}`}>
          {isPremium ? t('analytics:premium.premiumAccess') : t('analytics:premium.freeAccess')}
        </p>
        {!isPremium && (
          <button
            onClick={onUpgradeClick}
            className="mt-3 w-full px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
          >
            {t('analytics:premium.upgrade')}
          </button>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
