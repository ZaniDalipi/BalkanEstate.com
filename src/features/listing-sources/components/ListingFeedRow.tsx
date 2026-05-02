import React from 'react';
import { useTranslation } from 'react-i18next';
import type { IngestStats, ListingSource } from '../api/listingSourceApi';

interface Props {
  source: ListingSource;
  isRunning: boolean;
  isDeleting: boolean;
  isToggling: boolean;
  lastRun?: IngestStats;
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
  onToggleEnabled: () => void;
}

const formatRelative = (iso?: string): string => {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-block w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin ${className}`} />
);

const ListingFeedRow: React.FC<Props> = ({
  source,
  isRunning,
  isDeleting,
  isToggling,
  lastRun,
  onEdit,
  onDelete,
  onRun,
  onToggleEnabled,
}) => {
  const { t } = useTranslation(['listingFeeds', 'common']);

  return (
    <div className={`bg-white/60 backdrop-blur-sm border border-white/50 rounded-2xl p-4 shadow-sm transition-opacity ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Info column */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{source.name}</h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 uppercase tracking-wide">
              {source.adapterType}
            </span>
            {source.enabled ? (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700">
                {t('listingFeeds:enabled')}
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                {t('listingFeeds:disabled')}
              </span>
            )}
          </div>

          {source.baseUrl && !source.baseUrl.startsWith('manual://') && (
            <a
              href={source.baseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline break-all"
            >
              {source.baseUrl}
            </a>
          )}

          <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              {t('listingFeeds:imported')}: <strong>{source.listingsImported}</strong>
            </span>
            <span>
              {t('listingFeeds:updated')}: <strong>{source.listingsUpdated}</strong>
            </span>
            <span>
              {t('listingFeeds:failed')}: <strong>{source.listingsFailed}</strong>
            </span>
            <span>
              {t('listingFeeds:lastRun')}: <strong>{formatRelative(source.lastRunAt)}</strong>
            </span>
          </div>

          {source.lastErrorMessage && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1 break-words">
              {source.lastErrorMessage}
            </div>
          )}

          {lastRun && (
            <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
              {t('listingFeeds:runResult', {
                fetched: lastRun.fetched,
                imported: lastRun.imported,
                updated: lastRun.updated,
                failed: lastRun.failed,
              })}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onToggleEnabled}
            disabled={isToggling || isDeleting}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isToggling && <Spinner />}
            {source.enabled ? t('listingFeeds:disable') : t('listingFeeds:enable')}
          </button>

          <button
            type="button"
            onClick={onRun}
            disabled={isRunning || isDeleting}
            className="px-3 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50 flex items-center gap-1.5"
          >
            {isRunning && <Spinner />}
            {isRunning ? t('listingFeeds:running') : t('listingFeeds:runNow')}
          </button>

          <button
            type="button"
            onClick={onEdit}
            disabled={isDeleting}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            {t('common:edit')}
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting || isRunning}
            className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1.5"
          >
            {isDeleting && <Spinner />}
            {t('common:delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListingFeedRow;
