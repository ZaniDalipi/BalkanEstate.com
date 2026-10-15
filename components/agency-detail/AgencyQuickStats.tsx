/**
 * Agency Quick Stats Component
 * Displays key metrics in a grid layout
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon, type SoftIconName } from '@/src/shared/illustrations';

interface AgencyQuickStatsProps {
  listingsCount: number;
  agentsCount: number;
  yearsInBusiness?: number;
  rating?: number;
}

const AgencyQuickStats: React.FC<AgencyQuickStatsProps> = ({
  listingsCount,
  agentsCount,
  yearsInBusiness = 1,
  rating = 5.0,
}) => {
  const { t } = useTranslation(['agents']);

  const stats = [
    {
      icon: 'home' as SoftIconName,
      value: listingsCount,
      label: t('agencies.listedProperties'),
      bgColor: 'rgba(59, 130, 246, 0.05)',
    },
    {
      icon: 'users' as SoftIconName,
      value: agentsCount,
      label: t('agencies.agents'),
      bgColor: 'rgba(16, 185, 129, 0.05)',
    },
    {
      icon: 'calendar' as SoftIconName,
      value: `${yearsInBusiness}+`,
      label: t('agencies.years'),
      bgColor: 'rgba(139, 92, 246, 0.05)',
    },
    {
      icon: 'star' as SoftIconName,
      value: rating.toFixed(1),
      label: t('profile.rating'),
      bgColor: 'rgba(245, 158, 11, 0.05)',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="text-center p-4 rounded-xl border border-slate-200/60"
          style={{ background: stat.bgColor }}
        >
          <SoftIcon name={stat.icon} className="w-10 h-10 mx-auto mb-2" />
          <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
          <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default AgencyQuickStats;
