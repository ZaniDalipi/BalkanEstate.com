import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgencyProperties, useAgencyAgents, useBulkPropertyAction } from '../../hooks';
import type { PropertyFilters } from '../../types';
import PropertyTable from './PropertyTable';
import PropertyFiltersBar from './PropertyFilters';

interface PropertyManagementSectionProps {
  agencyId: string;
}

const DEFAULT_LIMIT = 10;

const PropertyManagementSection: React.FC<PropertyManagementSectionProps> = ({ agencyId }) => {
  const { t } = useTranslation(['agencyDashboard', 'common']);
  const [filters, setFilters] = useState<PropertyFilters>({ page: 1, limit: DEFAULT_LIMIT });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { properties, total, isLoading } = useAgencyProperties(agencyId, filters);
  const { agents } = useAgencyAgents(agencyId);
  const { bulkPropertyAction, isLoading: isBulkLoading } = useBulkPropertyAction(agencyId);

  const agentOptions = agents.map((a) => ({ id: a.userId, name: a.name }));

  const handleFiltersChange = useCallback((updated: PropertyFilters) => {
    setFilters({ ...updated, page: 1, limit: filters.limit });
    setSelectedIds([]);
  }, [filters.limit]);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    setSelectedIds([]);
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => (prev.length === ids.length ? [] : ids));
  }, []);

  const handleBulkAction = useCallback(async (action: 'promote' | 'deactivate') => {
    if (selectedIds.length === 0) return;
    try {
      await bulkPropertyAction({ action, propertyIds: selectedIds });
      setSelectedIds([]);
    } catch {
      // Error handled by mutation hook
    }
  }, [selectedIds, bulkPropertyAction]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {t('agencyDashboard:properties.title', 'Property Management')}
        </h2>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {t('agencyDashboard:properties.selected', '{{count}} selected', { count: selectedIds.length })}
            </span>
            <button
              onClick={() => handleBulkAction('promote')}
              disabled={isBulkLoading}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {t('agencyDashboard:properties.promote', 'Promote')}
            </button>
            <button
              onClick={() => handleBulkAction('deactivate')}
              disabled={isBulkLoading}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {t('agencyDashboard:properties.deactivate', 'Deactivate')}
            </button>
          </div>
        )}
      </div>

      <PropertyFiltersBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        agents={agentOptions}
      />

      <PropertyTable
        properties={properties}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        total={total}
        page={filters.page ?? 1}
        limit={filters.limit ?? DEFAULT_LIMIT}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default PropertyManagementSection;
