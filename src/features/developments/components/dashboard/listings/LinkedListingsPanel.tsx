import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Search, Unlink } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/ui/button';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { developmentKeys } from '../../../api/developmentKeys';
import { useListingAttachment } from '../../../hooks/useDevelopmentMutations';
import { useInventoryQuery } from '../../../hooks/useInventoryQuery';
import { EmptyState, ErrorState, LoadingState } from '../../shared/States';
import { InventoryPagination } from '../inventory/InventoryPagination';
import { roleCan } from '../inventory/permissions';
import type { DashboardUnit } from '../../../types';
import { AttachListingDialog } from './AttachListingDialog';

interface LinkedListingsPanelProps {
  developmentId: string;
  role?: string;
}

/** Every unit with the listings attached to it; attach (picker dialog) and detach per unit. */
export const LinkedListingsPanel: React.FC<LinkedListingsPanelProps> = ({ developmentId, role }) => {
  const { t } = useTranslation('developments');
  const qc = useQueryClient();
  const { confirm } = useConfirmation();
  const notify = useNotification();
  const inv = useInventoryQuery(developmentId);
  const { detach, isDetaching } = useListingAttachment(developmentId);
  const [attachTo, setAttachTo] = useState<DashboardUnit | null>(null);
  const canAttach = roleCan(role, 'listing.attach');
  const canDetach = roleCan(role, 'listing.detach');

  const onDetach = async (unit: DashboardUnit, listing: { id: string; title: string }) => {
    const ok = await confirm({
      title: t('manage.listings.detachTitle', 'Detach listing?'),
      message: t('manage.listings.detachMessage', '“{{title}}” will no longer be linked to unit {{number}}. The listing itself is not changed.', {
        title: listing.title || listing.id,
        number: unit.unitNumber,
      }),
      confirmLabel: t('attach.detach', 'Detach'),
      cancelLabel: t('wizard.cancel', 'Cancel'),
      type: 'warning',
    });
    if (!ok) return;
    try {
      await detach({ unitId: unit.id, listingId: listing.id });
      qc.invalidateQueries({ queryKey: developmentKeys.public() });
      void notify.success(t('attach.detached', 'Listing detached.'), t('manage.listings.detachedFrom', 'Removed from unit {{number}}.', { number: unit.unitNumber }));
    } catch (err) {
      void notify.error(t('errors.updateFailed', 'Could not save your changes.'), (err as { message?: string })?.message || t('errors.generic'));
    }
  };

  const linkedCount = inv.units.filter((u) => (u.linkedListings ?? []).length > 0).length;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          value={inv.filters.search}
          onChange={(e) => inv.setFilter('search', e.target.value)}
          placeholder={t('inventory.searchPlaceholder', 'Search by unit number')}
          aria-label={t('inventory.search', 'Search units')}
          className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      {inv.isLoading ? (
        <LoadingState rows={4} />
      ) : inv.error && inv.units.length === 0 ? (
        <ErrorState message={t('inventory.loadFailed', 'Could not load units.')} onRetry={() => inv.refetch()} retryLabel={t('inventory.retry', 'Retry')} />
      ) : inv.units.length === 0 ? (
        <EmptyState title={t('unit.none', 'No units yet.')} />
      ) : (
        <>
          <p className="text-sm text-slate-600">
            {t('manage.listings.summary', '{{linked}} of {{count}} units on this page have a linked listing.', { linked: linkedCount, count: inv.units.length })}
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {inv.units.map((u) => (
              <li key={u.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start">
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
                  <Button type="button" size="sm" variant="outline" onClick={() => setAttachTo(u)} className="min-h-[44px] sm:min-h-[36px]">
                    <Link2 className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t('attach.title', 'Attach existing listing')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <InventoryPagination total={inv.total} limit={inv.limit} skip={inv.skip} onLimit={inv.setLimit} onSkip={inv.setSkip} isFetching={inv.isFetching} />
        </>
      )}
      {attachTo && <AttachListingDialog key={attachTo.id} developmentId={developmentId} unit={attachTo} onClose={() => setAttachTo(null)} />}
    </div>
  );
};
