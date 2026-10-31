import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/src/lib/utils';
import type { DevelopmentFloor, PublicUnit } from '../../../types';
import { AVAILABILITY_META, rgba } from '../../../utils/availability';
import { useUnitText } from './useUnitText';
import { bundleIds } from '../../../utils/unitCompanions';

interface StackingPlanProps {
  floors: DevelopmentFloor[];
  units: PublicUnit[];
  /** Units matching active filters; undefined = no filters. */
  matchedIds?: Set<string>;
  onOpenUnit: (unitId: string) => void;
  /** The apartment open in the details sheet, picked out with a ring. */
  openUnitId?: string | null;
}

/**
 * A building's apartments floor by floor (top floor first) — shown when a
 * building has no published picture yet, so every building on the residence
 * picture can still be opened. Each apartment is a button tinted by its
 * availability; filtered-out apartments fade.
 */
export const StackingPlan: React.FC<StackingPlanProps> = ({ floors, units, matchedIds, onOpenUnit, openUnitId }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  // Hovering (or focusing) an apartment lights up its parking spot / storage room, and back.
  const [hovered, setHovered] = useState<string | null>(null);
  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const linked = useMemo(() => (hovered ? bundleIds(hovered, unitsById) : new Set<string>()), [hovered, unitsById]);
  const rows = useMemo(() => {
    const byFloor = new Map<string, PublicUnit[]>();
    for (const u of units) byFloor.set(u.floorId, [...(byFloor.get(u.floorId) ?? []), u]);
    return [...floors]
      .sort((a, b) => b.level - a.level)
      .map((f) => ({
        floor: f,
        units: (byFloor.get(f.id) ?? []).sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true })),
      }))
      .filter((r) => r.units.length > 0);
  }, [floors, units]);

  if (rows.length === 0) {
    return <p className="text-sm text-slate-300">{t('explorer.noUnitsInBuilding', 'No apartments are listed for this building yet.')}</p>;
  }

  return (
    <ol className="space-y-2" aria-label={t('explorer.stackingPlan', 'Apartments by floor')}>
      {rows.map(({ floor, units: list }) => (
        <li key={floor.id} className="flex items-stretch gap-3">
          <span className="flex w-20 shrink-0 items-center text-xs font-semibold uppercase tracking-wide text-slate-300 sm:w-28">
            {floor.label}
          </span>
          <div className="flex flex-1 flex-wrap gap-2">
            {list.map((u) => {
              const meta = AVAILABILITY_META[u.availability];
              const faded = matchedIds ? !matchedIds.has(u.id) : false;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onOpenUnit(u.id)}
                  data-unit-id={u.id}
                  data-linked={linked.has(u.id) ? 'true' : undefined}
                  onPointerEnter={() => setHovered(u.id)}
                  onPointerLeave={() => setHovered((cur) => (cur === u.id ? null : cur))}
                  onFocus={() => setHovered(u.id)}
                  onBlur={() => setHovered((cur) => (cur === u.id ? null : cur))}
                  aria-current={u.id === openUnitId ? 'true' : undefined}
                  aria-label={txt.ariaLabel(u)}
                  title={[txt.ariaLabel(u), txt.area(u), txt.price(u)].filter(Boolean).join(' · ')}
                  className={cn(
                    'min-h-[44px] min-w-[72px] rounded-lg border-l-4 px-3 py-1.5 text-left text-white transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                    faded && 'opacity-30',
                    u.id === openUnitId && 'ring-2 ring-teal-300 ring-offset-2 ring-offset-slate-900',
                    linked.has(u.id) && '-translate-y-0.5 opacity-100 outline-dashed outline-2 outline-offset-2 outline-teal-300'
                  )}
                  style={{ borderLeftColor: meta.color, backgroundColor: rgba(meta.color, 0.22) }}
                >
                  <span className="block text-sm font-bold leading-tight">{u.unitNumber}</span>
                  <span className="block text-[11px] leading-tight text-white/75">
                    {[typeof u.beds === 'number' ? txt.bedrooms(u.beds) : null, txt.area(u)].filter(Boolean).join(' · ')}
                  </span>
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ol>
  );
};
