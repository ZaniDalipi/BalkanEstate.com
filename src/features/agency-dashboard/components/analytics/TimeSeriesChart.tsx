import React from 'react';
import { useTranslation } from 'react-i18next';

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
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
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
