import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ListingIngestProgressState } from '../hooks/useListingIngestProgress';

interface Props {
  progress: ListingIngestProgressState | null;
  isRunning: boolean;
}

const ListingIngestProgressBar: React.FC<Props> = ({ progress, isRunning }) => {
  const { t } = useTranslation(['listingFeeds']);
  const current = progress?.current ?? null;

  if (!isRunning || !current) {
    return null;
  }

  const percentage = current.fetched > 0 ? (current.processed / current.fetched) * 100 : 0;

  return (
    <div className="mt-3 space-y-2">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-green-500 h-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="text-xs text-gray-600 flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-x-3 gap-y-1 flex-wrap">
          <span>
            {t('listingFeeds:syncing')}: <strong>{current.processed}/{current.fetched}</strong>
          </span>
          <span>
            {t('listingFeeds:imported')}: <strong className="text-green-600">{current.imported}</strong>
          </span>
          <span>
            {t('listingFeeds:updated')}: <strong className="text-blue-600">{current.updated}</strong>
          </span>
          {(current.deferred ?? 0) > 0 && (
            <span>
              {t('listingFeeds:deferred')}: <strong className="text-amber-600">{current.deferred}</strong>
            </span>
          )}
          {current.failed > 0 && (
            <span>
              {t('listingFeeds:failed')}: <strong className="text-red-600">{current.failed}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Current item being processed */}
      {current.currentItem && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1.5 truncate">
          <span className="font-medium">Current:</span> {current.currentItem.title || current.currentItem.id}
        </div>
      )}
    </div>
  );
};

export default ListingIngestProgressBar;
