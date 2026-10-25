import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebouncedValue } from '@/src/features/developments/hooks/useDebouncedValue';
import type { AdminResidence, AdminResidenceFilter } from '../../api/residenceAdminApi';
import { useAdminResidences } from '../../hooks/useResidenceAdmin';
import type { ResidenceAction } from './ResidenceActions';
import { ResidenceCard } from './ResidenceCard';
import { ResidenceDialogs } from './ResidenceDialogs';
import { ResidenceFilters } from './ResidenceFilters';
import { ResidenceTable } from './ResidenceTable';

/**
 * Admin › Residences. Every residence with its plan (trial, pass, agency free,
 * offline), and the levers an admin needs while there is no payment provider:
 * building limit, a free pass, and an agency's free residences. Table on large
 * screens, cards (one or two columns) below that.
 */
export const ResidenceManager: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AdminResidenceFilter>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<{ action: ResidenceAction; residence: AdminResidence } | null>(null);
  const debounced = useDebouncedValue(search, 300);
  const { data, isLoading, isError, isFetching, refetch } = useAdminResidences({ search: debounced, filter, page });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const onAction = (action: ResidenceAction, residence: AdminResidence) => setOpen({ action, residence });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{t('admin:residences.title', 'Residences')}</h1>
        <p className="text-sm text-gray-600">{t('admin:residences.subtitle', 'Plans, building limits and agencies’ free residences.')}</p>
      </header>
      <ResidenceFilters search={search} onSearch={(v) => { setSearch(v); setPage(1); }} filter={filter} onFilter={(f) => { setFilter(f); setPage(1); }} />

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : isError || !data ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {t('admin:residences.loadError', 'Could not load residences.')}{' '}
          <button type="button" onClick={() => void refetch()} className="min-h-[44px] font-semibold underline">{t('admin:residences.retry', 'Try again')}</button>
        </div>
      ) : data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">{t('admin:residences.empty', 'No residences match.')}</p>
      ) : (
        <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
          <ul className="grid gap-3 md:grid-cols-2 2xl:hidden">
            {data.items.map((r) => <ResidenceCard key={r.id} residence={r} onAction={onAction} />)}
          </ul>
          <div className="hidden 2xl:block">
            <ResidenceTable items={data.items} onAction={onAction} />
          </div>
        </div>
      )}

      {data && pages > 1 && (
        <nav aria-label={t('admin:residences.pages', 'Pages')} className="flex items-center justify-between gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium disabled:opacity-40">
            {t('admin:residences.prev', 'Previous')}
          </button>
          <span className="text-sm text-gray-600">{t('admin:residences.pageOf', { page, pages, defaultValue: 'Page {{page}} of {{pages}}' })}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium disabled:opacity-40">
            {t('admin:residences.next', 'Next')}
          </button>
        </nav>
      )}

      <ResidenceDialogs open={open} includedBuildings={data?.includedBuildings ?? 5} onClose={() => setOpen(null)} />
    </div>
  );
};
