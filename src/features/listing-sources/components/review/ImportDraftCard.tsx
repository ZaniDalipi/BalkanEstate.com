import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import type { ImportedDraft } from '../../api/importReviewApi';
import { formatDraftValue } from '../../utils/draftFormat';
import ImportDraftChanges from './ImportDraftChanges';

interface ImportDraftCardProps {
  draft: ImportedDraft;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onAccept: () => void;
  onReject: () => void;
  onRestore: () => void;
}

const btn = 'px-3 py-1.5 text-sm rounded-lg border font-medium disabled:opacity-50 transition-colors';

/** One fetched listing waiting for the owner's decision. */
const ImportDraftCard: React.FC<ImportDraftCardProps> = ({
  draft, selected, busy, onSelect, onEdit, onAccept, onReject, onRestore,
}) => {
  const { t } = useTranslation(['listingFeeds', 'property']);
  const { data } = draft;
  const isUpdate = draft.kind === 'update';
  const pending = draft.status === 'pending';
  const cover = data.images[0];
  const location = [data.city, data.country].filter(Boolean).join(', ');
  const facts = [
    data.sqft ? formatDraftValue('sqft', data, t) : null,
    data.beds ? `${data.beds} ${t('listingFeeds:review.fields.beds')}` : null,
    data.baths ? `${data.baths} ${t('listingFeeds:review.fields.baths')}` : null,
    data.propertyType ? formatDraftValue('propertyType', data, t) : null,
  ].filter(Boolean);

  return (
    <article className={`bg-white rounded-2xl border p-4 flex gap-4 ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}>
      {pending && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/30 flex-shrink-0"
          aria-label={data.title ?? draft.id}
        />
      )}
      <div className="w-28 h-24 sm:w-36 sm:h-28 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs text-gray-400">
        {cover ? (
          <img src={optimizeCloudinaryUrl(cover, { width: 288, quality: 'auto' })} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : t('listingFeeds:review.noPhotos')}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isUpdate ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {t(isUpdate ? 'listingFeeds:review.kindUpdate' : 'listingFeeds:review.kindNew')}
          </span>
          {draft.edited && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{t('listingFeeds:review.edited')}</span>
          )}
          {draft.sourceName && <span className="text-xs text-gray-500">{t('listingFeeds:review.fromFeed', { name: draft.sourceName })}</span>}
        </div>
        <h3 className="font-semibold text-gray-900 truncate">{data.title || '—'}</h3>
        <p className="text-sm text-gray-700">
          <strong>{formatDraftValue('price', data, t)}</strong>
          {location && <span className="text-gray-500"> · {location}</span>}
        </p>
        {facts.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{facts.join(' · ')}</p>}

        {draft.issues.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 mt-2" aria-label={t('listingFeeds:review.blockingHint')}>
            {draft.issues.map((issue) => (
              <li
                key={issue}
                className={`px-2 py-0.5 rounded-md text-xs ${draft.blockingIssues.includes(issue) ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}
              >
                {t(`listingFeeds:review.issues.${issue}`)}
              </li>
            ))}
          </ul>
        )}

        {isUpdate && pending && draft.current && (
          <ImportDraftChanges fields={draft.changedFields} current={draft.current} incoming={data} />
        )}

        <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
          <div className="text-xs text-gray-400 flex gap-3">
            <span>{t('listingFeeds:review.fetchedAt', { date: new Date(draft.fetchedAt).toLocaleDateString() })}</span>
            {draft.sourceUrl && (
              <a href={draft.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-primary hover:underline">
                {t('listingFeeds:review.viewSource')}
              </a>
            )}
          </div>
          <div className="flex gap-2">
            {pending ? (
              <>
                <button type="button" onClick={onEdit} disabled={busy} className={`${btn} border-gray-200 bg-white hover:bg-gray-50`}>
                  {t('listingFeeds:review.edit')}
                </button>
                <button type="button" onClick={onReject} disabled={busy} className={`${btn} border-red-200 text-red-600 bg-white hover:bg-red-50`}>
                  {t(isUpdate ? 'listingFeeds:review.keepCurrent' : 'listingFeeds:review.reject')}
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={busy || draft.blockingIssues.length > 0}
                  title={draft.blockingIssues.length > 0 ? t('listingFeeds:review.blockingHint') : undefined}
                  className={`${btn} border-primary bg-primary text-white hover:bg-primary-dark`}
                >
                  {t(isUpdate ? 'listingFeeds:review.applyUpdate' : 'listingFeeds:review.publish')}
                </button>
              </>
            ) : (
              <button type="button" onClick={onRestore} disabled={busy} className={`${btn} border-gray-200 bg-white hover:bg-gray-50`}>
                {t('listingFeeds:review.restore')}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default memo(ImportDraftCard);
