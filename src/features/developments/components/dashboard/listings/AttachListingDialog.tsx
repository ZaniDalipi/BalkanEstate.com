import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Search } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/src/shared/components/ui/Modal';
import { Button } from '@/src/components/ui/button';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { cn } from '@/src/lib/utils';
import { developmentKeys } from '../../../api/developmentKeys';
import { previewAttachment } from '../../../api/developmentsApi';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useListingAttachment } from '../../../hooks/useDevelopmentMutations';
import { useAttachableListings } from '../../../hooks/useScenes';
import { formatPrice } from '../../../utils/format';
import type { AttachmentConflict, DashboardUnit } from '../../../types';
import { ConflictList } from './ConflictList';
import { useApiErrorText } from '../../../hooks/useApiErrorText';

interface AttachListingDialogProps {
  developmentId: string;
  unit: DashboardUnit;
  onClose: () => void;
}

/**
 * Pick one of the caller's listings and attach it to a unit. Conflicts are
 * previewed first and never silently overridden: blocking ones disable
 * attaching; non-blocking ones need an explicit "override" tick.
 */
export const AttachListingDialog: React.FC<AttachListingDialogProps> = ({ developmentId, unit, onClose }) => {
  const { t } = useTranslation('developments');
  const apiText = useApiErrorText();
  const qc = useQueryClient();
  const notify = useNotification();
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q.trim(), 300);
  const { listings, isLoading } = useAttachableListings(developmentId, debouncedQ);
  const { attach, isAttaching } = useListingAttachment(developmentId);
  const [picked, setPicked] = useState<string | null>(null);
  const [force, setForce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linked = new Set((unit.linkedListings ?? []).map((l) => l.id));

  const preview = useMutation({
    mutationFn: (listingId: string) => previewAttachment(developmentId, unit.id, listingId),
  });
  const conflicts: AttachmentConflict[] | null = preview.data?.conflicts ?? null;
  const blocking = (conflicts ?? []).some((c) => c.blocking);
  const needsForce = (conflicts ?? []).some((c) => !c.blocking);

  const pick = (id: string) => {
    setPicked(id);
    setForce(false);
    setError(null);
    preview.mutate(id);
  };

  const onConfirm = async () => {
    if (!picked || blocking || (needsForce && !force)) return;
    try {
      await attach({ unitId: unit.id, listingId: picked, force });
      qc.invalidateQueries({ queryKey: developmentKeys.public() });
      void notify.success(t('attach.success', 'Listing attached.'), t('manage.listings.attachedTo', 'Attached to unit {{number}}.', { number: unit.unitNumber }));
      onClose();
    } catch (err) {
      const first = (err as { details?: { conflicts?: AttachmentConflict[] } })?.details?.conflicts?.[0];
      setError(first ? apiText.conflict(first) : apiText.text(err));
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('manage.listings.attachTitle', 'Attach a listing to unit {{number}}', { number: unit.unitNumber })} size="xl">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('manage.listings.searchPlaceholder', 'Search your listings by title')}
            aria-label={t('manage.listings.search', 'Search listings')}
            className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <ul role="listbox" aria-label={t('manage.listings.results', 'Your listings')} className="max-h-72 space-y-1 overflow-y-auto">
          {isLoading && <li className="px-2 py-3 text-sm text-slate-500">{t('inventory.loading', 'Loading…')}</li>}
          {!isLoading && listings.length === 0 && (
            <li className="px-2 py-3 text-sm text-slate-500">{t('manage.listings.noResults', 'No listings found.')}</li>
          )}
          {listings.map((l) => {
            const already = linked.has(l.id);
            return (
              <li key={l.id} role="option" aria-selected={picked === l.id}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => pick(l.id)}
                  className={cn(
                    'flex min-h-[44px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm',
                    picked === l.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:bg-slate-50',
                    already && 'cursor-not-allowed opacity-60'
                  )}
                >
                  {l.imageUrl && <img src={l.imageUrl} alt="" className="h-10 w-14 shrink-0 rounded object-cover" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{l.title}</span>
                    <span className="block text-xs text-slate-500">
                      {[l.city, l.price ? formatPrice(l.price) : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  {(already || picked === l.id) && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
                  {already && <span className="text-xs text-slate-500">{t('manage.listings.alreadyLinked', 'Linked')}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        {picked && <ConflictList conflicts={conflicts} isLoading={preview.isPending} force={force} onForce={setForce} />}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <Button type="button" variant="outline" onClick={onClose}>{t('wizard.cancel', 'Cancel')}</Button>
          <Button type="button" onClick={onConfirm} disabled={!picked || preview.isPending || isAttaching || blocking || (needsForce && !force)}>
            {isAttaching ? t('attach.attaching', 'Attaching…') : t('attach.confirm', 'Attach')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
