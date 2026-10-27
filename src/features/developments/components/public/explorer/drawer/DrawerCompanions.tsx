import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Link2 } from 'lucide-react';
import type { UnitCompanion } from '../../../../types';
import { AvailabilityBadge } from '../../../shared/Badges';
import { useUnitText } from '../useUnitText';

interface DrawerCompanionsProps {
  companions: UnitCompanion[];
  /** Show that unit's own details (same drawer). */
  onOpen: (unitId: string) => void;
}

/**
 * In the apartment's details: the parking spots and storage rooms it comes
 * with (or, for a parking spot, the apartment it is sold with). Each one has
 * its own details, one tap away.
 */
export const DrawerCompanions: React.FC<DrawerCompanionsProps> = ({ companions, onOpen }) => {
  const { t } = useTranslation('developments');
  const txt = useUnitText();
  if (companions.length === 0) return null;
  const comesWith = companions.filter((c) => c.relation === 'comes_with');
  const soldWith = companions.filter((c) => c.relation === 'sold_with');

  const list = (heading: string, items: UnitCompanion[]) => (
    <section aria-label={heading}>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <Link2 className="h-4 w-4 text-teal-600" aria-hidden="true" />
        {heading}
      </h3>
      <ul className="space-y-2">
        {items.map(({ unit }) => (
          <li key={unit.id}>
            <button
              type="button"
              onClick={() => onOpen(unit.id)}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-dashed border-teal-400 bg-teal-50/50 px-3 py-2 text-left hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{txt.title(unit)}</span>
                <span className="block truncate text-xs text-slate-600">
                  {[unit.buildingName, unit.floorLabel, txt.area(unit), txt.price(unit)].filter(Boolean).join(' · ')}
                </span>
              </span>
              <AvailabilityBadge state={unit.availability} />
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="space-y-4">
      {comesWith.length > 0 && list(t('companions.comesWithHeading', 'Comes with'), comesWith)}
      {soldWith.length > 0 && list(t('companions.soldWithHeading', 'Sold together with'), soldWith)}
    </div>
  );
};
