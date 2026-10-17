import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PublicUnit, UnitAvailability } from '../../types';

interface AvailabilityBarProps {
  units: PublicUnit[];
}

/** Segment colours, aligned with the scene viewer's availability tints. */
const SEGMENTS: { key: UnitAvailability; color: string }[] = [
  { key: 'available', color: '#22c55e' },
  { key: 'reserved', color: '#f59e0b' },
  { key: 'sold', color: '#71717a' },
  { key: 'rented', color: '#3b82f6' },
];

/**
 * A single stacked bar showing how the inventory breaks down by availability,
 * with a labelled legend of counts — the at-a-glance "how much is left" a buyer
 * scans a premium development page for. Renders nothing without units.
 */
export const AvailabilityBar: React.FC<AvailabilityBarProps> = ({ units }) => {
  const { t } = useTranslation('developments');

  const { counts, total } = useMemo(() => {
    const c: Partial<Record<UnitAvailability, number>> = {};
    for (const u of units) c[u.availability] = (c[u.availability] ?? 0) + 1;
    return { counts: c, total: units.length };
  }, [units]);

  if (total === 0) return null;

  const present = SEGMENTS.filter((s) => (counts[s.key] ?? 0) > 0);

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={t('units.heading')}>
        {present.map((s) => {
          const pct = ((counts[s.key] ?? 0) / total) * 100;
          return (
            <span
              key={s.key}
              className="h-full"
              style={{ width: `${pct}%`, backgroundColor: s.color }}
              title={`${t(`availability.${s.key}`)}: ${counts[s.key]}`}
            />
          );
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {present.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden="true" />
            <span className="font-medium text-foreground">{counts[s.key]}</span>
            {t(`availability.${s.key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
};
