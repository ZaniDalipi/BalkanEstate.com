import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyAnalytics } from '../../hooks';
import { exportAnalyticsCsv } from '../../api/agencyDashboardApi';
import { ArrowDownTrayIcon } from '@/constants';
import TimeSeriesChart from './TimeSeriesChart';
import AgentComparisonChart from './AgentComparisonChart';

type AnalyticsRange = '7d' | '30d' | '90d' | '1y';

interface AnalyticsReportsSectionProps {
  agencyId: string;
}

const RANGE_OPTIONS: { value: AnalyticsRange; labelKey: string; fallback: string }[] = [
  { value: '7d', labelKey: 'agencyDashboard:analytics.range7d', fallback: '7 Days' },
  { value: '30d', labelKey: 'agencyDashboard:analytics.range30d', fallback: '30 Days' },
  { value: '90d', labelKey: 'agencyDashboard:analytics.range90d', fallback: '90 Days' },
  { value: '1y', labelKey: 'agencyDashboard:analytics.range1y', fallback: '1 Year' },
];

const AnalyticsReportsSection: React.FC<AnalyticsReportsSectionProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard', 'common']);
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [isExporting, setIsExporting] = useState(false);

  const { analytics, isLoading } = useAgencyAnalytics(agencyId, range);

  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await exportAnalyticsCsv(agencyId, range);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${agencyId}-${range}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Export failed silently; user can retry
    } finally {
      setIsExporting(false);
    }
  }, [agencyId, range]);

  const agentChartData = (analytics?.agentComparison ?? []).map((agent) => ({
    name: agent.agentName,
    listings: agent.listings,
    inquiries: agent.inquiries,
    views: agent.views,
  }));

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('agencyDashboard:analytics.title', 'Analytics & Reports')}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setRange(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  range === option.value
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t(option.labelKey, option.fallback)}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCsv}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {isExporting
              ? t('agencyDashboard:analytics.exporting', 'Exporting...')
              : t('agencyDashboard:analytics.exportCsv', 'Export CSV')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeSeriesChart
          title={t('agencyDashboard:analytics.views', 'Views')}
          data={analytics?.viewsOverTime ?? []}
          color="#6366f1"
          isLoading={isLoading}
        />
        <TimeSeriesChart
          title={t('agencyDashboard:analytics.inquiries', 'Inquiries')}
          data={analytics?.inquiriesOverTime ?? []}
          color="#06b6d4"
          isLoading={isLoading}
        />
      </div>

      <AgentComparisonChart agents={agentChartData} isLoading={isLoading} />
    </section>
  );
};

export default AnalyticsReportsSection;
