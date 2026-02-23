import React from 'react';
import { useTranslation } from 'react-i18next';
import type { PropertyFilters as PropertyFiltersType } from '../../types';

interface PropertyFiltersProps {
  filters: PropertyFiltersType;
  onFiltersChange: (filters: PropertyFiltersType) => void;
  agents: { id: string; name: string }[];
}

const STATUS_OPTIONS = [
  { value: '', labelKey: 'properties.statusAll', fallback: 'All Statuses' },
  { value: 'active', labelKey: 'properties.statusActive', fallback: 'Active' },
  { value: 'sold', labelKey: 'properties.statusSold', fallback: 'Sold' },
  { value: 'rented', labelKey: 'properties.statusRented', fallback: 'Rented' },
  { value: 'pending', labelKey: 'properties.statusPending', fallback: 'Pending' },
  { value: 'draft', labelKey: 'properties.statusDraft', fallback: 'Draft' },
] as const;

const TYPE_OPTIONS = [
  { value: '', labelKey: 'properties.typeAll', fallback: 'All Types' },
  { value: 'apartment', labelKey: 'properties.typeApartment', fallback: 'Apartment' },
  { value: 'house', labelKey: 'properties.typeHouse', fallback: 'House' },
  { value: 'land', labelKey: 'properties.typeLand', fallback: 'Land' },
  { value: 'villa', labelKey: 'properties.typeVilla', fallback: 'Villa' },
  { value: 'other', labelKey: 'properties.typeOther', fallback: 'Other' },
] as const;

const DATE_OPTIONS = [
  { value: '', labelKey: 'properties.dateAll', fallback: 'All Time' },
  { value: '7', labelKey: 'properties.date7', fallback: 'Last 7 days' },
  { value: '30', labelKey: 'properties.date30', fallback: 'Last 30 days' },
  { value: '90', labelKey: 'properties.date90', fallback: 'Last 90 days' },
] as const;

function getDateFrom(days: string): string | undefined {
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - Number(days));
  return d.toISOString().split('T')[0];
}

const selectClasses =
  'px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[140px]';

const PropertyFilters: React.FC<PropertyFiltersProps> = ({ filters, onFiltersChange, agents }) => {
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
        aria-label={t('agencyDashboard:properties.filterStatus', 'Filter by status')}
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
        aria-label={t('agencyDashboard:properties.filterAgent', 'Filter by agent')}
      >
        <option value="">{t('agencyDashboard:properties.agentAll', 'All Agents')}</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>{agent.name}</option>
        ))}
      </select>

      <select
        value={filters.propertyType ?? ''}
        onChange={(e) => handleChange('propertyType', e.target.value)}
        className={selectClasses}
        aria-label={t('agencyDashboard:properties.filterType', 'Filter by type')}
      >
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(`agencyDashboard:${opt.labelKey}`, opt.fallback)}
          </option>
        ))}
      </select>

      <select
        value={currentDateRange}
        onChange={(e) => handleChange('dateRange', e.target.value)}
        className={selectClasses}
        aria-label={t('agencyDashboard:properties.filterDate', 'Filter by date')}
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

export default PropertyFilters;
