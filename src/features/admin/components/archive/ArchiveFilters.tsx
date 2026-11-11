import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ArchiveDeletedBy, ArchiveReason } from '../../api/archivedListingsAdminApi';
import { DELETER_LABEL, REASON_LABEL } from './archiveDisplay';

const REASONS: ArchiveReason[] = ['deleted', 'sold', 'rented'];
const DELETERS: ArchiveDeletedBy[] = ['owner', 'admin', 'agency'];

interface ArchiveFiltersProps {
  search: string;
  onSearch: (value: string) => void;
  reason: ArchiveReason | undefined;
  onReason: (value: ArchiveReason | undefined) => void;
  deletedBy: ArchiveDeletedBy | undefined;
  onDeletedBy: (value: ArchiveDeletedBy | undefined) => void;
  counts?: Record<ArchiveReason, number>;
}

const pill = (active: boolean) =>
  `min-h-[44px] rounded-full px-4 text-sm font-medium transition-colors ${
    active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50'
  }`;

/** Reason tabs (with counts), who removed it, and a text search. */
export const ArchiveFilters: React.FC<ArchiveFiltersProps> = ({
  search, onSearch, reason, onReason, deletedBy, onDeletedBy, counts,
}) => {
  const { t } = useTranslation(['admin']);
  const total = counts ? counts.deleted + counts.sold + counts.rented : undefined;
  const withCount = (label: string, n?: number) => (n === undefined ? label : `${label} (${n})`);

  return (
    <div className="space-y-3">
      <div role="group" aria-label={t('admin:archive.reasonFilter', 'Reason')} className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={!reason} onClick={() => onReason(undefined)} className={pill(!reason)}>
          {withCount(t('admin:archive.all', 'All'), total)}
        </button>
        {REASONS.map((r) => (
          <button key={r} type="button" aria-pressed={reason === r} onClick={() => onReason(r)} className={pill(reason === r)}>
            {withCount(t(`admin:archive.reason.${r}`, REASON_LABEL[r]), counts?.[r])}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          maxLength={100}
          aria-label={t('admin:archive.search', 'Search title, address or seller')}
          placeholder={t('admin:archive.search', 'Search title, address or seller')}
          className="min-h-[44px] flex-1 rounded-lg border border-gray-300 px-3 text-sm"
        />
        <select
          value={deletedBy ?? ''}
          onChange={(e) => onDeletedBy((e.target.value || undefined) as ArchiveDeletedBy | undefined)}
          aria-label={t('admin:archive.removedByFilter', 'Removed by')}
          className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-sm"
        >
          <option value="">{t('admin:archive.removedByAnyone', 'Removed by anyone')}</option>
          {DELETERS.map((d) => (
            <option key={d} value={d}>{t(`admin:archive.deleter.${d}`, DELETER_LABEL[d])}</option>
          ))}
        </select>
      </div>
    </div>
  );
};
