import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useMyPropertiesViewStats,
  useMyAgentViewStats,
  useMyAgencyViewStats,
  useViewStatsComparison,
} from '../../features/view-stats/hooks';
import { Period } from '../../data/api/ViewStatsApiClient';
import {
  ChartBarIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  UserGroupIcon,
  HomeIcon,
  BuildingOfficeIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

interface ViewStatsDashboardProps {
  showProperties?: boolean;
  showAgent?: boolean;
  showAgency?: boolean;
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

interface StatCardProps {
  title: string;
  value: number | string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, loading }) => {
  const isPositive = change !== undefined && change >= 0;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="mt-4 h-8 bg-gray-200 dark:bg-gray-700 rounded w-16" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-all hover:shadow-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <Icon className="h-6 w-6 text-blue-500" />
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {change !== undefined && (
          <span
            className={`flex items-center text-sm font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? (
              <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
            ) : (
              <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
};

interface DeviceBreakdownProps {
  desktop: number;
  mobile: number;
  tablet: number;
  loading?: boolean;
}

const DeviceBreakdown: React.FC<DeviceBreakdownProps> = ({
  desktop,
  mobile,
  tablet,
  loading,
}) => {
  const total = desktop + mobile + tablet;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const devices = [
    { name: 'Desktop', value: desktop, icon: ComputerDesktopIcon, color: 'bg-blue-500' },
    { name: 'Mobile', value: mobile, icon: DevicePhoneMobileIcon, color: 'bg-green-500' },
    { name: 'Tablet', value: tablet, icon: GlobeAltIcon, color: 'bg-purple-500' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Device Breakdown
      </h3>
      <div className="space-y-4">
        {devices.map((device) => {
          const percentage = total > 0 ? Math.round((device.value / total) * 100) : 0;
          return (
            <div key={device.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <device.icon className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {device.name}
                  </span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {device.value} ({percentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`${device.color} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface TrafficSourcesProps {
  direct: number;
  search: number;
  social: number;
  email: number;
  other: number;
  loading?: boolean;
}

const TrafficSources: React.FC<TrafficSourcesProps> = ({
  direct,
  search,
  social,
  email,
  other,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const sources = [
    { name: 'Direct', value: direct, color: 'text-blue-600' },
    { name: 'Search', value: search, color: 'text-green-600' },
    { name: 'Social', value: social, color: 'text-purple-600' },
    { name: 'Email', value: email, color: 'text-orange-600' },
    { name: 'Other', value: other, color: 'text-gray-600' },
  ];

  const total = sources.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Traffic Sources
      </h3>
      <div className="space-y-3">
        {sources.map((source) => {
          const percentage = total > 0 ? Math.round((source.value / total) * 100) : 0;
          return (
            <div key={source.name} className="flex items-center justify-between">
              <span className={`text-sm font-medium ${source.color}`}>{source.name}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {source.value} views ({percentage}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface PropertyStatsListProps {
  properties: Array<{
    propertyId: string;
    title: string;
    totalViews: number;
    periodViews: number;
    periodUniqueViews: number;
  }>;
  loading?: boolean;
}

const PropertyStatsList: React.FC<PropertyStatsListProps> = ({ properties, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
        <HomeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">No properties to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Top Performing Properties
        </h3>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {properties.slice(0, 10).map((property, index) => (
          <div
            key={property.propertyId}
            className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-400 w-6">{index + 1}</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                  {property.title || 'Untitled Property'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {property.totalViews} total views
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600">{property.periodViews}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {property.periodUniqueViews} unique
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ViewStatsDashboard: React.FC<ViewStatsDashboardProps> = ({
  showProperties = true,
  showAgent = false,
  showAgency = false,
}) => {
  const { t } = useTranslation(['analytics']);
  const [period, setPeriod] = useState<Period>('30d');

  // Fetch data based on what sections are enabled
  const {
    data: propertiesStats,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = useMyPropertiesViewStats(period, showProperties);

  const {
    data: agentStats,
    isLoading: agentLoading,
    error: agentError,
  } = useMyAgentViewStats(period, showAgent);

  const {
    data: agencyStats,
    isLoading: agencyLoading,
    error: agencyError,
  } = useMyAgencyViewStats(period, showAgency);

  const { data: comparisonStats, isLoading: comparisonLoading } = useViewStatsComparison(
    showProperties
  );

  const isLoading = propertiesLoading || agentLoading || agencyLoading || comparisonLoading;

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ChartBarIcon className="h-7 w-7 text-blue-500" />
            View Statistics
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track how your listings and profile are performing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="block w-full sm:w-auto rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Stats (Week/Month) */}
      {showProperties && comparisonStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Views This Week"
            value={comparisonStats.thisWeek.views}
            change={comparisonStats.thisWeek.change}
            icon={EyeIcon}
            loading={comparisonLoading}
          />
          <StatCard
            title="Views Last Week"
            value={comparisonStats.lastWeek.views}
            icon={EyeIcon}
            loading={comparisonLoading}
          />
          <StatCard
            title="Views This Month"
            value={comparisonStats.thisMonth.views}
            change={comparisonStats.thisMonth.change}
            icon={ChartBarIcon}
            loading={comparisonLoading}
          />
          <StatCard
            title="Views Last Month"
            value={comparisonStats.lastMonth.views}
            icon={ChartBarIcon}
            loading={comparisonLoading}
          />
        </div>
      )}

      {/* Properties Section */}
      {showProperties && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HomeIcon className="h-5 w-5 text-blue-500" />
            Property Statistics
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Properties"
              value={propertiesStats?.totalProperties || 0}
              icon={HomeIcon}
              loading={propertiesLoading}
            />
            <StatCard
              title="Period Views"
              value={propertiesStats?.totalViews || 0}
              icon={EyeIcon}
              loading={propertiesLoading}
            />
            <StatCard
              title="Unique Visitors"
              value={propertiesStats?.uniqueViews || 0}
              icon={UserGroupIcon}
              loading={propertiesLoading}
            />
          </div>

          {propertiesStats?.propertiesStats && (
            <PropertyStatsList
              properties={propertiesStats.propertiesStats}
              loading={propertiesLoading}
            />
          )}
        </div>
      )}

      {/* Agent Section */}
      {showAgent && agentStats && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-green-500" />
            Agent Profile Statistics
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Profile Views"
              value={agentStats.stats?.totalViews || 0}
              icon={EyeIcon}
              loading={agentLoading}
            />
            <StatCard
              title="Unique Visitors"
              value={agentStats.stats?.uniqueViews || 0}
              icon={UserGroupIcon}
              loading={agentLoading}
            />
            <StatCard
              title="Avg. Time on Page"
              value={`${Math.round(agentStats.stats?.avgDuration || 0)}s`}
              icon={ChartBarIcon}
              loading={agentLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {agentStats.stats?.deviceBreakdown && (
              <DeviceBreakdown
                desktop={agentStats.stats.deviceBreakdown.desktop}
                mobile={agentStats.stats.deviceBreakdown.mobile}
                tablet={agentStats.stats.deviceBreakdown.tablet}
                loading={agentLoading}
              />
            )}
            {agentStats.stats?.trafficSources && (
              <TrafficSources
                direct={agentStats.stats.trafficSources.direct}
                search={agentStats.stats.trafficSources.search}
                social={agentStats.stats.trafficSources.social}
                email={agentStats.stats.trafficSources.email}
                other={agentStats.stats.trafficSources.other}
                loading={agentLoading}
              />
            )}
          </div>
        </div>
      )}

      {/* Agency Section */}
      {showAgency && agencyStats && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5 text-purple-500" />
            Agency Statistics
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total Page Views"
              value={agencyStats.stats?.totalViews || 0}
              icon={EyeIcon}
              loading={agencyLoading}
            />
            <StatCard
              title="Unique Visitors"
              value={agencyStats.stats?.uniqueViews || 0}
              icon={UserGroupIcon}
              loading={agencyLoading}
            />
            <StatCard
              title="Avg. Time on Page"
              value={`${Math.round(agencyStats.stats?.avgDuration || 0)}s`}
              icon={ChartBarIcon}
              loading={agencyLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {agencyStats.stats?.deviceBreakdown && (
              <DeviceBreakdown
                desktop={agencyStats.stats.deviceBreakdown.desktop}
                mobile={agencyStats.stats.deviceBreakdown.mobile}
                tablet={agencyStats.stats.deviceBreakdown.tablet}
                loading={agencyLoading}
              />
            )}
            {agencyStats.stats?.trafficSources && (
              <TrafficSources
                direct={agencyStats.stats.trafficSources.direct}
                search={agencyStats.stats.trafficSources.search}
                social={agencyStats.stats.trafficSources.social}
                email={agencyStats.stats.trafficSources.email}
                other={agencyStats.stats.trafficSources.other}
                loading={agencyLoading}
              />
            )}
          </div>
        </div>
      )}

      {/* Error States */}
      {(propertiesError || agentError || agencyError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
          <p className="text-red-600 dark:text-red-400">
            There was an error loading statistics. Please try again later.
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading &&
        !propertiesStats?.totalViews &&
        !agentStats?.stats?.totalViews &&
        !agencyStats?.stats?.totalViews && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
            <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No View Data Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              View statistics will appear here once your listings and profile start receiving views.
            </p>
          </div>
        )}
    </div>
  );
};

export default ViewStatsDashboard;
