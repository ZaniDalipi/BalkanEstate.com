import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { DraftStatus } from '../../api/importReviewApi';

interface ImportReviewToolbarProps {
  status: DraftStatus;
  onStatusChange: (status: DraftStatus) => void;
  sources: { id: string; name: string }[];
  sourceId: string;
  onSourceChange: (sourceId: string) => void;
  selectedCount: number;
  pageCount: number;
  onToggleAll: () => void;
  onBulk: (action: 'accept' | 'reject') => void;
  busy: boolean;
}

const TABS: DraftStatus[] = ['pending', 'rejected'];

/** Status tabs, feed filter, and bulk publish/reject for the review queue. */
const ImportReviewToolbar: React.FC<ImportReviewToolbarProps> = ({
  status, onStatusChange, sources, sourceId, onSourceChange,
  selectedCount, pageCount, onToggleAll, onBulk, busy,
}) => {
  const { t } = useTranslation('listingFeeds');
  const selectAllRef = useRef<HTMLInputElement>(null);
  const allSelected = pageCount > 0 && selectedCount === pageCount;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedCount > 0 && !allSelected;
  }, [selectedCount, allSelected]);

  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div role="tablist" className="inline-flex rounded-xl bg-gray-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={status === tab}
              onClick={() => onStatusChange(tab)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium ${status === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600'}`}
            >
              {t(tab === 'pending' ? 'review.tabPending' : 'review.tabRejected')}
            </button>
          ))}
        </div>
        {sources.length > 1 && (
          <select
            value={sourceId}
            onChange={(e) => onSourceChange(e.target.value)}
            aria-label={t('review.allFeeds')}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">{t('review.allFeeds')}</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {status === 'pending' && pageCount > 0 && (
        <div className={`px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 flex-wrap ${selectedCount > 0 ? 'bg-primary/5 border-primary/30' : 'bg-gray-50 border-gray-200'}`}>
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              className="w-4 h-4 rounded border-gray-300 text-primary"
            />
            {selectedCount > 0 ? t('review.selectedCount', { count: selectedCount }) : t('review.selectAllOnPage')}
          </label>
          {selectedCount > 0 && (
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={() => onBulk('reject')} className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:opacity-50">
                {t('review.rejectSelected', { count: selectedCount })}
              </button>
              <button type="button" disabled={busy} onClick={() => onBulk('accept')} className="px-3 py-1.5 text-sm rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-50">
                {t('review.publishSelected', { count: selectedCount })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportReviewToolbar;
