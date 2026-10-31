import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Unlink } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { DashboardUnit } from '../../../types';

interface LinkedUnitRowProps {
  unit: DashboardUnit;
  canAttach: boolean;
  canDetach: boolean;
  isDetaching: boolean;
  onAttach: (unit: DashboardUnit) => void;
  onDetach: (unit: DashboardUnit, listing: { id: string; title: string }) => void;
}

/** One unit with its linked listings: detach each, attach another. */
export const LinkedUnitRow: React.FC<LinkedUnitRowProps> = ({ unit: u, canAttach, canDetach, isDetaching, onAttach, onDetach }) => {
  const { t } = useTranslation('developments');
  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
      <div className="min-w-[8rem]">
        <p className="font-medium text-slate-900">{u.unitNumber}</p>
        <p className="text-xs text-slate-500">{u.buildingName || '—'} · {u.floorLabel || '—'}</p>
      </div>
      <ul className="flex-1 space-y-1">
        {(u.linkedListings ?? []).length === 0 && <li className="text-sm text-slate-400">{t('manage.listings.none', 'No linked listing')}</li>}
        {(u.linkedListings ?? []).map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1 text-sm">
            <span className="min-w-0 truncate text-slate-800">
              {l.title || l.id} <span className="text-xs text-slate-500">· {t(`inventory.listingStatus.${l.status}`, l.status)}</span>
            </span>
            {canDetach && (
              <Button type="button" size="sm" variant="ghost" disabled={isDetaching} onClick={() => onDetach(u, l)} aria-label={t('manage.listings.detachAria', 'Detach {{title}}', { title: l.title || l.id })}>
                <Unlink className="mr-1 h-4 w-4" aria-hidden="true" />
                {t('attach.detach', 'Detach')}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {canAttach && (
        <Button type="button" size="sm" variant="outline" onClick={() => onAttach(u)} className="min-h-[44px] sm:min-h-[36px]">
          <Link2 className="mr-1 h-4 w-4" aria-hidden="true" />
          {t('attach.title', 'Attach existing listing')}
        </Button>
      )}
    </li>
  );
};
