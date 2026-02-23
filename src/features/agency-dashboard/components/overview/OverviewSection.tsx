import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyOverview } from '../../hooks/useAgencyOverview';
import {
  HomeIcon,
  UsersIcon,
  EnvelopeIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
} from '@/constants';
import KpiCard from './KpiCard';
import OverviewCharts from './OverviewCharts';

interface OverviewSectionProps {
  agencyId: string;
}

const OverviewSection: React.FC<OverviewSectionProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard']);
  const { overview, isLoading, error, refetch } = useAgencyOverview(agencyId);

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('agencyDashboard:overview.errorTitle', 'Failed to load overview')}
        </h3>
        <p className="text-gray-500 mb-4">
          {t('agencyDashboard:overview.errorDescription', 'Something went wrong while fetching your dashboard data.')}
        </p>
        <button
          onClick={() => refetch()}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
        >
          {t('agencyDashboard:overview.retry', 'Try Again')}
        </button>
      </div>
    );
  }

  const kpiCards = [
    {
      title: t('agencyDashboard:overview.activeListings', 'Active Listings'),
      value: overview?.activeListings ?? 0,
      icon: <HomeIcon className="w-6 h-6" />,
      color: 'bg-green-500',
    },
    {
      title: t('agencyDashboard:overview.totalAgents', 'Total Agents'),
      value: overview?.totalAgents ?? 0,
      icon: <UsersIcon className="w-6 h-6" />,
      color: 'bg-blue-500',
    },
    {
      title: t('agencyDashboard:overview.inquiriesThisMonth', 'Inquiries This Month'),
      value: overview?.inquiriesThisMonth ?? 0,
      icon: <EnvelopeIcon className="w-6 h-6" />,
      color: 'bg-amber-500',
    },
    {
      title: t('agencyDashboard:overview.totalViews', 'Total Views'),
      value: overview?.totalViews ?? 0,
      icon: <EyeIcon className="w-6 h-6" />,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('agencyDashboard:overview.title', 'Overview')}
        </h2>
        {!isLoading && overview && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
            <ArrowTrendingUpIcon className="w-4 h-4" />
            <span>
              {t('agencyDashboard:overview.conversionRate', 'Conversion')}: {overview.conversionRate.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KpiCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            isLoading={isLoading}
          />
        ))}
      </div>

      {!isLoading && overview && (
        <OverviewCharts
          viewsTrend={overview.viewsTrend}
          inquiriesTrend={overview.inquiriesTrend}
        />
      )}

      {isLoading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-gray-200 rounded w-1/4" />
            <div className="h-40 bg-gray-100 rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewSection;
