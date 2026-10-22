import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicUnit } from '../../types';
import { AVAILABILITY_ORDER } from '../../utils/availability';
import { UnitCard } from './UnitCard';
import { EmptyState } from '../shared/States';

interface UnitsBrowserProps {
  /** Units already narrowed by the shared explorer filters. */
  units: PublicUnit[];
  slug: string;
  onOpenUnit?: (unitId: string) => void;
  /** Whether filters are narrowing `units` (changes the empty-state copy). */
  filtered?: boolean;
}

const PAGE = 24;

/**
 * Responsive grid of unit cards for the units the shared filters let
 * through (availability, beds, area… live in UnitFilters / the explorer, so
 * the grid and the facade always agree). Adds a building picker for
 * multi-building residences; pursuable units sort first.
 */
export const UnitsBrowser: React.FC<UnitsBrowserProps> = ({ units, slug, onOpenUnit, filtered }) => {
  const { t } = useTranslation('developments');
  const [building, setBuilding] = useState('all');
  const [limit, setLimit] = useState(PAGE);

  const buildingNames = useMemo(
    () => Array.from(new Set(units.map((u) => u.buildingName).filter((b): b is string => !!b))),
    [units]
  );

  const shown = useMemo(() => {
    const rank = (u: PublicUnit) => AVAILABILITY_ORDER.indexOf(u.availability);
    return units
      .filter((u) => building === 'all' || u.buildingName === building)
      .slice()
      .sort((a, b) => rank(a) - rank(b) || a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }));
  }, [units, building]);

  if (units.length === 0) {
    return <EmptyState title={filtered ? t('units.noneForFilter', 'No units match this filter.') : t('unit.none', 'No units yet.')} />;
  }

  return (
    <div>
      {buildingNames.length > 1 && (
        <div className="mb-4 flex justify-end">
          <select
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            className="min-h-[44px] rounded-full border border-slate-200 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={t('detail.buildings', 'Buildings')}
          >
            <option value="all">{t('units.allBuildings', 'All buildings')}</option>
            {buildingNames.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      )}

      {shown.length === 0 ? (
        <EmptyState title={t('units.noneForFilter', 'No units match this filter.')} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.slice(0, limit).map((u) => (
              <UnitCard key={u.id} unit={u} slug={slug} onOpen={onOpenUnit} />
            ))}
          </div>
          {shown.length > limit && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="min-h-[44px] rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-primary/50"
              >
                {t('explorer.showMore', { count: shown.length - limit, defaultValue: 'Show more ({{count}})' })}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
