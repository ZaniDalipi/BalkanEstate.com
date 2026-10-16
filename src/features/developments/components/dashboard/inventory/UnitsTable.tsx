import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { EmptyState } from '../../shared/States';
import { useInventoryMutations } from '../../../hooks';
import { UNIT_AVAILABILITY_STATES, type DevelopmentUnit, type UnitAvailability } from '../../../types';
import { formatPrice } from '../../../utils/format';

interface UnitsTableProps {
  developmentId: string;
  units: DevelopmentUnit[];
  onAttach: (unit: DevelopmentUnit) => void;
}

/**
 * Owner units table with inline availability editing. Changing the dropdown
 * writes immediately through the availability mutation (optimistic refresh via
 * cache invalidation). For thousands of units this should be virtualized and
 * paginated; the row markup stays the same.
 */
export const UnitsTable: React.FC<UnitsTableProps> = ({ developmentId, units, onAttach }) => {
  const { t } = useTranslation('developments');
  const { setAvailability } = useInventoryMutations(developmentId);

  if (units.length === 0) {
    return <EmptyState title={t('unit.none')} />;
  }

  const onAvailabilityChange = (unitId: string, availability: UnitAvailability) => {
    setAvailability({ unitId, availability }).catch(() => {
      /* surfaced by the mutation's error state; the cache keeps the prior value */
    });
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">{t('unit.number')}</th>
            <th scope="col" className="px-4 py-2 font-medium">{t('unit.type')}</th>
            <th scope="col" className="px-4 py-2 font-medium">{t('unit.price')}</th>
            <th scope="col" className="px-4 py-2 font-medium">{t('unit.availability')}</th>
            <th scope="col" className="px-4 py-2 font-medium">{t('detail.listings')}</th>
            <th scope="col" className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {units.map((u) => (
            <tr key={u.id} className="hover:bg-muted/30">
              <td className="px-4 py-2 font-medium text-foreground">{u.unitNumber}</td>
              <td className="px-4 py-2 text-muted-foreground">{u.unitType}</td>
              <td className="px-4 py-2 text-muted-foreground">
                {u.price ? formatPrice(u.price, u.currency) : '—'}
              </td>
              <td className="px-4 py-2">
                <select
                  value={u.availability}
                  onChange={(e) => onAvailabilityChange(u.id, e.target.value as UnitAvailability)}
                  aria-label={t('unit.availability')}
                  className="min-h-[34px] rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {UNIT_AVAILABILITY_STATES.map((s) => (
                    <option key={s} value={s}>
                      {t(`availability.${s}`)}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {t('unit.listings', { count: u.listingIds?.length ?? 0 })}
              </td>
              <td className="px-4 py-2 text-right">
                <Button type="button" size="sm" variant="outline" onClick={() => onAttach(u)}>
                  {t('attach.title')}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
