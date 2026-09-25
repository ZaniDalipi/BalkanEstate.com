import React from 'react';
import { useTranslation } from 'react-i18next';
import { useImportReviewQueue } from '../../hooks/useImportReviewQueue';
import ImportDraftCard from './ImportDraftCard';
import ImportDraftDetail from './ImportDraftDetail';
import ImportReviewToolbar from './ImportReviewToolbar';

/**
 * "Imported drafts" account tab: every listing fetched from the user's
 * external feeds lands here first. The owner fixes what was parsed wrong and
 * publishes or rejects it — nothing from a feed goes live on its own.
 */
const ImportReviewQueue: React.FC = () => {
  const { t } = useTranslation(['listingFeeds', 'common']);
  const q = useImportReviewQueue();

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{t('listingFeeds:review.title')}</h2>
        <p className="text-sm text-gray-600">{t('listingFeeds:review.description')}</p>
      </div>

      <ImportReviewToolbar
        status={q.status}
        onStatusChange={q.setStatus}
        sources={q.sources}
        sourceId={q.sourceId}
        onSourceChange={q.setSourceId}
        selectedCount={q.selected.size}
        pageCount={q.drafts.length}
        onToggleAll={q.toggleAll}
        onBulk={(action) => void q.runBulk(action)}
        busy={q.bulkBusy}
      />

      {q.notice && (
        <div
          role={q.notice.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-xl border p-3 mb-4 text-sm flex items-center justify-between gap-2 ${q.notice.tone === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}
        >
          <span>{q.notice.text}</span>
          <button type="button" onClick={q.dismissNotice} aria-label={t('common:close')} className="font-bold text-lg leading-none opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {q.isLoading ? (
        <div className="text-center py-12 text-gray-500">{t('common:loading')}</div>
      ) : q.isError ? (
        <div role="alert" className="text-center py-12 text-red-600">{t('listingFeeds:review.loadError')}</div>
      ) : q.drafts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-300 rounded-2xl text-gray-600 px-4">
          {t(q.status === 'pending' ? 'listingFeeds:review.emptyPending' : 'listingFeeds:review.emptyRejected')}
        </div>
      ) : (
        <div className="space-y-3">
          {q.drafts.map((draft) => (
            <ImportDraftCard
              key={draft.id}
              draft={draft}
              selected={q.selected.has(draft.id)}
              busy={q.busyIds.has(draft.id) || q.bulkBusy}
              onSelect={() => q.toggleSelected(draft.id)}
              onOpen={() => q.viewer.open(draft.id)}
              onEdit={() => q.viewer.open(draft.id, 'edit')}
              onAccept={() => void q.acceptDraft(draft.id)}
              onReject={() => void q.rejectDraft(draft.id)}
              onRestore={() => void q.restoreDraft(draft.id)}
            />
          ))}
        </div>
      )}

      {q.pages > 1 && (
        <nav className="flex items-center justify-center gap-3 mt-5 text-sm" aria-label={t('listingFeeds:review.pageOf', { page: q.page, pages: q.pages })}>
          <button type="button" disabled={q.page <= 1} onClick={() => q.setPage(q.page - 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40">
            {t('listingFeeds:review.previous')}
          </button>
          <span className="text-gray-600">{t('listingFeeds:review.pageOf', { page: q.page, pages: q.pages })}</span>
          <button type="button" disabled={q.page >= q.pages} onClick={() => q.setPage(q.page + 1)} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40">
            {t('listingFeeds:review.next')}
          </button>
        </nav>
      )}

      {q.viewer.viewing && (
        <ImportDraftDetail
          draftId={q.viewer.viewing.id}
          initialMode={q.viewer.viewing.mode}
          position={q.viewer.position}
          busy={q.viewer.busy}
          error={q.viewer.error}
          onPrev={q.viewer.hasPrev ? q.viewer.prev : undefined}
          onNext={q.viewer.hasNext ? q.viewer.next : undefined}
          onClose={q.viewer.close}
          onDecision={(decision) => void q.viewer.onDecision(decision)}
        />
      )}
    </div>
  );
};

export default ImportReviewQueue;
