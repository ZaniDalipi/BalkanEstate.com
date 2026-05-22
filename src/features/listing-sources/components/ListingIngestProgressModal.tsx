import React, { useEffect, useMemo, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/ui/Modal';
import { useAppContext } from '@/context/AppContext';
import type { ProcessedItem, SyncSession } from '../context/ListingIngestProgressContext';
import type { IngestStats, ListingSource } from '../api/listingSourceApi';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'discovering' | 'syncing' | 'finished' | 'error';

interface Props {
  source: ListingSource;
  isOpen: boolean;
  isRunning: boolean;
  session?: SyncSession;
  finalStats?: IngestStats;
  onClose: () => void;
  onMinimize: () => void;
  onRetry?: () => void;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Ico = {
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M20 6 9 17l-5-5"/></svg>,
  plus:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 3 21 9 15 9"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  warn:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  ext:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 flex-shrink-0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
};

// ─── CrawlHero ────────────────────────────────────────────────────────────────

interface CrawlHeroProps {
  phase: Phase;
  fetched: number;
  processed: number;
  currentTitle?: string;
  currentUrl?: string;
  sourceHost: string;
}

const CrawlHero: React.FC<CrawlHeroProps> = memo(({ phase, fetched, processed, currentTitle, currentUrl, sourceHost }) => {
  const isActive = phase === 'discovering' || phase === 'syncing';

  return (
    <div className={`relative rounded-2xl overflow-hidden ${
      phase === 'error' ? 'bg-red-950/90' : 'bg-[#0d1117]'
    }`} style={{ minHeight: 140 }}>

      {/* Dot-grid background */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle, #4ade80 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}/>

      {/* Radar sweep (discovering only) */}
      {phase === 'discovering' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-32 h-32 rounded-full border border-emerald-500/20 absolute" style={{ animation: 'ring-expand 2s ease-out infinite 0s' }}/>
          <div className="w-32 h-32 rounded-full border border-emerald-500/20 absolute" style={{ animation: 'ring-expand 2s ease-out infinite 0.66s' }}/>
          <div className="w-32 h-32 rounded-full border border-emerald-500/20 absolute" style={{ animation: 'ring-expand 2s ease-out infinite 1.33s' }}/>
          {/* Rotating sweep */}
          <div className="w-48 h-48 absolute rounded-full overflow-hidden" style={{ animation: 'radar-spin 3s linear infinite' }}>
            <div className="absolute inset-0" style={{
              background: 'conic-gradient(from 0deg, transparent 85%, rgba(74, 222, 128, 0.35) 100%)',
              borderRadius: '50%',
            }}/>
          </div>
        </div>
      )}

      {/* Scan-line (syncing only) */}
      {phase === 'syncing' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute inset-y-0 w-12 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent"
               style={{ animation: 'scan-sweep 2.2s ease-in-out infinite' }}/>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 px-5 py-5 flex flex-col items-center justify-center gap-3 text-center" style={{ minHeight: 140 }}>

        {/* Phase: discovering */}
        {phase === 'discovering' && (
          <>
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center"
                 style={{ animation: 'pulse-glow 1.8s ease-in-out infinite' }}>
              <div className="w-5 h-5">{Ico.globe}</div>
            </div>
            <div>
              <p className="text-emerald-300 font-semibold text-sm tracking-wide">Scanning the web…</p>
              <p className="text-emerald-600 text-xs mt-0.5 font-mono">{sourceHost}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 0.2, 0.4].map(d => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                      style={{ animation: `pulse-dot 1.2s ease-in-out ${d}s infinite` }}/>
              ))}
            </div>
          </>
        )}

        {/* Phase: syncing */}
        {phase === 'syncing' && (
          <div className="w-full max-w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-emerald-500 font-mono uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" style={{ animation: 'pulse-dot 1s infinite' }}/>
                Fetching listing {processed + 1} of {fetched}
              </span>
              <span className="text-[10px] text-gray-600 font-mono">{Math.round((processed / Math.max(1, fetched)) * 100)}%</span>
            </div>
            {currentTitle && (
              <p className="text-white text-sm font-semibold truncate text-left mb-1">{currentTitle}</p>
            )}
            {currentUrl && (
              <div className="bg-black/40 rounded-lg px-3 py-2 flex items-center gap-2 overflow-hidden">
                <span className="text-emerald-400 text-xs flex-shrink-0">›</span>
                <span className="text-emerald-300/80 text-[11px] font-mono truncate flex-1">{currentUrl}</span>
                <span className="w-0.5 h-3.5 bg-emerald-400 flex-shrink-0" style={{ animation: 'blink-cursor 1s step-end infinite' }}/>
              </div>
            )}
            {!currentUrl && !currentTitle && (
              <div className="bg-black/40 rounded-lg px-3 py-2">
                <span className="text-gray-500 text-[11px] font-mono">Waiting for next listing…</span>
              </div>
            )}
          </div>
        )}

        {/* Phase: finished */}
        {phase === 'finished' && (
          <>
            <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center"
                 style={{ animation: 'pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
              <div className="w-5 h-5">{Ico.check}</div>
            </div>
            <p className="text-emerald-300 font-semibold text-sm">Import complete</p>
          </>
        )}

        {/* Phase: error */}
        {phase === 'error' && (
          <>
            <div className="w-11 h-11 rounded-full bg-red-500/20 border border-red-400/40 text-red-400 flex items-center justify-center">
              <div className="w-5 h-5">{Ico.warn}</div>
            </div>
            <p className="text-red-300 font-semibold text-sm">Import failed</p>
          </>
        )}
      </div>

      {/* Corner glow */}
      {isActive && (
        <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none"/>
      )}
    </div>
  );
});
CrawlHero.displayName = 'CrawlHero';

// ─── StatRow ─────────────────────────────────────────────────────────────────

interface StatItem { label: string; value: number; color: string; icon: React.ReactNode; }

const StatRow: React.FC<{ items: StatItem[] }> = memo(({ items }) => (
  <div className="grid grid-cols-5 gap-2">
    {items.map(({ label, value, color, icon }) => (
      <div key={label} className="flex flex-col items-center gap-1 bg-gray-50 rounded-xl py-2.5 px-1 ring-1 ring-gray-100">
        <div className={`w-4 h-4 ${color} opacity-70`}>{icon}</div>
        <span className={`text-xl font-extrabold tabular-nums leading-none ${color}`}>{value}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 leading-none">{label}</span>
      </div>
    ))}
  </div>
));
StatRow.displayName = 'StatRow';

// ─── LiveFeedItem ─────────────────────────────────────────────────────────────

const BADGE: Record<ProcessedItem['status'], { label: string; cls: string }> = {
  imported: { label: 'New',     cls: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  updated:  { label: 'Updated', cls: 'bg-blue-100 text-blue-700 ring-blue-200' },
  deferred: { label: 'Queued',  cls: 'bg-amber-100 text-amber-700 ring-amber-200' },
  failed:   { label: 'Failed',  cls: 'bg-red-100 text-red-700 ring-red-200' },
};

const FeedItem: React.FC<{ item: ProcessedItem; isFirst: boolean }> = memo(({ item, isFirst }) => {
  const badge = BADGE[item.status];
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-50 last:border-0"
         style={{ animation: isFirst ? 'slide-up-in 0.25s ease-out forwards' : 'none' }}>
      <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ring-1 flex-shrink-0 ${badge.cls}`}>
        {badge.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800 font-medium truncate leading-tight">{item.title || item.id}</p>
        {item.url && (
          <a href={item.url} target="_blank" rel="noopener noreferrer nofollow"
             className="text-[11px] text-gray-400 hover:text-blue-500 truncate block transition-colors"
             onClick={e => e.stopPropagation()}>
            {item.url}
          </a>
        )}
      </div>
    </div>
  );
});
FeedItem.displayName = 'FeedItem';

// ─── Main Component ───────────────────────────────────────────────────────────

const ListingIngestProgressModal: React.FC<Props> = ({
  source, isOpen, isRunning, session, finalStats, onClose, onMinimize, onRetry,
}) => {
  const { t } = useTranslation(['listingFeeds', 'common']);
  const { dispatch } = useAppContext();
  const feedRef = useRef<HTMLDivElement>(null);

  const current = session?.current ?? null;
  const recentItems = session?.recentItems ?? [];

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [recentItems.length]);

  const stats = useMemo(() => {
    if (current) return {
      fetched: current.fetched, processed: current.processed,
      imported: current.imported, updated: current.updated,
      failed: current.failed, deferred: current.deferred ?? 0,
    };
    if (finalStats) return {
      fetched: finalStats.fetched, processed: finalStats.fetched,
      imported: finalStats.imported, updated: finalStats.updated,
      failed: finalStats.failed, deferred: finalStats.deferred ?? 0,
    };
    return { fetched: 0, processed: 0, imported: 0, updated: 0, failed: 0, deferred: 0 };
  }, [current, finalStats]);

  const monthlyUsage = current?.monthlyUsage ?? finalStats?.monthlyUsage;
  const pct = stats.fetched > 0 ? Math.min(100, Math.round((stats.processed / stats.fetched) * 100)) : 0;
  const errorMessage = current?.message ?? finalStats?.errors?.[0];
  const isDone = session?.isDone ?? !isRunning;

  const phase: Phase = isDone && errorMessage && stats.imported === 0 && stats.updated === 0
    ? 'error'
    : isDone ? 'finished'
    : stats.fetched === 0 ? 'discovering'
    : 'syncing';

  const sourceUrl = source.baseUrl?.startsWith('manual://') ? null : source.baseUrl;
  let sourceHost = '';
  try { sourceHost = sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, '') : ''; } catch { /* */ }

  const statItems: StatItem[] = [
    { label: 'Scanned',  value: stats.fetched,   color: 'text-gray-500',    icon: Ico.globe  },
    { label: 'New',      value: stats.imported,  color: 'text-emerald-600', icon: Ico.plus   },
    { label: 'Updated',  value: stats.updated,   color: 'text-blue-600',    icon: Ico.arrow  },
    { label: 'Queued',   value: stats.deferred,  color: 'text-amber-600',   icon: Ico.clock  },
    { label: 'Failed',   value: stats.failed,    color: 'text-red-500',     icon: Ico.warn   },
  ];

  const incompleteCount = finalStats?.incompleteCount ?? 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="space-y-4 -mt-1">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 flex-shrink-0">
            <div className="w-4.5 h-4.5">{Ico.globe}</div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-gray-900 truncate leading-tight">{source.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                phase === 'error' ? 'bg-red-500' :
                phase === 'finished' ? 'bg-emerald-500' :
                'bg-emerald-400 animate-pulse'
              }`}/>
              <span className="text-xs text-gray-500 truncate">
                {phase === 'discovering' ? 'Discovering listings…'
                 : phase === 'syncing' ? `Syncing ${stats.processed} / ${stats.fetched}`
                 : phase === 'finished' ? 'Import complete'
                 : 'Import failed'}
              </span>
              {sourceHost && <><span className="text-gray-300 text-xs">·</span><span className="text-xs text-gray-400 truncate">{sourceHost}</span></>}
            </div>
          </div>
        </div>

        {/* ── Crawl hero ── */}
        <CrawlHero
          phase={phase}
          fetched={stats.fetched}
          processed={stats.processed}
          currentTitle={current?.currentItem?.title}
          currentUrl={current?.currentItem?.url}
          sourceHost={sourceHost}
        />

        {/* ── Progress bar ── */}
        {phase !== 'error' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{stats.fetched > 0 ? `${stats.processed} of ${stats.fetched} listings processed` : 'Searching…'}</span>
              <span className="font-bold text-gray-700 tabular-nums">{phase === 'discovering' ? '…' : `${pct}%`}</span>
            </div>
            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
              {phase === 'discovering' ? (
                <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                     style={{ animation: 'scan-sweep 1.6s ease-in-out infinite' }}/>
              ) : (
                <>
                  <div className={`h-full rounded-full transition-all duration-500 ease-out ${
                    phase === 'finished' ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-400 to-blue-500'
                  }`} style={{ width: `${phase === 'finished' ? 100 : pct}%` }}/>
                  {phase === 'syncing' && (
                    <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                         style={{ animation: 'shimmer 1.8s linear infinite' }}/>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Error banner ── */}
        {phase === 'error' && errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-3">
            <div className="text-red-400 w-4 h-4 flex-shrink-0 mt-0.5">{Ico.warn}</div>
            <div>
              <p className="text-sm font-semibold text-red-900">{t('listingFeeds:syncFailed')}</p>
              <p className="text-xs text-red-700 mt-0.5 break-all">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <StatRow items={statItems} />

        {/* ── Monthly quota ── */}
        {monthlyUsage && monthlyUsage.monthlyAllowance > 0 && (
          <div className="bg-amber-50 border border-amber-200/60 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-amber-800">
              <span>{t('listingFeeds:monthlyLimit')}</span>
              <span className="tabular-nums">{monthlyUsage.monthlyAllowance - monthlyUsage.remaining} / {monthlyUsage.monthlyAllowance}</span>
            </div>
            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
                   style={{ width: `${Math.min(100, ((monthlyUsage.monthlyAllowance - monthlyUsage.remaining) / monthlyUsage.monthlyAllowance) * 100)}%` }}/>
            </div>
            {stats.deferred > 0 && (
              <p className="text-[11px] text-amber-700">{t('listingFeeds:deferredHint', { count: stats.deferred })}</p>
            )}
          </div>
        )}

        {/* ── Live feed ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {recentItems.length > 0 ? `${recentItems.length} listings processed` : 'Live activity'}
            </p>
            {isRunning && phase === 'syncing' && (
              <span className="text-[10px] text-emerald-600 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                live
              </span>
            )}
          </div>
          {recentItems.length === 0 ? (
            <div className="text-center py-7 bg-gray-50/70 rounded-xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-400">
                {phase === 'discovering' ? 'Looking for listings — this can take a minute on large sites.' :
                 phase === 'syncing' ? 'Waiting for first listing…' :
                 'No items processed.'}
              </p>
            </div>
          ) : (
            <div ref={feedRef} className="rounded-xl border border-gray-100 bg-white overflow-y-auto" style={{ maxHeight: 240 }}>
              {recentItems.slice().reverse().map((item, i) => (
                <FeedItem key={`${item.id}-${i}`} item={item} isFirst={i === 0 && isRunning} />
              ))}
            </div>
          )}
        </div>

        {/* ── Completion banners ── */}
        {phase === 'finished' && stats.imported > 0 && incompleteCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-3">
            <div className="text-amber-500 w-4 h-4 flex-shrink-0 mt-0.5">{Ico.warn}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">{t('listingFeeds:incompleteListingsTitle')}</p>
              <p className="text-xs text-amber-700 mt-0.5">{t('listingFeeds:incompleteListingsBody', { count: incompleteCount })}</p>
              <button type="button" onClick={() => { onClose(); dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'my-listings' }); }}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900">
                {t('listingFeeds:incompleteListingsReview')} {Ico.ext}
              </button>
            </div>
          </div>
        )}
        {phase === 'finished' && stats.imported > 0 && !incompleteCount && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex gap-3">
            <div className="text-emerald-500 w-4 h-4 flex-shrink-0 mt-0.5">{Ico.check}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-900">{t('listingFeeds:incompleteListingsTitle')}</p>
              <p className="text-xs text-emerald-700 mt-0.5">{t('listingFeeds:incompleteListingsBodyGeneric')}</p>
              <button type="button" onClick={() => { onClose(); dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'my-listings' }); }}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 underline underline-offset-2 hover:text-emerald-900">
                {t('listingFeeds:incompleteListingsReview')} {Ico.ext}
              </button>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 pt-1">
          {isRunning ? (
            <button type="button" onClick={onMinimize}
                    className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm">
              {t('listingFeeds:minimizeAndUseApp')}
            </button>
          ) : (
            <>
              {phase === 'error' && onRetry && (
                <button type="button" onClick={() => { onClose(); onRetry(); }}
                        className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
                  {t('common:tryAgain', 'Try again')}
                </button>
              )}
              <button type="button" onClick={onClose}
                      className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm">
                {t('common:close')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes radar-spin    { to { transform: rotate(360deg); } }
        @keyframes ring-expand   { 0% { transform: scale(0.4); opacity: 0.7; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes pulse-glow    { 0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.4); } 50% { box-shadow: 0 0 0 10px rgba(74,222,128,0); } }
        @keyframes pulse-dot     { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
        @keyframes scan-sweep    { 0% { left: -33%; } 100% { left: 110%; } }
        @keyframes shimmer       { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
        @keyframes blink-cursor  { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes slide-up-in   { from { transform: translateY(8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pop-in        { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </Modal>
  );
};

export default ListingIngestProgressModal;
