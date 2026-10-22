import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicUnit } from '../../types';
import { AVAILABILITY_META, countByAvailability } from '../../utils/availability';
import { useAvailabilityLabel } from '../shared/Badges';

interface AvailabilityBarProps {
  units: PublicUnit[];
}

/**
 * A single stacked bar showing how the inventory breaks down by EFFECTIVE
 * availability — every state, including "Coming soon" (not_released) and
 * unavailable — with a labelled legend of counts. Colours come from
 * utils/availability so the bar matches the explorer polygons exactly.
 */
export const AvailabilityBar: React.FC<AvailabilityBarProps> = ({ units }) => {
  const { t } = useTranslation('developments');
  const label = useAvailabilityLabel();
  const counts = useMemo(() => countByAvailability(units), [units]);
  const total = units.length;
  if (total === 0) return null;

  const summary = counts.map((c) => `${label(c.state)}: ${c.count}`).join(', ');

  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${t('units.availabilityHeading', 'Availability')} — ${summary}`}
      >
        {counts.map((c) => (
          <span
            key={c.state}
            className="h-full"
            style={{ width: `${(c.count / total) * 100}%`, backgroundColor: AVAILABILITY_META[c.state].color }}
            title={`${label(c.state)}: ${c.count}`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
        {counts.map((c) => (
          <li key={c.state} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${AVAILABILITY_META[c.state].dotClass}`} aria-hidden="true" />
            <span className="font-medium text-slate-900">{c.count}</span>
            {label(c.state)}
          </li>
        ))}
      </ul>
    </div>
  );
};
