import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Search } from 'lucide-react';
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
import { LinkedUnitRow } from './LinkedUnitRow';
import { UnitPickerDialog } from './UnitPickerDialog';
import { useApiErrorText } from '../../../hooks/useApiErrorText';

interface LinkedListingsPanelProps {
  developmentId: string;
  role?: string;
}

const LINKED_ONLY = { hasListing: true } as const;

/**
 * Units that have a linked listing (filtered and counted by the server), with
 * detach per listing. "Attach listing to a unit" picks any unit first.
 */
export const LinkedListingsPanel: React.FC<LinkedListingsPanelProps> = ({ developmentId, role }) => {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const qc = useQueryClient();
  const { confirm } = useConfirmation();
  const notify = useNotification();
  const inv = useInventoryQuery(developmentId, 'unitNumber', LINKED_ONLY);
  const { detach, isDetaching } = useListingAttachment(developmentId);
  const [picking, setPicking] = useState(false);
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
      void notify.error(t('errors.updateFailed', 'Could not save your changes.'), apiText.text(err));
    }
  };

  const attachButton = canAttach && (
    <Button type="button" onClick={() => setPicking(true)} className="min-h-[44px]">
      <Link2 className="mr-1 h-4 w-4" aria-hidden="true" />
      {t('manage.listings.attachToUnit', 'Attach listing to a unit')}
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={inv.filters.search}
            onChange={(e) => inv.setFilter('search', e.target.value)}
            placeholder={t('inventory.searchPlaceholder', 'Search by unit number')}
            aria-label={t('manage.listings.searchLinked', 'Search units with linked listings')}
            className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        {attachButton}
      </div>
      {inv.isLoading ? (
        <LoadingState rows={4} />
      ) : inv.error && inv.units.length === 0 ? (
        <ErrorState message={t('inventory.loadFailed', 'Could not load units.')} onRetry={() => inv.refetch()} retryLabel={t('inventory.retry', 'Retry')} />
      ) : inv.units.length === 0 ? (
        <EmptyState
          title={inv.hasFilters ? t('inventory.noMatches', 'No units match these filters.') : t('manage.listings.noneLinked', 'No unit has a linked listing yet.')}
          description={inv.hasFilters ? undefined : t('manage.listings.noneLinkedHint', 'Attach one of your listings to a unit so buyers can open it from the explorer.')}
        />
      ) : (
        <>
          <p className="text-sm text-slate-600">
            {t('manage.listings.linkedTotal', 'Units with a linked listing: {{n}}', { n: inv.total })}
          </p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {inv.units.map((u) => (
              <LinkedUnitRow key={u.id} unit={u} canAttach={canAttach} canDetach={canDetach} isDetaching={isDetaching} onAttach={setAttachTo} onDetach={onDetach} />
            ))}
          </ul>
          <InventoryPagination total={inv.total} limit={inv.limit} skip={inv.skip} onLimit={inv.setLimit} onSkip={inv.setSkip} isFetching={inv.isFetching} />
        </>
      )}
      {picking && (
        <UnitPickerDialog
          developmentId={developmentId}
          onClose={() => setPicking(false)}
          onPick={(u) => {
            setPicking(false);
            setAttachTo(u);
          }}
        />
      )}
      {attachTo && <AttachListingDialog key={attachTo.id} developmentId={developmentId} unit={attachTo} onClose={() => setAttachTo(null)} />}
    </div>
  );
};
