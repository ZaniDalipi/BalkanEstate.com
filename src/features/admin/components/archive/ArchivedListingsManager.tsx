import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/src/features/developments/hooks/useDebouncedValue';
import type { ArchiveDeletedBy, ArchiveReason } from '../../api/archivedListingsAdminApi';
import { useArchivedListings } from '../../hooks/useArchivedListings';
import { ArchiveFilters } from './ArchiveFilters';
import { ArchivedListingCard } from './ArchivedListingCard';

/**
 * Admin › Archived listings. Every listing that was removed, sold or rented,
 * with who removed it and when, so admins can see what happened to it.
 */
export const ArchivedListingsManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState<ArchiveReason | undefined>(undefined);
  const [deletedBy, setDeletedBy] = useState<ArchiveDeletedBy | undefined>(undefined);
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 300);
  const { data, isLoading, isError, isFetching, refetch } = useArchivedListings({ reason, deletedBy, search: debounced, page });
  const pages = data?.pages ?? 1;
  const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-4 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{t('admin:archive.title', 'Archived listings')}</h1>
        <p className="text-sm text-gray-600">
          {t('admin:archive.subtitle', 'Listings that were removed, sold or rented: who removed them, when, and what they were.')}
        </p>
      </header>

      <ArchiveFilters
        search={search}
        onSearch={resetPage(setSearch)}
        reason={reason}
        onReason={resetPage(setReason)}
        deletedBy={deletedBy}
        onDeletedBy={resetPage(setDeletedBy)}
        counts={data?.counts}
      />

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : isError || !data ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {t('admin:archive.loadError', 'Could not load the archive.')}{' '}
          <button type="button" onClick={() => void refetch()} className="min-h-[44px] font-semibold underline">
            {t('admin:archive.retry', 'Try again')}
          </button>
        </div>
      ) : data.listings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
          {t('admin:archive.empty', 'No archived listings match.')}
        </p>
      ) : (
        <ul className={`space-y-2 ${isFetching ? 'opacity-60 transition-opacity' : ''}`}>
          {data.listings.map((l) => <ArchivedListingCard key={l._id} listing={l} />)}
        </ul>
      )}

      {data && pages > 1 && (
        <nav aria-label={t('admin:archive.pages', 'Pages')} className="flex items-center justify-between gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium disabled:opacity-40">
            {t('admin:archive.prev', 'Previous')}
          </button>
          <span className="text-sm text-gray-600">{t('admin:archive.pageOf', { page, pages, defaultValue: 'Page {{page}} of {{pages}}' })}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium disabled:opacity-40">
            {t('admin:archive.next', 'Next')}
          </button>
        </nav>
      )}
    </div>
  );
};
