import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { IngestStats, ListingSource } from '../api/listingSourceApi';
import { useSyncSession } from '../context/ListingIngestProgressContext';
import ListingIngestProgressModal from './ListingIngestProgressModal';

interface Props {
  source: ListingSource;
  selected: boolean;
  isRunning: boolean;
  isDeleting: boolean;
  isToggling: boolean;
  isClearing: boolean;
  lastRun?: IngestStats;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
  onToggleEnabled: () => void;
  onClearImports: () => void;
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

const Spinner: React.FC = () => (
  <span
    aria-hidden="true"
    className="inline-block w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin"
  />
);

const ListingFeedRow: React.FC<Props> = ({
  source,
  selected,
  isRunning,
  isDeleting,
  isToggling,
  isClearing,
  lastRun,
  onSelect,
  onEdit,
  onDelete,
  onRun,
  onToggleEnabled,
  onClearImports,
}) => {
  const { t } = useTranslation(['listingFeeds', 'common']);
  const session = useSyncSession(source.id);
  const [modalOpen, setModalOpen] = useState(false);

  const busy = isDeleting || isClearing;
  const hasImports = source.listingsImported > 0 || source.listingsUpdated > 0;

  const c = session?.current;
  const liveImported = c?.imported ?? 0;
  const liveProcessed = c?.processed ?? 0;
  const liveTotal = c?.fetched ?? 0;
  const livePct = liveTotal > 0 ? Math.round((liveProcessed / liveTotal) * 100) : 0;

  return (
    <div
      className={`bg-white/60 backdrop-blur-sm border rounded-2xl p-4 shadow-sm transition-all ${
        selected ? 'border-primary/50 ring-2 ring-primary/20' : 'border-white/50'
      } ${busy ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          aria-label={t('listingFeeds:selectFeed', { name: source.name })}
          className="mt-1.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/30 cursor-pointer flex-shrink-0"
        />

        <div className="flex-1 flex items-start justify-between gap-4 flex-wrap">
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
              <span>{t('listingFeeds:imported')}: <strong>{source.listingsImported}</strong></span>
              <span>{t('listingFeeds:updated')}: <strong>{source.listingsUpdated}</strong></span>
              <span>{t('listingFeeds:failed')}: <strong>{source.listingsFailed}</strong></span>
              <span>{t('listingFeeds:lastRun')}: <strong>{formatRelative(source.lastRunAt)}</strong></span>
            </div>

            {source.lastErrorMessage && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1 break-words">
                {source.lastErrorMessage}
              </div>
            )}

            {/* Inline running banner — opens the modal on click */}
            {isRunning && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-2 w-full text-left bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3 hover:bg-blue-100 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                  </span>
                  <span className="text-xs text-blue-900 font-medium truncate">
                    {liveTotal > 0
                      ? t('listingFeeds:rowSyncingProgress', { processed: liveProcessed, total: liveTotal, pct: livePct, imported: liveImported })
                      : t('listingFeeds:rowSyncingDiscovering')}
                  </span>
                </div>
                <span className="text-xs text-blue-700 font-semibold whitespace-nowrap group-hover:underline">
                  {t('listingFeeds:viewDetails')} →
                </span>
              </button>
            )}

            {lastRun && !isRunning && (
              <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 flex items-center justify-between gap-2 flex-wrap">
                <span>
                  {t('listingFeeds:runResult', {
                    fetched: lastRun.fetched,
                    imported: lastRun.imported,
                    updated: lastRun.updated,
                    failed: lastRun.failed,
                  })}
                  {(lastRun.deferred ?? 0) > 0 && ` · ${t('listingFeeds:deferred')}: ${lastRun.deferred}`}
                </span>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="text-emerald-800 hover:underline font-semibold whitespace-nowrap"
                >
                  {t('listingFeeds:viewDetails')}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onToggleEnabled}
              disabled={isToggling || busy}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isToggling && <Spinner />}
              {source.enabled ? t('listingFeeds:disable') : t('listingFeeds:enable')}
            </button>

            <button
              type="button"
              onClick={onRun}
              disabled={isRunning || busy}
              className="px-3 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50 flex items-center gap-1.5"
            >
              {isRunning && <Spinner />}
              {isRunning ? t('listingFeeds:running') : t('listingFeeds:runNow')}
            </button>

            {hasImports && (
              <button
                type="button"
                onClick={onClearImports}
                disabled={isClearing || isRunning || busy}
                className="px-3 py-1.5 text-sm rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-50 flex items-center gap-1.5"
                title={t('listingFeeds:clearImportsTooltip')}
              >
                {isClearing && <Spinner />}
                {t('listingFeeds:clearImports')}
              </button>
            )}

            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              {t('common:edit')}
            </button>

            <button
              type="button"
              onClick={onDelete}
              disabled={busy || isRunning}
              className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isDeleting && <Spinner />}
              {t('common:delete')}
            </button>
          </div>
        </div>
      </div>

      <ListingIngestProgressModal
        source={source}
        isOpen={modalOpen}
        isRunning={isRunning}
        session={session}
        finalStats={lastRun}
        onClose={() => setModalOpen(false)}
        onMinimize={() => setModalOpen(false)}
      />
    </div>
  );
};

export default ListingFeedRow;
