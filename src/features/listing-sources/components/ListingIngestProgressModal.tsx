import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/ui/Modal';
import type {
  ProcessedItem,
  SyncSession,
} from '../context/ListingIngestProgressContext';
import type { IngestStats, ListingSource } from '../api/listingSourceApi';

interface Props {
  source: ListingSource;
  isOpen: boolean;
  isRunning: boolean;
  session?: SyncSession;
  finalStats?: IngestStats;
  onClose: () => void;
  onMinimize: () => void;
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
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border ${style.cls} flex-shrink-0`}
    >
      {style.label}
    </span>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  tone: 'neutral' | 'green' | 'blue' | 'amber' | 'red';
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, tone, icon }) => {
  const colors = {
    neutral: { num: 'text-gray-900', bg: 'bg-gray-50', ring: 'ring-gray-200', icon: 'text-gray-500' },
    green: { num: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', icon: 'text-emerald-500' },
    blue: { num: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200', icon: 'text-blue-500' },
    amber: { num: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200', icon: 'text-amber-500' },
    red: { num: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200', icon: 'text-red-500' },
  }[tone];

  return (
    <div className={`${colors.bg} ring-1 ${colors.ring} rounded-2xl px-3 py-3 sm:px-4 sm:py-4 flex items-center gap-3`}>
      <div className={`${colors.icon} flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7`} aria-hidden="true">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-2xl sm:text-3xl font-extrabold tabular-nums leading-none ${colors.num}`}>
          {value}
        </div>
        <div className="text-[11px] sm:text-xs uppercase tracking-wide text-gray-500 font-semibold mt-1 truncate">
          {label}
        </div>
      </div>
    </div>
  );
};

// Plain inline icons so we don't depend on a particular icon library export.
const Icons = {
  globe: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M21 12a9 9 0 1 1-3-6.7" /><polyline points="21 3 21 9 15 9" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  external: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
};

const ListingIngestProgressModal: React.FC<Props> = ({
  source,
  isOpen,
  isRunning,
  session,
  finalStats,
  onClose,
  onMinimize,
}) => {
  const { t } = useTranslation(['listingFeeds', 'common']);
  const listRef = useRef<HTMLDivElement>(null);

  const current = session?.current ?? null;
  const recentItems = session?.recentItems ?? [];

  // Auto-scroll the recent-items list as new entries stream in.
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

  const monthlyUsage = current?.monthlyUsage ?? finalStats?.monthlyUsage;
  const percentage = stats.fetched > 0 ? Math.min(100, (stats.processed / stats.fetched) * 100) : 0;

  // Heading copy depends on which phase we're in.
  const phase: 'discovering' | 'syncing' | 'finished' = !isRunning && (finalStats || stats.processed > 0)
    ? 'finished'
    : stats.fetched === 0
      ? 'discovering'
      : 'syncing';

  const phaseLabel: Record<typeof phase, string> = {
    discovering: t('listingFeeds:phaseDiscovering'),
    syncing: t('listingFeeds:phaseSyncing', { processed: stats.processed, total: stats.fetched }),
    finished: t('listingFeeds:phaseFinished'),
  };

  const phaseDot = {
    discovering: 'bg-blue-500 animate-pulse',
    syncing: 'bg-emerald-500 animate-pulse',
    finished: 'bg-emerald-500',
  }[phase];

  const sourceUrl = source.baseUrl && !source.baseUrl.startsWith('manual://') ? source.baseUrl : null;
  let sourceHost = '';
  try {
    sourceHost = sourceUrl ? new URL(sourceUrl).hostname.replace('www.', '') : '';
  } catch { /* ignore */ }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="space-y-5 -mt-2">
        {/* Header */}
        <div className="flex items-start gap-3 pr-10">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
            <div className="w-5 h-5">{Icons.globe}</div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              {source.name}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
              <span className={`inline-block w-2 h-2 rounded-full ${phaseDot}`} aria-hidden="true" />
              <span className="truncate">{phaseLabel[phase]}</span>
              {sourceHost && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="truncate">{sourceHost}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar — large, gradient, animated */}
        <div>
          <div className="flex items-baseline justify-between mb-2 text-sm">
            <span className="text-gray-600 font-medium">
              {stats.fetched > 0
                ? t('listingFeeds:processedOfTotal', { processed: stats.processed, total: stats.fetched })
                : t('listingFeeds:findingListings')}
            </span>
            <span className="text-gray-900 font-bold tabular-nums">{Math.round(percentage)}%</span>
          </div>
          <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                phase === 'finished'
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-blue-500'
              }`}
              style={{ width: `${Math.max(percentage, phase === 'discovering' ? 6 : 0)}%` }}
            />
            {phase !== 'finished' && (
              <div
                className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-full animate-shimmer pointer-events-none"
                style={{ animation: 'shimmer 1.6s linear infinite' }}
              />
            )}
          </div>
        </div>

        {/* Stat grid — 2 cols on phone, 5 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <StatCard label={t('listingFeeds:fetched')} value={stats.fetched} tone="neutral" icon={Icons.globe} />
          <StatCard label={t('listingFeeds:imported')} value={stats.imported} tone="green" icon={Icons.plus} />
          <StatCard label={t('listingFeeds:updated')} value={stats.updated} tone="blue" icon={Icons.refresh} />
          <StatCard label={t('listingFeeds:deferred')} value={stats.deferred} tone="amber" icon={Icons.clock} />
          <StatCard label={t('listingFeeds:failed')} value={stats.failed} tone="red" icon={Icons.alert} />
        </div>

        {/* Monthly limit — only when applicable */}
        {monthlyUsage && monthlyUsage.monthlyAllowance > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
              <span className="font-semibold text-amber-900">{t('listingFeeds:monthlyLimit')}</span>
              <span className="text-amber-900 tabular-nums font-bold">
                {monthlyUsage.monthlyAllowance - monthlyUsage.remaining}/{monthlyUsage.monthlyAllowance}
              </span>
            </div>
            <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-300"
                style={{
                  width: `${Math.min(100, ((monthlyUsage.monthlyAllowance - monthlyUsage.remaining) / monthlyUsage.monthlyAllowance) * 100)}%`,
                }}
              />
            </div>
            {stats.deferred > 0 && (
              <p className="text-xs text-amber-800 mt-2 leading-relaxed">
                {t('listingFeeds:deferredHint', { count: stats.deferred })}
              </p>
            )}
          </div>
        )}

        {/* Now processing / recent items */}
        {isRunning && current?.currentItem && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1.5">
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                {t('listingFeeds:nowProcessing')}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {current.currentItem.title || current.currentItem.id}
            </p>
            {current.currentItem.url && (
              <a
                href={current.currentItem.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1 max-w-full truncate"
              >
                <span className="truncate">{current.currentItem.url}</span>
                <span className="flex-shrink-0">{Icons.external}</span>
              </a>
            )}
          </div>
        )}

        {/* Recent items list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">
              {t('listingFeeds:recentItems', { count: recentItems.length })}
            </h3>
          </div>
          {recentItems.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400 bg-gray-50/80 rounded-2xl border border-dashed border-gray-200">
              {isRunning
                ? phase === 'discovering'
                  ? t('listingFeeds:lookingForListings')
                  : t('listingFeeds:waitingForFirstItem')
                : t('listingFeeds:noItemsProcessed')}
            </div>
          ) : (
            <div
              ref={listRef}
              className="border border-gray-200 rounded-2xl bg-white max-h-80 overflow-y-auto divide-y divide-gray-100"
            >
              {recentItems.slice().reverse().map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex items-center gap-3 px-3 sm:px-4 py-2.5 text-sm">
                  <StatusBadge status={item.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium truncate">{item.title || item.id}</p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-xs text-gray-500 hover:text-blue-600 hover:underline truncate block max-w-full"
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
          {isRunning ? (
            <>
              <button
                type="button"
                onClick={onMinimize}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors"
              >
                {t('listingFeeds:minimizeAndUseApp')}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              {t('common:close')}
            </button>
          )}
        </div>
      </div>

      {/* Local keyframes for shimmer (Tailwind doesn't ship one). */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </Modal>
  );
};

export default ListingIngestProgressModal;
