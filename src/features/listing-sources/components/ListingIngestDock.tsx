import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useListingIngestProgressContext,
  type SyncSession,
} from '../context/ListingIngestProgressContext';
import ListingIngestProgressModal from './ListingIngestProgressModal';
import type { ListingSource } from '../api/listingSourceApi';

/**
 * Build the minimal `ListingSource`-shaped object the modal needs from a session.
 * The modal only ever reads `name` and `baseUrl`, so we don't have to pipe a
 * full source through here — sync sessions carry their own name.
 */
const sessionToSource = (session: SyncSession): ListingSource => ({
  id: session.sourceId,
  userId: undefined as unknown as string,
  name: session.sourceName,
  slug: session.sourceId,
  baseUrl: '',
  enabled: true,
  adapterType: 'jsonFeed',
  adapterConfig: {},
  fieldMap: {},
  schedule: undefined,
  rateLimitRpm: undefined,
  acceptedTermsAt: undefined,
  lastRunAt: undefined,
  lastSuccessAt: undefined,
  lastErrorMessage: undefined,
  listingsImported: 0,
  listingsUpdated: 0,
  listingsFailed: 0,
  createdAt: '',
  updatedAt: '',
});

/**
 * Floating dock — fixed bottom-right pill that shows whenever any listing-source
 * sync is running or recently finished. Click it to expand into the full modal.
 *
 * Stays visible across navigations (mounted at the app root) so the user can
 * close the feeds page, browse properties, etc. while their feed syncs.
 */
const ListingIngestDock: React.FC = () => {
  const { t } = useTranslation(['listingFeeds']);
  const { sessions, dismissSession } = useListingIngestProgressContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Schedule auto-dismiss 15s after a session is marked done — unless the
  // user has the modal open. Done state is set by the backend's final
  // progress event (event.done === true) which the context applies directly.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const session of sessions.values()) {
      if (session.isDone && expandedId !== session.sourceId) {
        timers.push(setTimeout(() => dismissSession(session.sourceId), 15_000));
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [sessions, dismissSession, expandedId]);

  const sessionsArr = useMemo(() => Array.from(sessions.values()), [sessions]);
  const expandedSession = expandedId ? sessions.get(expandedId) : undefined;

  if (sessionsArr.length === 0) return null;

  return (
    <>
      <div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[4000] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm"
        aria-live="polite"
        aria-atomic="false"
      >
        {sessionsArr.map((session) => (
          <DockCard
            key={session.sourceId}
            session={session}
            onExpand={() => setExpandedId(session.sourceId)}
            onDismiss={() => dismissSession(session.sourceId)}
            t={t}
          />
        ))}
      </div>

      {expandedSession && (
        <ListingIngestProgressModal
          source={sessionToSource(expandedSession)}
          isOpen={!!expandedSession}
          isRunning={!expandedSession.isDone}
          session={expandedSession}
          onClose={() => {
            // If the run is finished, closing the modal also dismisses the dock card.
            if (expandedSession.isDone) dismissSession(expandedSession.sourceId);
            setExpandedId(null);
          }}
          onMinimize={() => setExpandedId(null)}
        />
      )}
    </>
  );
};

interface DockCardProps {
  session: SyncSession;
  onExpand: () => void;
  onDismiss: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

const DockCard: React.FC<DockCardProps> = ({ session, onExpand, onDismiss, t }) => {
  const c = session.current;
  const fetched = c?.fetched ?? 0;
  const processed = c?.processed ?? 0;
  const imported = c?.imported ?? 0;
  const updated = c?.updated ?? 0;
  const failed = c?.failed ?? 0;
  const deferred = c?.deferred ?? 0;
  const percentage = fetched > 0 ? Math.min(100, (processed / fetched) * 100) : 0;
  const isDone = session.isDone;
  const isDiscovering = !isDone && fetched === 0;

  const statusLabel = isDone
    ? t('listingFeeds:dockDone')
    : isDiscovering
      ? t('listingFeeds:dockDiscovering')
      : t('listingFeeds:dockSyncing', { processed, total: fetched });

  return (
    <div className="bg-white rounded-2xl shadow-2xl shadow-black/15 border border-gray-200 overflow-hidden animate-slide-up">
      <button
        type="button"
        onClick={onExpand}
        className="w-full text-left px-3 sm:px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0 w-9 h-9">
            {/* Circular progress */}
            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" className="stroke-gray-200" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                className={isDone ? 'stroke-emerald-500' : 'stroke-blue-500'}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(percentage / 100) * 94.25} 94.25`}
                style={{ transition: 'stroke-dasharray 0.3s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {isDone ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="text-[10px] font-bold tabular-nums text-gray-700">{Math.round(percentage)}%</span>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 truncate">{session.sourceName}</span>
              {!isDone && (
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate">{statusLabel}</div>
            {(imported > 0 || updated > 0 || failed > 0 || deferred > 0) && (
              <div className="flex items-center gap-2 mt-1 text-[10px] font-semibold tabular-nums">
                {imported > 0 && <span className="text-emerald-600">+{imported}</span>}
                {updated > 0 && <span className="text-blue-600">↻{updated}</span>}
                {deferred > 0 && <span className="text-amber-600">⏱{deferred}</span>}
                {failed > 0 && <span className="text-red-600">✕{failed}</span>}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            aria-label={t('listingFeeds:dockDismiss')}
            className="flex-shrink-0 -mr-1 -my-2 px-2 py-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </button>

      {/* Bottom progress bar */}
      <div className="h-0.5 bg-gray-100 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ease-out ${isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-400 to-blue-500'}`}
          style={{ width: `${Math.max(percentage, isDiscovering ? 6 : 0)}%` }}
        />
      </div>
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </div>
  );
};

export default ListingIngestDock;
