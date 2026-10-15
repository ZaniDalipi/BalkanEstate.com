import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface TimeSeriesChartProps {
  title: string;
  data: TimeSeriesPoint[];
  color: string;
  isLoading: boolean;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ title, data, color, isLoading }) => {
  const { t } = useTranslation(['agencyDashboard']);

  const maxValue = data.length > 0 ? Math.max(...data.map((d) => d.value), 1) : 1;

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-16 h-4 bg-gray-100 rounded animate-pulse" />
              <div className="flex-1 h-6 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <SoftIcon name="chart" className="w-14 h-14 mb-3" />
          <p className="text-sm font-medium">
            {t('agencyDashboard:analytics.noData', 'No data available for this period')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-2">
        {data.map((point, index) => {
          const widthPercent = (point.value / maxValue) * 100;
          return (
            <div key={`${point.date}-${index}`} className="flex items-center gap-3">
              <span className="w-16 text-xs text-gray-500 text-right shrink-0 font-medium">
                {formatDate(point.date)}
              </span>
              <div className="flex-1 h-7 bg-gray-50 rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md transition-all duration-500 ease-out"
                  style={{ width: `${widthPercent}%`, backgroundColor: color }}
                />
                {point.value > 0 && (
                  <span
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold"
                    style={{ color: widthPercent > 70 ? '#fff' : '#374151' }}
                  >
                    {point.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSeriesChart;
