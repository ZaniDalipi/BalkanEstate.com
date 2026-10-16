import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { PublicUnit, UnitAvailability } from '../../types';
import { UnitCard } from './UnitCard';
import { EmptyState } from '../shared/States';

interface UnitsBrowserProps {
  units: PublicUnit[];
  slug: string;
}

type Filter = 'all' | UnitAvailability;

/**
 * Buyer-facing unit browser: availability filter chips plus an optional building
 * filter, over a responsive grid of unit cards. Available units are surfaced
 * first. Pure client-side filtering over the already-loaded units.
 */
export const UnitsBrowser: React.FC<UnitsBrowserProps> = ({ units, slug }) => {
  const { t } = useTranslation('developments');
  const [filter, setFilter] = useState<Filter>('all');
  const [building, setBuilding] = useState<string>('all');

  // Which availability states actually occur, to avoid dead chips.
  const presentStates = useMemo(() => {
    const set = new Set<UnitAvailability>();
    units.forEach((u) => set.add(u.availability));
    return set;
  }, [units]);

  const buildingNames = useMemo(() => {
    const set = new Set<string>();
    units.forEach((u) => u.buildingName && set.add(u.buildingName));
    return Array.from(set);
  }, [units]);

  const AVAILABILITY_ORDER: UnitAvailability[] = [
    'available',
    'reserved',
    'not_released',
    'sold',
    'rented',
    'unavailable',
  ];

  const filtered = useMemo(() => {
    const rank = (u: PublicUnit) => (u.availability === 'available' ? 0 : 1);
    return units
      .filter((u) => (filter === 'all' ? true : u.availability === filter))
      .filter((u) => (building === 'all' ? true : u.buildingName === building))
      .slice()
      .sort((a, b) => rank(a) - rank(b));
  }, [units, filter, building]);

  const chip = (value: Filter, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      aria-pressed={filter === value}
      className={cn(
        'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
        filter === value
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
      )}
    >
      {label}
    </button>
  );

  if (units.length === 0) {
    return <EmptyState title={t('unit.none')} />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {chip('all', t('units.filterAll'))}
        {AVAILABILITY_ORDER.filter((s) => presentStates.has(s)).map((s) =>
          chip(s, t(`availability.${s}`))
        )}

        {buildingNames.length > 1 && (
          <select
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            className="ml-auto min-h-[36px] rounded-full border border-border bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('detail.buildings')}
          >
            <option value="all">{t('units.allBuildings')}</option>
            {buildingNames.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t('units.noneForFilter')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <UnitCard key={u.id} unit={u} slug={slug} />
          ))}
        </div>
      )}
    </div>
  );
};
