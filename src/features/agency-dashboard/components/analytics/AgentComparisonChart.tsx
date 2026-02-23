import React from 'react';
import { useTranslation } from 'react-i18next';

interface AgentComparisonData {
  name: string;
  listings: number;
  inquiries: number;
  views: number;
}

interface AgentComparisonChartProps {
  agents: AgentComparisonData[];
  isLoading: boolean;
}

const METRICS = [
  { key: 'listings' as const, color: '#22c55e', labelKey: 'agencyDashboard:analytics.listings', fallback: 'Listings' },
  { key: 'inquiries' as const, color: '#3b82f6', labelKey: 'agencyDashboard:analytics.inquiriesLabel', fallback: 'Inquiries' },
  { key: 'views' as const, color: '#a855f7', labelKey: 'agencyDashboard:analytics.viewsLabel', fallback: 'Views' },
];

const AgentComparisonChart: React.FC<AgentComparisonChartProps> = ({ agents, isLoading }) => {
  const { t } = useTranslation(['agencyDashboard']);

  const maxValue = agents.length > 0
    ? Math.max(...agents.flatMap((a) => [a.listings, a.inquiries, a.views]), 1)
    : 1;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="flex gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-5 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('agencyDashboard:analytics.agentComparison', 'Agent Comparison')}
        </h3>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-sm font-medium">
            {t('agencyDashboard:analytics.noAgents', 'No agent data available')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('agencyDashboard:analytics.agentComparison', 'Agent Comparison')}
      </h3>

      <div className="flex flex-wrap gap-4 mb-6">
        {METRICS.map((metric) => (
          <div key={metric.key} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: metric.color }} />
            <span className="text-sm text-gray-600 font-medium">{t(metric.labelKey, metric.fallback)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-5">
        {agents.map((agent) => (
          <div key={agent.name}>
            <p className="text-sm font-semibold text-gray-800 mb-2">{agent.name}</p>
            <div className="space-y-1.5">
              {METRICS.map((metric) => {
                const value = agent[metric.key];
                const widthPercent = (value / maxValue) * 100;
                return (
                  <div key={metric.key} className="flex items-center gap-2">
                    <div className="flex-1 h-5 bg-gray-50 rounded overflow-hidden relative">
                      <div
                        className="h-full rounded transition-all duration-500 ease-out"
                        style={{ width: `${widthPercent}%`, backgroundColor: metric.color }}
                      />
                    </div>
                    <span className="w-12 text-xs text-gray-600 text-right font-medium tabular-nums">
                      {value.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgentComparisonChart;
