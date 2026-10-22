import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Search, X } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { AVAILABILITY_ORDER } from '../../../utils/availability';
import type { InventoryFilters } from '../../../hooks/useInventoryQuery';
import type { DevelopmentBuilding, DevelopmentFloor } from '../../../types';

interface InventoryToolbarProps {
  filters: InventoryFilters;
  setFilter: <K extends keyof InventoryFilters>(key: K, value: InventoryFilters[K]) => void;
  resetFilters: () => void;
  hasFilters: boolean;
  buildings: DevelopmentBuilding[];
  floors: DevelopmentFloor[];
  onExport: () => void;
  isExporting: boolean;
}

const selectClass =
  'min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[40px]';

/** Search, filters and CSV export above the inventory table. */
export const InventoryToolbar: React.FC<InventoryToolbarProps> = ({
  filters,
  setFilter,
  resetFilters,
  hasFilters,
  buildings,
  floors,
  onExport,
  isExporting,
}) => {
  const { t } = useTranslation('developments');
  const floorOptions = filters.buildingId ? floors.filter((f) => f.buildingId === filters.buildingId) : floors;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder={t('inventory.searchPlaceholder', 'Search by unit number')}
            aria-label={t('inventory.search', 'Search units')}
            className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-[40px]"
          />
        </div>
        <Button type="button" variant="outline" onClick={onExport} disabled={isExporting} className="min-h-[44px] sm:min-h-[40px]">
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          {isExporting ? t('inventory.exporting', 'Exporting…') : t('inventory.exportCsv', 'Export CSV')}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <select
          aria-label={t('inventory.filters.building', 'Building')}
          value={filters.buildingId}
          onChange={(e) => setFilter('buildingId', e.target.value)}
          className={selectClass}
        >
          <option value="">{t('inventory.filters.allBuildings', 'All buildings')}</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          aria-label={t('inventory.filters.floor', 'Floor')}
          value={filters.floorId}
          onChange={(e) => setFilter('floorId', e.target.value)}
          className={selectClass}
        >
          <option value="">{t('inventory.filters.allFloors', 'All floors')}</option>
          {floorOptions.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <select
          aria-label={t('inventory.filters.availability', 'Availability')}
          value={filters.availability}
          onChange={(e) => setFilter('availability', e.target.value as InventoryFilters['availability'])}
          className={selectClass}
        >
          <option value="">{t('inventory.filters.anyAvailability', 'Any availability')}</option>
          {AVAILABILITY_ORDER.map((s) => (
            <option key={s} value={s}>{t(`availability.${s}`)}</option>
          ))}
        </select>
        <select
          aria-label={t('inventory.filters.visibility', 'Visibility')}
          value={filters.visibility}
          onChange={(e) => setFilter('visibility', e.target.value as InventoryFilters['visibility'])}
          className={selectClass}
        >
          <option value="">{t('inventory.filters.anyVisibility', 'Any visibility')}</option>
          <option value="public">{t('inventory.visibility.public', 'Public')}</option>
          <option value="hidden">{t('inventory.visibility.hidden', 'Hidden')}</option>
        </select>
        {hasFilters && (
          <Button type="button" variant="ghost" onClick={resetFilters} className="col-span-2 min-h-[44px] lg:col-span-1 sm:min-h-[40px]">
            <X className="mr-1 h-4 w-4" aria-hidden="true" />
            {t('inventory.filters.clear', 'Clear filters')}
          </Button>
        )}
      </div>
    </div>
  );
};
