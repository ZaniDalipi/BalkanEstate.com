import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import Modal from '@/src/shared/components/ui/Modal';
import { useInventoryQuery } from '../../../hooks/useInventoryQuery';
import type { DashboardUnit } from '../../../types';

interface UnitPickerDialogProps {
  developmentId: string;
  onPick: (unit: DashboardUnit) => void;
  onClose: () => void;
}

/** Search any unit of the development (server-side unit-number search) and pick one to attach a listing to. */
export const UnitPickerDialog: React.FC<UnitPickerDialogProps> = ({ developmentId, onPick, onClose }) => {
  const { t } = useTranslation('developments');
  const inv = useInventoryQuery(developmentId);

  return (
    <Modal isOpen onClose={onClose} title={t('manage.listings.pickUnitTitle', 'Attach a listing to a unit')} size="xl">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            autoFocus
            value={inv.filters.search}
            onChange={(e) => inv.setFilter('search', e.target.value)}
            placeholder={t('inventory.searchPlaceholder', 'Search by unit number')}
            aria-label={t('inventory.search', 'Search units')}
            className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <ul aria-label={t('manage.listings.pickUnitResults', 'Units')} className="max-h-80 space-y-1 overflow-y-auto">
          {inv.isLoading && <li className="px-2 py-3 text-sm text-slate-500">{t('inventory.loading', 'Loading…')}</li>}
          {!inv.isLoading && inv.error && inv.units.length === 0 && (
            <li role="alert" className="px-2 py-3 text-sm text-red-700">{t('inventory.loadFailed', 'Could not load units.')}</li>
          )}
          {!inv.isLoading && !inv.error && inv.units.length === 0 && (
            <li className="px-2 py-3 text-sm text-slate-500">{t('inventory.noMatches', 'No units match these filters.')}</li>
          )}
          {inv.units.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onPick(u)}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900">{u.unitNumber}</span>
                  <span className="block text-xs text-slate-500">{u.buildingName || '—'} · {u.floorLabel || '—'}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {t('manage.listings.linkedCount', 'Linked listings: {{n}}', { n: (u.linkedListings ?? []).length })}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {inv.total > inv.units.length && (
          <p className="text-xs text-slate-500">
            {t('manage.listings.pickUnitMore', 'Showing {{shown}} of {{total}} units. Search by unit number to narrow down.', { shown: inv.units.length, total: inv.total })}
          </p>
        )}
      </div>
    </Modal>
  );
};
