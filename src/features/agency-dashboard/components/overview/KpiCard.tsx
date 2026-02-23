import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@/constants';

interface KpiCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  isLoading?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 bg-gray-200 rounded-xl" />
            <div className="w-16 h-5 bg-gray-200 rounded-full" />
          </div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-2/3" />
        </div>
      </div>
    );
  }

  const formattedValue = value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : value.toLocaleString();

  const hasTrend = trend !== undefined && trend !== 0;
  const isPositive = (trend ?? 0) > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center text-white`}>
          {icon}
        </div>
        {hasTrend && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isPositive
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {isPositive ? (
              <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
            ) : (
              <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
            )}
            <span>{isPositive ? '+' : ''}{trend?.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="text-2xl font-bold text-gray-900 mb-1">
        {formattedValue}
      </div>
      <div className="text-sm text-gray-500 font-medium">
        {title}
      </div>
    </div>
  );
};

export default KpiCard;
