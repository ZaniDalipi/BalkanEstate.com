import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';
import { useDebouncedValue } from '@/src/features/developments/hooks/useDebouncedValue';
import { useApiErrorText } from '@/src/features/developments/hooks/useApiErrorText';
import type { CreatedResidenceCodes, ResidenceCodeFilter } from '../../../api/residenceCodeAdminApi';
import { useResidenceCodeActions, useResidenceCodes } from '../../../hooks/useResidenceCodes';
import { CreateCodesForm } from './CreateCodesForm';
import { CreatedCodes } from './CreatedCodes';
import { ResidenceCodeFilters } from './ResidenceCodeFilters';
import { ResidenceCodeRow } from './ResidenceCodeRow';
import { useCopyText } from './useCopyText';

/**
 * Admin › Residences › Unlock codes. While online payment is off, owners
 * unlock a Residence Pass or extra buildings with a code: create them here
 * (one or a batch), copy and send them, see which residence used each, switch
 * them off, and delete those nobody used.
 */
export const ResidenceCodesPanel: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const apiText = useApiErrorText();
  const [status, setStatus] = useState<ResidenceCodeFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedResidenceCodes | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const debounced = useDebouncedValue(search.trim(), 300);
  const { data, isLoading, isError, isFetching, refetch } = useResidenceCodes({ status, search: debounced, page });
  const actions = useResidenceCodeActions();
  const { copied, copy } = useCopyText();
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const act = async (run: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await run();
    } catch (err) {
      setActionError(apiText.describe(err).text);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <SoftIcon name="ticket" className="h-10 w-10 shrink-0" />
        <p className="min-w-0 flex-1 text-sm text-gray-600">
          {t('admin:residenceCodes.intro', 'Owners type a code in “Buy Residence Pass” to unlock it without paying online. Each code covers the full price of what it unlocks.')}
        </p>
        {!creating && (
          <button type="button" onClick={() => { setCreating(true); setCreated(null); }} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
            <SoftIcon name="plus" className="h-5 w-5" />
            {t('admin:residenceCodes.new', 'New codes')}
          </button>
        )}
      </div>

      {creating && <CreateCodesForm onCreate={actions.create} busy={actions.isCreating} onCancel={() => setCreating(false)} onCreated={(r) => { setCreated(r); setCreating(false); setPage(1); }} />}
      {created && <CreatedCodes result={created} onDone={() => setCreated(null)} />}

      <ResidenceCodeFilters status={status} onStatus={(s) => { setStatus(s); setPage(1); }} search={search} onSearch={(v) => { setSearch(v); setPage(1); }} />
      {actionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100 motion-reduce:animate-none" />)}</div>
      ) : isError || !data ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {t('admin:residenceCodes.loadError', 'Could not load the codes.')}{' '}
          <button type="button" onClick={() => void refetch()} className="min-h-[44px] font-semibold underline">{t('admin:residences.retry', 'Try again')}</button>
        </div>
      ) : data.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
          {status === 'all' && !debounced ? t('admin:residenceCodes.emptyAll', 'No codes yet. Create the first with “New codes”.') : t('admin:residenceCodes.empty', 'No codes match.')}
        </p>
      ) : (
        <ul className={`grid gap-3 lg:grid-cols-2 ${isFetching ? 'opacity-60 transition-opacity' : ''}`}>
          {data.items.map((c) => (
            <ResidenceCodeRow
              key={c.id}
              code={c}
              copied={copied === c.id}
              busy={actions.busy}
              onCopy={() => void copy(c.id, c.code)}
              onChange={(patch) => void act(() => actions.update({ id: c.id, ...patch }))}
              onDelete={() => void act(() => actions.remove(c.id))}
            />
          ))}
        </ul>
      )}

      {data && pages > 1 && (
        <nav aria-label={t('admin:residences.pages', 'Pages')} className="flex items-center justify-between gap-2">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm disabled:opacity-50">{t('admin:residences.prev', 'Previous')}</button>
          <span className="text-sm text-gray-600">{t('admin:residences.pageOf', { page, pages, defaultValue: 'Page {{page}} of {{pages}}' })}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm disabled:opacity-50">{t('admin:residences.next', 'Next')}</button>
        </nav>
      )}
    </div>
  );
};
