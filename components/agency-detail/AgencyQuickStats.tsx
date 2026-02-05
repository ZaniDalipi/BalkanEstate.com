/**
 * Agency Quick Stats Component
 * Displays key metrics in a grid layout
 */

import React from 'react';
import {
  HomeIcon,
  StarIcon,
  UserGroupIcon,
  CalendarIcon,
} from '@/constants';

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
  const stats = [
    {
      icon: HomeIcon,
      value: listingsCount,
      label: 'Listings',
      bgColor: 'rgba(59, 130, 246, 0.05)',
      iconBgColor: 'bg-primary/15',
      iconColor: 'text-primary',
    },
    {
      icon: UserGroupIcon,
      value: agentsCount,
      label: 'Agents',
      bgColor: 'rgba(16, 185, 129, 0.05)',
      iconBgColor: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600',
    },
    {
      icon: CalendarIcon,
      value: `${yearsInBusiness}+`,
      label: 'Years',
      bgColor: 'rgba(139, 92, 246, 0.05)',
      iconBgColor: 'bg-violet-500/15',
      iconColor: 'text-violet-600',
    },
    {
      icon: StarIcon,
      value: rating.toFixed(1),
      label: 'Rating',
      bgColor: 'rgba(245, 158, 11, 0.05)',
      iconBgColor: 'bg-amber-500/15',
      iconColor: 'text-amber-500',
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
          <div className={`w-10 h-10 mx-auto mb-2 rounded-xl ${stat.iconBgColor} flex items-center justify-center`}>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
          <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default AgencyQuickStats;
