import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ImportedDraft } from '../../api/importReviewApi';
import type { ReviewMode } from '../../types/review';

interface DraftReviewBarProps {
  draft: ImportedDraft;
  position: { index: number; total: number };
  mode: ReviewMode;
  busy: boolean;
  /** Publish would also save unsaved edits first. */
  dirty: boolean;
  /** Essentials (title, city) are missing from the current values. */
  blocked: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onModeChange: (mode: ReviewMode) => void;
  onAccept: () => void;
  onReject: () => void;
  onRestore: () => void;
}

const btn = 'px-3 py-2 text-sm rounded-xl border font-semibold disabled:opacity-50 transition-colors whitespace-nowrap';

/** Sticky header of the full-size review: where you are in the queue and the decision buttons. */
const DraftReviewBar: React.FC<DraftReviewBarProps> = ({
  draft, position, mode, busy, dirty, blocked, onPrev, onNext, onModeChange, onAccept, onReject, onRestore,
}) => {
  const { t } = useTranslation('listingFeeds');
  const isUpdate = draft.kind === 'update';
  const pending = draft.status === 'pending';
  const publishLabel = isUpdate ? 'review.applyUpdate' : dirty ? 'review.saveAndPublish' : 'review.publish';

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200">
      {/* Right padding keeps clear of the modal's own close button. */}
      <div className="max-w-screen-xl mx-auto pl-3 pr-16 sm:pl-6 py-3 flex items-center gap-3 flex-wrap">
        <nav className="flex items-center gap-1" aria-label={t('review.position', { index: position.index + 1, total: position.total })}>
          <button type="button" onClick={onPrev} disabled={!onPrev || busy} aria-label={t('review.previous')} className="w-9 h-9 rounded-lg border border-gray-200 disabled:opacity-40">‹</button>
          <span className="text-sm text-gray-600 tabular-nums px-1">
            {t('review.position', { index: position.index + 1, total: position.total })}
          </span>
          <button type="button" onClick={onNext} disabled={!onNext || busy} aria-label={t('review.next')} className="w-9 h-9 rounded-lg border border-gray-200 disabled:opacity-40">›</button>
        </nav>

        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${isUpdate ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {t(isUpdate ? 'review.kindUpdate' : 'review.kindNew')}
          </span>
          {draft.sourceUrl ? (
            <a href={draft.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-primary hover:underline truncate">
              {draft.sourceName ? t('review.fromFeed', { name: draft.sourceName }) : t('review.viewSource')} ↗
            </a>
          ) : draft.sourceName && <span className="text-sm text-gray-500 truncate">{t('review.fromFeed', { name: draft.sourceName })}</span>}
        </div>

        {pending ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onModeChange(mode === 'edit' ? 'preview' : 'edit')}
              disabled={busy}
              className={`${btn} border-gray-200 bg-white hover:bg-gray-50`}
            >
              {t(mode === 'edit' ? 'review.backToPreview' : 'review.edit')}
            </button>
            <button type="button" onClick={onReject} disabled={busy} className={`${btn} border-red-200 text-red-600 bg-white hover:bg-red-50`}>
              {t(isUpdate ? 'review.keepCurrent' : 'review.reject')}
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={busy || blocked}
              title={blocked ? t('review.blockingHint') : undefined}
              className={`${btn} border-primary bg-primary text-white hover:bg-primary-dark`}
            >
              {t(publishLabel)}
            </button>
          </div>
        ) : (
          <button type="button" onClick={onRestore} disabled={busy} className={`${btn} border-gray-200 bg-white hover:bg-gray-50`}>
            {t('review.restore')}
          </button>
        )}
      </div>
    </header>
  );
};

export default DraftReviewBar;
