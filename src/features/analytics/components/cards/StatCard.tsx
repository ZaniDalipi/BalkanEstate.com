import React, { useState, useEffect } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@/constants';
import { STAT_CARD_COLORS, StatCardColor } from '@/src/features/analytics/constants';
import { MiniBarChart } from '../charts';

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  color?: StatCardColor;
  chartData?: number[];
  delay?: number;
}

/**
 * Animated stat card with optional mini chart
 * Displays a metric with icon, optional trend indicator and chart
 */
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

  const colorClasses = STAT_CARD_COLORS[color];

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
    <div
      className={`bg-white rounded-xl shadow-sm border border-neutral-200 p-4 hover:shadow-md transition-all duration-500 transform ${
        animated ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          {title}
        </p>
        <div className={`p-2 rounded-lg ${colorClasses.bg}`}>
          <Icon className={`h-4 w-4 ${colorClasses.text}`} />
        </div>
      </div>

      {/* Value with change indicator */}
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        {change !== undefined && (
          <span
            className={`flex items-center text-xs font-semibold ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? (
              <ArrowTrendingUpIcon className="h-3 w-3" />
            ) : (
              <ArrowTrendingDownIcon className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>

      {/* Chart or subtitle */}
      {chartData && chartData.length > 0 ? (
        <MiniBarChart data={chartData} color={colorClasses.bar} />
      ) : subtitle ? (
        <p className="text-xs text-neutral-500">{subtitle}</p>
      ) : null}
    </div>
  );
};

export default StatCard;
