import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { PublicUnit } from '../../types';
import { EMPTY_CRITERIA, hasActiveCriteria, toggleIn, type UnitCriteria } from '../../utils/unitFilters';
import { formatPrice } from '../../utils/format';
import { ChipGroup } from './explorer/filters/ChipGroup';
import { RangeFilter } from './explorer/filters/RangeFilter';
import { useFilterOptions } from './explorer/filters/useFilterOptions';

interface UnitFiltersProps {
  units: PublicUnit[];
  criteria: UnitCriteria;
  onChange: (next: UnitCriteria) => void;
  /** How many units currently match (shown as a live count). */
  matchCount: number;
  /** Start with the secondary filters open. */
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * Buyer-facing filter panel shared by the explorer and the unit grid —
 * bedrooms, area, floors and apartment type up front (the East Gate B2 row);
 * baths, price, availability, orientation and apartment flags behind
 * "More filters". Pure presentational: options come from the loaded units and
 * a new criteria object is reported up (URL sync lives in useExplorerUrlState).
 */
export const UnitFilters: React.FC<UnitFiltersProps> = ({
  units,
  criteria,
  onChange,
  matchCount,
  defaultExpanded = false,
  className,
}) => {
  const { t } = useTranslation('developments');
  const o = useFilterOptions(units);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const active = hasActiveCriteria(criteria);
  const b = o.bounds;
  const min = t('explorer.filters.min', 'minimum');
  const max = t('explorer.filters.max', 'maximum');
  const currency = units.find((u) => u.currency)?.currency ?? 'EUR';

  const hasPrimary = o.beds.length > 0 || b.areaMin != null || b.levelMin != null || o.flags.length > 0;
  const hasMore = o.baths.length > 0 || b.priceMin != null || o.availability.length > 1 || o.types.length > 1 || o.orientations.length > 0 || o.features.length > 0;
  if (!hasPrimary && !hasMore) return null;

  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
          {t('filters.heading', 'Find your home')}
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500" aria-live="polite">
            {t('filters.matchCount', { count: matchCount, defaultValue: '{{count}} homes' })}
          </span>
          {active && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_CRITERIA)}
              className="inline-flex min-h-[44px] items-center gap-1 text-xs font-medium text-primary hover:underline sm:min-h-0"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t('filters.clear', 'Clear filters')}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <ChipGroup label={t('filters.bedrooms', 'Bedrooms')} options={o.beds} selected={criteria.beds} onToggle={(v) => onChange(toggleIn(criteria, 'beds', v))} />
        <RangeFilter label={t('filters.area', 'Area')} unit="m²" boundMin={b.areaMin} boundMax={b.areaMax} valueMin={criteria.minArea} valueMax={criteria.maxArea} minLabel={min} maxLabel={max} onChange={(lo, hi) => onChange({ ...criteria, minArea: lo, maxArea: hi })} />
        <RangeFilter label={t('filters.floors', 'Floors')} boundMin={b.levelMin} boundMax={b.levelMax} valueMin={criteria.minLevel} valueMax={criteria.maxLevel} minLabel={min} maxLabel={max} onChange={(lo, hi) => onChange({ ...criteria, minLevel: lo, maxLevel: hi })} />
        <ChipGroup label={t('filters.apartmentType', 'Apartment type')} options={o.flags} selected={criteria.flags ?? []} onToggle={(v) => onChange(toggleIn(criteria, 'flags', v))} />
      </div>

      {hasMore && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-primary"
          >
            {expanded ? t('explorer.filters.less', 'Fewer filters') : t('explorer.filters.more', 'More filters')}
            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
          </button>
          {expanded && (
            <div className="mt-2 flex flex-wrap items-start gap-x-8 gap-y-4 border-t border-slate-100 pt-4">
              <ChipGroup label={t('explorer.filters.baths', 'Bathrooms')} options={o.baths} selected={criteria.baths ?? []} onToggle={(v) => onChange(toggleIn(criteria, 'baths', v))} />
              <RangeFilter label={t('explorer.filters.price', 'Price')} boundMin={b.priceMin} boundMax={b.priceMax} valueMin={criteria.minPrice} valueMax={criteria.maxPrice} step={o.priceStep} format={(v) => formatPrice(v, currency)} minLabel={min} maxLabel={max} onChange={(lo, hi) => onChange({ ...criteria, minPrice: lo, maxPrice: hi })} />
              {o.availability.length > 1 && (
                <ChipGroup label={t('explorer.filters.availability', 'Availability')} options={o.availability} selected={criteria.availability ?? []} onToggle={(v) => onChange(toggleIn(criteria, 'availability', v))} />
              )}
              {o.types.length > 1 && (
                <ChipGroup label={t('explorer.filters.unitType', 'Unit type')} options={o.types} selected={criteria.types} onToggle={(v) => onChange(toggleIn(criteria, 'types', v))} />
              )}
              <ChipGroup label={t('explorer.filters.orientation', 'Orientation')} options={o.orientations} selected={criteria.orientations ?? []} onToggle={(v) => onChange(toggleIn(criteria, 'orientations', v))} />
              <ChipGroup label={t('explorer.filters.features', 'Features')} options={o.features} selected={criteria.features} onToggle={(v) => onChange(toggleIn(criteria, 'features', v))} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
