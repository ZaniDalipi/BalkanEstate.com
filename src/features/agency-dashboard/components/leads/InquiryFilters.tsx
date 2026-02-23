import React from 'react';
import { useTranslation } from 'react-i18next';
import type { InquiryFilters as InquiryFiltersType } from '../../types';

interface InquiryFiltersProps {
  filters: InquiryFiltersType;
  onFiltersChange: (filters: InquiryFiltersType) => void;
  agents: { id: string; name: string }[];
}

const STATUS_OPTIONS = [
  { value: '', labelKey: 'leads.statusAll', fallback: 'All Statuses' },
  { value: 'new', labelKey: 'leads.statusNew', fallback: 'New' },
  { value: 'in-progress', labelKey: 'leads.statusInProgress', fallback: 'In Progress' },
  { value: 'responded', labelKey: 'leads.statusResponded', fallback: 'Responded' },
  { value: 'closed', labelKey: 'leads.statusClosed', fallback: 'Closed' },
] as const;

const DATE_OPTIONS = [
  { value: '', labelKey: 'leads.dateAll', fallback: 'All Time' },
  { value: '7', labelKey: 'leads.date7', fallback: 'Last 7 days' },
  { value: '30', labelKey: 'leads.date30', fallback: 'Last 30 days' },
  { value: '90', labelKey: 'leads.date90', fallback: 'Last 90 days' },
] as const;

function getDateFrom(days: string): string | undefined {
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - Number(days));
  return d.toISOString().split('T')[0];
}

const selectClasses =
  'px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[140px]';

const InquiryFilters: React.FC<InquiryFiltersProps> = ({ filters, onFiltersChange, agents }) => {
  const { t } = useTranslation(['agencyDashboard']);

  const handleChange = (key: string, value: string) => {
    if (key === 'dateRange') {
      onFiltersChange({ ...filters, dateFrom: getDateFrom(value), dateTo: undefined });
    } else {
      onFiltersChange({ ...filters, [key]: value || undefined });
    }
  };

  const currentDateRange = filters.dateFrom
    ? DATE_OPTIONS.find((o) => getDateFrom(o.value) === filters.dateFrom)?.value ?? ''
    : '';

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
      <select
        value={filters.status ?? ''}
        onChange={(e) => handleChange('status', e.target.value)}
        className={selectClasses}
        aria-label={t('agencyDashboard:leads.filterStatus', 'Filter by status')}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(`agencyDashboard:${opt.labelKey}`, opt.fallback)}
          </option>
        ))}
      </select>

      <select
        value={filters.agentId ?? ''}
        onChange={(e) => handleChange('agentId', e.target.value)}
        className={selectClasses}
        aria-label={t('agencyDashboard:leads.filterAgent', 'Filter by agent')}
      >
        <option value="">{t('agencyDashboard:leads.agentAll', 'All Agents')}</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>{agent.name}</option>
        ))}
      </select>

      <select
        value={currentDateRange}
        onChange={(e) => handleChange('dateRange', e.target.value)}
        className={selectClasses}
        aria-label={t('agencyDashboard:leads.filterDate', 'Filter by date')}
      >
        {DATE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(`agencyDashboard:${opt.labelKey}`, opt.fallback)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default InquiryFilters;
