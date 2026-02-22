// Agent Statistics Display Component
// Shows key metrics for an agent's performance

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  CurrencyDollarIcon,
  StarIcon,
  ClockIcon,
} from '@/constants';
import { formatPrice } from '@/utils/currency';

interface AgentStatsProps {
  stats: {
    totalSales: number;
    recentSales: number;
    avgPrice: number;
    rating: number;
    reviews: number;
    yearsExperience: number;
  };
  activeListingsCount: number;
  country?: string;
}

const AgentStats: React.FC<AgentStatsProps> = ({ stats, activeListingsCount, country = '' }) => {
  const { t } = useTranslation(['agents']);

  const statItems = [
    {
      icon: HomeIcon,
      value: stats.totalSales,
      label: t('agents:profilePage.stats.propertiesSold'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: HomeIcon,
      value: activeListingsCount,
      label: t('agents:profilePage.stats.activeListings'),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: CurrencyDollarIcon,
      value: formatPrice(stats.avgPrice, country),
      label: t('agents:profilePage.stats.avgPrice'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      isFormatted: true,
    },
    {
      icon: StarIcon,
      value: stats.rating.toFixed(1),
      label: `${stats.reviews} ${t('agents:profilePage.stats.reviews')}`,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      icon: ClockIcon,
      value: stats.yearsExperience,
      label: t('agents:profilePage.stats.yearsExperience'),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {statItems.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className={`${stat.bgColor} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {stat.isFormatted ? stat.value : stat.value.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default AgentStats;
