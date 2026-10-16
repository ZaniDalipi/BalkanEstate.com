import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/src/components/ui/button';
import { AvailabilityBadge } from '../../shared/Badges';
import { EmptyState } from '../../shared/States';
import type { DevelopmentUnit } from '../../../types';

interface UnitsTableProps {
  units: DevelopmentUnit[];
  onAttach: (unit: DevelopmentUnit) => void;
}

/**
 * Lightweight, accessible units table. For a development with thousands of
 * units this should be virtualized (react-window) and paginated — wired via the
 * units query's limit/skip; this presentational component stays unchanged.
 */
export const UnitsTable: React.FC<UnitsTableProps> = ({ units, onAttach }) => {
  const { t } = useTranslation('developments');

  if (units.length === 0) {
    return <EmptyState title={t('unit.none')} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">{t('unit.number')}</th>
            <th scope="col" className="px-4 py-2 font-medium">{t('unit.type')}</th>
            <th scope="col" className="px-4 py-2 font-medium">{t('unit.availability')}</th>
            <th scope="col" className="px-4 py-2 font-medium">{t('detail.listings')}</th>
            <th scope="col" className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {units.map((u) => (
            <tr key={u._id} className="hover:bg-muted/30">
              <td className="px-4 py-2 font-medium text-foreground">{u.unitNumber}</td>
              <td className="px-4 py-2 text-muted-foreground">{u.unitType}</td>
              <td className="px-4 py-2">
                <AvailabilityBadge state={u.availability} />
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
