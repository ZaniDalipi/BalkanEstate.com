import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/ui/Modal';
import type {
  ListingIngestProgressState,
  ProcessedItem,
} from '../hooks/useListingIngestProgress';
import type { IngestStats, ListingSource } from '../api/listingSourceApi';

interface Props {
  source: ListingSource;
  isOpen: boolean;
  isRunning: boolean;
  progress: ListingIngestProgressState;
  finalStats?: IngestStats;
  onClose: () => void;
}

type StatusBadgeStyle = { label: string; cls: string };

const STATUS_STYLES: Record<ProcessedItem['status'], StatusBadgeStyle> = {
  imported: { label: 'New', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  updated: { label: 'Updated', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  deferred: { label: 'Deferred', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-700 border-red-200' },
};

const StatusBadge: React.FC<{ status: ProcessedItem['status'] }> = ({ status }) => {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 border ${style.cls}`}>
      {style.label}
    </span>
  );
};

const StatTile: React.FC<{ label: string; value: number | string; tone: 'neutral' | 'green' | 'blue' | 'amber' | 'red' }> = ({
  label,
  value,
  tone,
}) => {
  const toneClass = {
    neutral: 'text-gray-900',
    green: 'text-emerald-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }[tone];
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col">
      <span className="text-[11px] uppercase tracking-wide text-gray-500 font-medium">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
};

const ListingIngestProgressModal: React.FC<Props> = ({
  source,
  isOpen,
  isRunning,
  progress,
  finalStats,
  onClose,
}) => {
  const { t } = useTranslation(['listingFeeds', 'common']);
  const listRef = useRef<HTMLDivElement>(null);
  const { current, recentItems } = progress;

  // Keep the recent-items list scrolled to the bottom as new items stream in
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [recentItems.length]);

  const stats = useMemo(() => {
    if (current) {
      return {
        fetched: current.fetched,
        processed: current.processed,
        imported: current.imported,
        updated: current.updated,
        failed: current.failed,
        deferred: current.deferred ?? 0,
      };
    }
    if (finalStats) {
      return {
        fetched: finalStats.fetched,
        processed: finalStats.fetched,
        imported: finalStats.imported,
        updated: finalStats.updated,
        failed: finalStats.failed,
        deferred: finalStats.deferred ?? 0,
      };
    }
    return { fetched: 0, processed: 0, imported: 0, updated: 0, failed: 0, deferred: 0 };
  }, [current, finalStats]);

  const percentage = stats.fetched > 0 ? Math.min(100, (stats.processed / stats.fetched) * 100) : 0;
  const monthlyUsage = current?.monthlyUsage ?? finalStats?.monthlyUsage;
  const isDone = !isRunning && (finalStats !== undefined || stats.processed >= stats.fetched && stats.fetched > 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={`${isRunning ? t('listingFeeds:running') : t('listingFeeds:syncComplete')} — ${source.name}`}
    >
      <div className="space-y-4">
        {/* Big progress bar */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700">
              {isRunning
                ? t('listingFeeds:syncingProgress', { processed: stats.processed, total: stats.fetched })
                : t('listingFeeds:syncFinished')}
            </span>
            <span className="text-sm font-semibold text-gray-900 tabular-nums">{Math.round(percentage)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-400 to-blue-500'
              } ${isRunning ? 'animate-pulse' : ''}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <StatTile label={t('listingFeeds:fetched')} value={stats.fetched} tone="neutral" />
          <StatTile label={t('listingFeeds:imported')} value={stats.imported} tone="green" />
          <StatTile label={t('listingFeeds:updated')} value={stats.updated} tone="blue" />
          <StatTile label={t('listingFeeds:deferred')} value={stats.deferred} tone="amber" />
          <StatTile label={t('listingFeeds:failed')} value={stats.failed} tone="red" />
        </div>

        {/* Monthly usage indicator */}
        {monthlyUsage && monthlyUsage.monthlyAllowance > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-amber-900">{t('listingFeeds:monthlyLimit')}</span>
              <span className="text-amber-900 tabular-nums font-semibold">
                {monthlyUsage.monthlyAllowance - monthlyUsage.remaining}/{monthlyUsage.monthlyAllowance}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500"
                style={{
                  width: `${Math.min(100, ((monthlyUsage.monthlyAllowance - monthlyUsage.remaining) / monthlyUsage.monthlyAllowance) * 100)}%`,
                }}
              />
            </div>
            {stats.deferred > 0 && (
              <p className="text-xs text-amber-800 mt-1.5">
                {t('listingFeeds:deferredHint', { count: stats.deferred })}
              </p>
            )}
          </div>
        )}

        {/* Currently processing */}
        {isRunning && current?.currentItem && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              {t('listingFeeds:nowProcessing')}
            </div>
            <p className="text-sm font-medium text-gray-900 truncate">
              {current.currentItem.title || current.currentItem.id}
            </p>
            {current.currentItem.url && (
              <a
                href={current.currentItem.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-xs text-blue-600 hover:underline truncate block mt-0.5"
              >
                {current.currentItem.url}
              </a>
            )}
          </div>
        )}

        {/* Recent items */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {t('listingFeeds:recentItems', { count: recentItems.length })}
          </h3>
          {recentItems.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              {isRunning ? t('listingFeeds:waitingForFirstItem') : t('listingFeeds:noItemsProcessed')}
            </div>
          ) : (
            <div
              ref={listRef}
              className="border border-gray-200 rounded-xl bg-white max-h-72 overflow-y-auto divide-y divide-gray-100"
            >
              {recentItems.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <StatusBadge status={item.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium truncate">{item.title || item.id}</p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-xs text-gray-500 hover:text-blue-600 hover:underline truncate block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.url}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
              isRunning
                ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {isRunning ? t('listingFeeds:hideAndContinue') : t('common:close')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ListingIngestProgressModal;
