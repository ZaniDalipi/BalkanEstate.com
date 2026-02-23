import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TimeSeriesPoint } from '../../types';

interface OverviewChartsProps {
  viewsTrend: TimeSeriesPoint[];
  inquiriesTrend: TimeSeriesPoint[];
}

interface BarChartSectionProps {
  title: string;
  data: TimeSeriesPoint[];
  barColor: string;
  barHoverColor: string;
}

const BarChartSection: React.FC<BarChartSectionProps> = ({
  title,
  data,
  barColor,
  barHoverColor,
}) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const formatLabel = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>
      <div className="flex items-end gap-1.5" style={{ height: '140px' }}>
        {data.map((point, index) => {
          const heightPercent = (point.value / maxValue) * 100;
          return (
            <div
              key={`${point.date}-${index}`}
              className="flex-1 flex flex-col items-center justify-end h-full group"
            >
              <div className="relative w-full flex justify-center mb-1">
                <span className="absolute -top-6 text-xs font-medium text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {point.value.toLocaleString()}
                </span>
              </div>
              <div
                className={`w-full max-w-[32px] ${barColor} ${barHoverColor} rounded-t-md transition-all duration-200 min-h-[4px]`}
                style={{ height: `${Math.max(heightPercent, 3)}%` }}
                title={`${formatLabel(point.date)}: ${point.value}`}
              />
              {data.length <= 14 && (
                <span className="text-[10px] text-gray-400 mt-1.5 truncate max-w-full">
                  {formatLabel(point.date)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {data.length > 14 && (
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-gray-400">{formatLabel(data[0].date)}</span>
          <span className="text-[10px] text-gray-400">{formatLabel(data[data.length - 1].date)}</span>
        </div>
      )}
    </div>
  );
};

const OverviewCharts: React.FC<OverviewChartsProps> = ({
  viewsTrend,
  inquiriesTrend,
}) => {
  const { t } = useTranslation(['agencyDashboard']);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <BarChartSection
          title={t('agencyDashboard:overview.viewsTrend', 'Views Trend')}
          data={viewsTrend}
          barColor="bg-purple-400"
          barHoverColor="hover:bg-purple-500"
        />
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <BarChartSection
          title={t('agencyDashboard:overview.inquiriesTrend', 'Inquiries Trend')}
          data={inquiriesTrend}
          barColor="bg-amber-400"
          barHoverColor="hover:bg-amber-500"
        />
      </div>
    </div>
  );
};

export default OverviewCharts;
