import React, { useState, useEffect } from 'react';
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
  FireIcon,
} from '../constants';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

// Truncate text helper
const truncateText = (text: string, maxLength: number = 25) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Animated Progress Bar Component
const ProgressBar: React.FC<{ value: number; max: number; color?: string; animate?: boolean }> = ({
  value,
  max,
  color = 'bg-primary',
  animate = true
}) => {
  const [width, setWidth] = useState(animate ? 0 : (max > 0 ? Math.min((value / max) * 100, 100) : 0));
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setWidth(percentage), 100);
      return () => clearTimeout(timer);
    }
  }, [percentage, animate]);

  return (
    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

// Animated Mini Bar Chart Component
const MiniBarChart: React.FC<{ data: number[]; color?: string }> = ({ data, color = 'bg-primary' }) => {
  const max = Math.max(...data, 1);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((value, i) => (
        <div
          key={i}
          className={`flex-1 ${color} rounded-t transition-all duration-500 ease-out`}
          style={{
            height: animated ? `${Math.max((value / max) * 100, 8)}%` : '0%',
            opacity: 0.4 + (i / data.length) * 0.6,
            transitionDelay: `${i * 50}ms`
          }}
        />
      ))}
    </div>
  );
};

// Stat Card with Visual and Animation
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  chartData?: number[];
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  loading,
  color = 'blue',
  chartData,
  delay = 0,
}) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 50 + delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-500' },
    green: { bg: 'bg-green-50', text: 'text-green-600', bar: 'bg-green-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', bar: 'bg-purple-500' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500' },
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-3 bg-neutral-200 rounded w-16" />
          <div className="h-8 w-8 bg-neutral-200 rounded-lg" />
        </div>
        <div className="h-7 bg-neutral-200 rounded w-14 mb-2" />
        <div className="h-2 bg-neutral-200 rounded w-full" />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-neutral-200 p-4 hover:shadow-md transition-all duration-500 transform ${animated ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{title}</p>
        <div className={`p-2 rounded-lg ${colorClasses[color].bg}`}>
          <Icon className={`h-4 w-4 ${colorClasses[color].text}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        {change !== undefined && (
          <span className={`flex items-center text-xs font-semibold ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      {chartData && chartData.length > 0 ? (
        <MiniBarChart data={chartData} color={colorClasses[color].bar} />
      ) : subtitle ? (
        <p className="text-xs text-neutral-500">{subtitle}</p>
      ) : null}
    </div>
  );
};

// Insight Card
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
    fire: FireIcon,
  };

  const priorityConfig = {
    success: { border: 'border-green-300', bg: 'bg-green-50', icon: 'text-green-600', accent: 'bg-green-500' },
    warning: { border: 'border-amber-300', bg: 'bg-amber-50', icon: 'text-amber-600', accent: 'bg-amber-500' },
    error: { border: 'border-red-300', bg: 'bg-red-50', icon: 'text-red-600', accent: 'bg-red-500' },
    info: { border: 'border-blue-300', bg: 'bg-blue-50', icon: 'text-blue-600', accent: 'bg-blue-500' },
  };

  const config = priorityConfig[insight.priority];
  const Icon = iconMap[insight.icon] || LightBulbIcon;

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4 relative overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accent}`} />
      <div className="flex items-start gap-3 pl-2">
        <div className={`p-2 rounded-lg bg-white shadow-sm ${config.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-neutral-900 text-sm">{insight.title}</h4>
          <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{insight.message}</p>
          {insight.properties && insight.properties.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {insight.properties.slice(0, 2).map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => onAction?.(prop.id)}
                  className="text-xs px-2 py-1 bg-white rounded-full border border-neutral-200 hover:border-primary hover:text-primary transition-colors truncate max-w-[120px]"
                >
                  {truncateText(prop.title, 15)}
                </button>
              ))}
              {insight.properties.length > 2 && (
                <span className="text-xs px-2 py-1 text-neutral-500">+{insight.properties.length - 2} more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Property Row with Visual Indicators
interface PropertyRowProps {
  property: {
    propertyId: string;
    title: string;
    status?: string;
    isPromoted?: boolean;
    price?: number;
    periodViews: number;
    periodUniqueViews?: number;
    totalViews: number;
  };
  rank: number;
  maxViews: number;
  onClick?: () => void;
}

const PropertyRow: React.FC<PropertyRowProps> = ({ property, rank, maxViews, onClick }) => {
  const performanceLevel = maxViews > 0 ? (property.periodViews / maxViews) : 0;
  const performanceColor = performanceLevel > 0.7 ? 'text-green-600' : performanceLevel > 0.3 ? 'text-amber-600' : 'text-neutral-500';
  const barColor = performanceLevel > 0.7 ? 'bg-green-500' : performanceLevel > 0.3 ? 'bg-amber-500' : 'bg-neutral-300';

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 cursor-pointer transition-all group"
    >
      {/* Rank Badge */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
        rank === 1 ? 'bg-yellow-100 text-yellow-700' :
        rank === 2 ? 'bg-neutral-200 text-neutral-600' :
        rank === 3 ? 'bg-orange-100 text-orange-700' :
        'bg-neutral-100 text-neutral-500'
      }`}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
      </div>

      {/* Property Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-neutral-900 text-sm truncate max-w-[180px] group-hover:text-primary transition-colors">
            {truncateText(property.title, 28)}
          </h4>
          {property.isPromoted && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-purple-100 text-purple-700 flex items-center gap-0.5">
              <SparklesIcon className="h-2.5 w-2.5" />
              PRO
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 max-w-[120px]">
            <ProgressBar value={property.periodViews} max={maxViews} color={barColor} />
          </div>
          {property.price && (
            <span className="text-[10px] text-neutral-400">{formatPrice(property.price, 'Serbia')}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 text-right">
        <p className={`text-lg font-bold ${performanceColor}`}>{property.periodViews}</p>
        <p className="text-[10px] text-neutral-400">
          {property.totalViews} total
        </p>
      </div>
    </div>
  );
};

// Animated Device Distribution Chart
const DeviceChart: React.FC<{ desktop: number; mobile: number; tablet: number }> = ({ desktop, mobile, tablet }) => {
  const total = desktop + mobile + tablet || 1;
  const [animated, setAnimated] = useState(false);
  const segments = [
    { label: 'Desktop', value: desktop, color: 'bg-blue-500', icon: ComputerDesktopIcon },
    { label: 'Mobile', value: mobile, color: 'bg-green-500', icon: DevicePhoneMobileIcon },
    { label: 'Tablet', value: tablet, color: 'bg-purple-500', icon: GlobeAltIcon },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`space-y-2 transform transition-all duration-500 ${animated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
      <div className="flex h-2 rounded-full overflow-hidden bg-neutral-100">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`${seg.color} transition-all duration-700 ease-out`}
            style={{
              width: animated ? `${(seg.value / total) * 100}%` : '0%',
              transitionDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px]">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1 text-neutral-500">
            <seg.icon className="h-3 w-3" />
            <span>{Math.round((seg.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Animated Traffic Sources Chart
const TrafficChart: React.FC<{ direct: number; search: number; social: number; email: number; other?: number }> = ({ direct, search, social, email, other = 0 }) => {
  const total = direct + search + social + email + other || 1;
  const [animated, setAnimated] = useState(false);
  const sources = [
    { label: 'Direct', value: direct, color: 'bg-blue-500' },
    { label: 'Search', value: search, color: 'bg-green-500' },
    { label: 'Social', value: social, color: 'bg-pink-500' },
    { label: 'Email', value: email, color: 'bg-amber-500' },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`space-y-1.5 transform transition-all duration-500 ${animated ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
      {sources.map((source, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-500 w-12">{source.label}</span>
          <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${source.color} rounded-full transition-all duration-700 ease-out`}
              style={{
                width: animated ? `${(source.value / total) * 100}%` : '0%',
                transitionDelay: `${i * 80}ms`
              }}
            />
          </div>
          <span className="text-[10px] font-medium text-neutral-600 w-8 text-right">{Math.round((source.value / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
};

// Premium Banner
const PremiumUpgradeBanner: React.FC<{ onUpgradeClick: () => void }> = ({ onUpgradeClick }) => (
  <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-xl p-5 text-white relative overflow-hidden">
    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
    <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm w-fit">
        <LockClosedIcon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold">Unlock Premium Analytics</h3>
        <p className="text-white/80 text-sm mt-0.5">Get insights, traffic sources, device stats & CSV exports</p>
      </div>
      <button
        onClick={onUpgradeClick}
        className="px-5 py-2.5 bg-white text-purple-600 font-semibold rounded-lg hover:bg-neutral-100 transition-colors text-sm"
      >
        Upgrade Now
      </button>
    </div>
  </div>
);

// Main Component
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

  const openPricingModal = () => dispatch({ type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: true } });
  const openAuthModal = () => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } });

  const { data: dashboard, isLoading: dashboardLoading, error: dashboardError } = useDashboardOverview();
  const { data: propertiesStats, isLoading: propertiesLoading } = useMyPropertiesViewStats(period);
  const downloadReport = useDownloadReport();

  const isLoading = dashboardLoading || propertiesLoading;
  const isPremium = dashboard?.subscriptionInfo?.isPremium ?? false;
  const maxViews = propertiesStats?.propertiesStats?.reduce((max, p) => Math.max(max, p.periodViews), 0) || 1;

  // Use real weekly data from API or fallback to calculated values
  const weeklyData = dashboard?.weeklyViewsData || [0, 0, 0, 0, 0, 0, dashboard?.overview?.weeklyViews || 0];

  // Real device breakdown from API
  const deviceStats = dashboard?.deviceBreakdown || { desktop: 0, mobile: 0, tablet: 0 };

  // Real traffic sources from API
  const trafficStats = dashboard?.trafficSources || { direct: 0, search: 0, social: 0, email: 0, other: 0 };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-lg border border-neutral-200 p-8 max-w-sm w-full">
          <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <LockClosedIcon className="h-8 w-8 text-neutral-400" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 mb-2">Sign in Required</h2>
          <p className="text-neutral-500 text-sm mb-6">Please sign in to view your analytics dashboard.</p>
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
            <div className="flex bg-white rounded-lg border border-neutral-200 p-0.5">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
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

            {isPremium && (
              <button
                onClick={() => downloadReport.mutateAsync(period)}
                disabled={downloadReport.isPending}
                className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {dashboardError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600 text-sm">Failed to load analytics. Please try again.</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            title="Properties"
            value={dashboard?.overview?.totalProperties || 0}
            subtitle={`${dashboard?.overview?.activeProperties || 0} active`}
            icon={HomeIcon}
            loading={isLoading}
            color="blue"
            delay={0}
          />
          <StatCard
            title="Monthly"
            value={dashboard?.overview?.monthlyViews || 0}
            icon={EyeIcon}
            loading={isLoading}
            color="green"
            chartData={weeklyData}
            delay={100}
          />
          <StatCard
            title="Weekly"
            value={dashboard?.overview?.weeklyViews || 0}
            subtitle="Last 7 days"
            icon={ChartBarIcon}
            loading={isLoading}
            color="purple"
            delay={200}
          />
          <StatCard
            title="Avg/Property"
            value={dashboard?.overview?.avgViewsPerProperty || 0}
            subtitle={`${dashboard?.overview?.promotedProperties || 0} promoted`}
            icon={StarIcon}
            loading={isLoading}
            color="orange"
            delay={300}
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
          <div className="mb-6">
            <h2 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
              <LightBulbIcon className="h-4 w-4 text-amber-500" />
              Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dashboard.insights.slice(0, 3).map((insight, i) => (
                <InsightCard key={i} insight={insight} onAction={navigateToProperty} />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Properties List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                <h2 className="font-bold text-neutral-900 text-sm">Properties</h2>
                <span className="text-xs text-neutral-400">{propertiesStats?.propertiesStats?.length || 0} listings</span>
              </div>
              <div className="divide-y divide-neutral-50 max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
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
                  ))
                ) : propertiesStats?.propertiesStats && propertiesStats.propertiesStats.length > 0 ? (
                  propertiesStats.propertiesStats.map((property, index) => (
                    <PropertyRow
                      key={property.propertyId}
                      property={property}
                      rank={index + 1}
                      maxViews={maxViews}
                      onClick={() => navigateToProperty(property.propertyId)}
                    />
                  ))
                ) : (
                  <div className="text-center py-10">
                    <HomeIcon className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
                    <p className="text-neutral-500 text-sm mb-4">No properties yet</p>
                    <button
                      onClick={() => navigateToView('create-listing')}
                      className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      Add Property
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Top 3 */}
            {dashboard?.topPerformers && dashboard.topPerformers.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4">
                <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
                  <TrophyIcon className="h-4 w-4 text-yellow-500" />
                  Top 3
                </h3>
                <div className="space-y-2">
                  {dashboard.topPerformers.slice(0, 3).map((prop, i) => (
                    <div
                      key={prop.id}
                      onClick={() => navigateToProperty(prop.id)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer"
                    >
                      <span className="text-sm">{['🥇', '🥈', '🥉'][i]}</span>
                      <span className="flex-1 text-sm text-neutral-700 truncate">{truncateText(prop.title, 20)}</span>
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

            {/* Needs Attention */}
            {dashboard?.needsAttention && dashboard.needsAttention.length > 0 && (
              <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
                <h3 className="font-bold text-neutral-900 text-sm mb-3 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />
                  Low Views
                </h3>
                <div className="space-y-2">
                  {dashboard.needsAttention.slice(0, 2).map((prop) => (
                    <div
                      key={prop.id}
                      onClick={() => navigateToProperty(prop.id)}
                      className="flex items-center justify-between p-2 bg-white rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                    >
                      <span className="text-xs text-neutral-700 truncate flex-1">{truncateText(prop.title, 18)}</span>
                      <span className="text-xs text-orange-600 font-medium ml-2">{prop.monthlyViews} views</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subscription */}
            <div className={`rounded-xl p-4 ${isPremium ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white' : 'bg-white border border-neutral-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {isPremium ? <StarIcon className="h-5 w-5 text-yellow-300" /> : <LockClosedIcon className="h-5 w-5 text-neutral-400" />}
                <h3 className="font-bold text-sm">{isPremium ? 'Pro Active' : 'Free Plan'}</h3>
              </div>
              <p className={`text-xs ${isPremium ? 'text-white/80' : 'text-neutral-500'}`}>
                {isPremium ? 'Full access to all features' : 'Upgrade for advanced analytics'}
              </p>
              {!isPremium && (
                <button onClick={openPricingModal} className="mt-3 w-full px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors">
                  Upgrade
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
