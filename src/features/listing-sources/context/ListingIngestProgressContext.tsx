import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSocket } from '@/shared/hooks/useSocket';
import {
  type IngestStats,
  type PreviewListing,
  type ImportJob,
  type PreviewJob,
  confirmMyListingSourceImport,
  getMyListingSourceImportJob,
  getMyListingSourcePreviewJob,
  startMyListingSourcePreview,
} from '../api/listingSourceApi';
import { useJobPolling, type JobWatch } from '../hooks/useJobPolling';
import { sessionFromImportJob } from '../utils/importJobSession';
import { listingFeedKeys } from '@/src/shared/query/queryKeys';

export interface ListingIngestProgressEvent {
  sourceId: string;
  fetched: number;
  processed: number;
  imported: number;
  updated: number;
  failed: number;
  deferred?: number;
  done?: boolean;
  message?: string;
  /** User-owned feed: counts are listings sent to the review queue. */
  reviewMode?: boolean;
  pendingReview?: number;
  currentItem?: {
    id: string;
    title?: string;
    url?: string;
  };
  monthlyUsage?: {
    monthlyAllowance: number;
    remaining: number;
  };
  timestamp: string;
}

export interface ProcessedItem {
  id: string;
  title?: string;
  url?: string;
  status: 'imported' | 'updated' | 'deferred' | 'failed';
}

export interface SyncSession {
  sourceId: string;
  sourceName: string;
  /** When the session was first registered (sync started). */
  startedAt: number;
  /** Latest progress event for this source. null until the first event arrives. */
  current: ListingIngestProgressEvent | null;
  /** Newest-last list of items, capped at 100. */
  recentItems: ProcessedItem[];
  /** Set to false once the user dismisses the session (after completion). */
  isDone: boolean;
  /** Once true, a dock notification has been shown for this completion. */
  notified: boolean;
  /** Final ingest stats captured from the API response (confirm-import path). */
  finalStats?: IngestStats;
  /** Server job running the import, polled for progress until it finishes. */
  jobId?: string;
}

export interface PendingPreview {
  sourceId: string;
  sourceName: string;
  previewId: string;
  items: PreviewListing[];
}

export interface FetchingPreview {
  sourceId: string;
  sourceName: string;
  startedAt: number;
  /** Server job running the fetch; unset until the server has accepted it. */
  jobId?: string;
  /** Listings found so far on the source's catalogue pages. */
  found: number;
  /** Listing pages read so far. */
  detailsFetched: number;
}

interface PreviewWaiter {
  sourceName: string;
  resolve: () => void;
  reject: (err: Error) => void;
}

interface ContextValue {
  sessions: Map<string, SyncSession>;
  registerSync: (sourceId: string, sourceName: string) => void;
  markDone: (sourceId: string) => void;
  failSession: (sourceId: string, errorMessage: string) => void;
  dismissSession: (sourceId: string) => void;
  getSession: (sourceId: string) => SyncSession | undefined;
  // ── Preview state (shared across the whole app) ──────────────────────────
  pendingPreview: PendingPreview | null;
  fetchingPreviews: Map<string, FetchingPreview>;
  /** Kick off a preview fetch. Resolves once the modal is queued or rejects on failure. */
  startPreview: (sourceId: string, sourceName: string, limit?: number) => Promise<void>;
  /** Confirm the currently-pending preview. Closes the modal immediately and runs the import in the background via the dock. */
  confirmPreview: (approvedIds: string[]) => void;
  /** Close the modal without importing. */
  cancelPreview: () => void;
  /** Subscribe to "import confirmed" events so a feature page can refresh its list. */
  onImportConfirmed: (handler: (sourceId: string) => void) => () => void;
}

const ListingIngestProgressContext = createContext<ContextValue | null>(null);

export const ListingIngestProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<Map<string, SyncSession>>(new Map());
  const [pendingPreview, setPendingPreview] = useState<PendingPreview | null>(null);
  const [fetchingPreviews, setFetchingPreviews] = useState<Map<string, FetchingPreview>>(new Map());
  const [importHandlers] = useState<Set<(sourceId: string) => void>>(() => new Set());
  const socket = useSocket();

  const registerSync = useCallback((sourceId: string, sourceName: string) => {
    setSessions((prev) => {
      const next = new Map(prev);
      next.set(sourceId, {
        sourceId,
        sourceName,
        startedAt: Date.now(),
        current: null,
        recentItems: [],
        isDone: false,
        notified: false,
      });
      return next;
    });
  }, []);

  const markDone = useCallback((sourceId: string) => {
    setSessions((prev) => {
      const existing = prev.get(sourceId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(sourceId, { ...existing, isDone: true });
      return next;
    });
  }, []);

  const failSession = useCallback((sourceId: string, errorMessage: string) => {
    setSessions((prev) => {
      const existing = prev.get(sourceId);
      if (!existing) return prev;
      const next = new Map(prev);
      // Synthesise a "done with error" event so the dock/modal pick up the
      // failure even when no socket events arrived (e.g. immediate HTTP 4xx).
      const synthetic: ListingIngestProgressEvent = {
        sourceId,
        fetched: existing.current?.fetched ?? 0,
        processed: existing.current?.processed ?? 0,
        imported: existing.current?.imported ?? 0,
        updated: existing.current?.updated ?? 0,
        failed: existing.current?.failed ?? 0,
        deferred: existing.current?.deferred ?? 0,
        done: true,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      };
      next.set(sourceId, { ...existing, current: synthetic, isDone: true });
      return next;
    });
  }, []);

  const dismissSession = useCallback((sourceId: string) => {
    setSessions((prev) => {
      if (!prev.has(sourceId)) return prev;
      const next = new Map(prev);
      next.delete(sourceId);
      return next;
    });
  }, []);

  const getSession = useCallback((sourceId: string) => sessions.get(sourceId), [sessions]);

  useEffect(() => {
    if (!socket) return;

    const handleProgress = (event: ListingIngestProgressEvent) => {
      setSessions((prev) => {
        const existing = prev.get(event.sourceId);
        if (!existing) return prev; // ignore events for sessions we haven't registered

        // Determine the latest item's status by comparing counters
        const prevImported = existing.current?.imported ?? 0;
        const prevUpdated = existing.current?.updated ?? 0;
        const prevDeferred = existing.current?.deferred ?? 0;
        const prevFailed = existing.current?.failed ?? 0;

        let status: ProcessedItem['status'] | null = null;
        if (event.imported > prevImported) status = 'imported';
        else if (event.updated > prevUpdated) status = 'updated';
        else if ((event.deferred ?? 0) > prevDeferred) status = 'deferred';
        else if (event.failed > prevFailed) status = 'failed';

        let recentItems = existing.recentItems;
        if (status && event.currentItem) {
          recentItems = [
            ...recentItems,
            {
              id: event.currentItem.id,
              title: event.currentItem.title,
              url: event.currentItem.url,
              status,
            } satisfies ProcessedItem,
          ];
          if (recentItems.length > 100) recentItems = recentItems.slice(-100);
        }

        const next = new Map(prev);
        next.set(event.sourceId, {
          ...existing,
          current: event,
          recentItems,
          isDone: existing.isDone || Boolean(event.done),
        });
        return next;
      });
    };

    socket.on('listing:ingestProgress', handleProgress);
    return () => {
      socket.off('listing:ingestProgress', handleProgress);
    };
  }, [socket]);

  // One pending promise per fetch: startPreview resolves once the review is
  // ready, or rejects with the reason, however long the server takes.
  const waiters = useRef(new Map<string, PreviewWaiter>());

  const stopFetching = useCallback((sourceId: string) => {
    setFetchingPreviews((prev) => {
      if (!prev.has(sourceId)) return prev;
      const next = new Map(prev);
      next.delete(sourceId);
      return next;
    });
  }, []);

  const applyJob = useCallback(
    (sourceId: string, job: PreviewJob) => {
      if (job.status === 'running') {
        setFetchingPreviews((prev) => {
          const existing = prev.get(sourceId);
          if (!existing) return prev;
          if (existing.jobId === job.jobId && existing.found === job.found && existing.detailsFetched === job.detailsFetched) {
            return prev;
          }
          const next = new Map(prev);
          next.set(sourceId, { ...existing, jobId: job.jobId, found: job.found, detailsFetched: job.detailsFetched });
          return next;
        });
        return;
      }
      const waiter = waiters.current.get(sourceId);
      if (!waiter) return; // already settled
      waiters.current.delete(sourceId);
      stopFetching(sourceId);
      if (job.status === 'done') {
        setPendingPreview({
          sourceId,
          sourceName: waiter.sourceName,
          previewId: job.result.previewId,
          items: job.result.items,
        });
        waiter.resolve();
      } else {
        waiter.reject(new Error(job.error));
      }
    },
    [stopFetching]
  );

  const failFetch = useCallback(
    (sourceId: string, error: Error) => {
      const waiter = waiters.current.get(sourceId);
      waiters.current.delete(sourceId);
      stopFetching(sourceId);
      waiter?.reject(error);
    },
    [stopFetching]
  );

  const previewWatches = useMemo<JobWatch[]>(
    () =>
      Array.from(fetchingPreviews.values())
        .filter((f): f is FetchingPreview & { jobId: string } => Boolean(f.jobId))
        .map((f) => ({ sourceId: f.sourceId, jobId: f.jobId })),
    [fetchingPreviews]
  );
  useJobPolling<PreviewJob>({
    watches: previewWatches,
    queryKey: (w) => listingFeedKeys.previewJob(w.sourceId, w.jobId),
    fetchJob: (w) => getMyListingSourcePreviewJob(w.sourceId, w.jobId),
    onJob: applyJob,
    onError: failFetch,
  });

  const startPreview = useCallback(
    (sourceId: string, sourceName: string, limit?: number): Promise<void> => {
      if (waiters.current.has(sourceId)) return Promise.resolve(); // already fetching
      setFetchingPreviews((prev) => {
        const next = new Map(prev);
        next.set(sourceId, { sourceId, sourceName, startedAt: Date.now(), found: 0, detailsFetched: 0 });
        return next;
      });
      const done = new Promise<void>((resolve, reject) => {
        waiters.current.set(sourceId, { sourceName, resolve, reject });
      });
      startMyListingSourcePreview(sourceId, { limit })
        .then((job) => {
          setFetchingPreviews((prev) => {
            const existing = prev.get(sourceId);
            if (!existing) return prev;
            const next = new Map(prev);
            next.set(sourceId, { ...existing, jobId: job.jobId });
            return next;
          });
          applyJob(sourceId, job);
        })
        .catch((err: unknown) => failFetch(sourceId, err instanceof Error ? err : new Error('Failed to fetch listings')));
      return done;
    },
    [applyJob, failFetch]
  );

  const cancelPreview = useCallback(() => {
    setPendingPreview(null);
  }, []);

  /** Every new state of an import job, from polling. */
  const finishedImports = useRef(new Set<string>());
  const applyImportJob = useCallback(
    (sourceId: string, job: ImportJob) => {
      setSessions((prev) => {
        const existing = prev.get(sourceId);
        if (!existing || (existing.jobId && existing.jobId !== job.jobId)) return prev;
        const next = new Map(prev);
        next.set(sourceId, sessionFromImportJob(existing, job));
        return next;
      });
      if (job.status === 'done' && !finishedImports.current.has(job.jobId)) {
        finishedImports.current.add(job.jobId);
        for (const handler of importHandlers) handler(sourceId);
      }
    },
    [importHandlers]
  );

  const importWatches = useMemo<JobWatch[]>(
    () =>
      Array.from(sessions.values())
        .filter((s): s is SyncSession & { jobId: string } => Boolean(s.jobId) && !s.isDone)
        .map((s) => ({ sourceId: s.sourceId, jobId: s.jobId })),
    [sessions]
  );
  useJobPolling<ImportJob>({
    watches: importWatches,
    queryKey: (w) => listingFeedKeys.importJob(w.sourceId, w.jobId),
    fetchJob: (w) => getMyListingSourceImportJob(w.sourceId, w.jobId),
    onJob: applyImportJob,
    onError: (sourceId, err) => failSession(sourceId, err.message || 'Import failed'),
  });

  const confirmPreview = useCallback(
    (approvedIds: string[]): void => {
      const preview = pendingPreview;
      if (!preview) return;
      const { sourceId, sourceName, previewId } = preview;

      // Register the dock session and close the modal immediately so the user
      // isn't stuck watching a spinner. The import runs on the server as a job;
      // polling it fills the dock card and progress window.
      registerSync(sourceId, sourceName);
      setPendingPreview(null);

      confirmMyListingSourceImport(sourceId, previewId, approvedIds)
        .then((result) => {
          if (result.job) {
            applyImportJob(sourceId, result.job);
            return;
          }
          // Nothing was approved: the server answered with empty stats.
          setSessions((prev) => {
            const existing = prev.get(sourceId);
            if (!existing) return prev;
            const next = new Map(prev);
            next.set(sourceId, { ...existing, finalStats: result.stats });
            return next;
          });
          markDone(sourceId);
        })
        .catch((err) => {
          failSession(sourceId, (err as Error).message || 'Import failed');
        });
    },
    [pendingPreview, registerSync, markDone, failSession, applyImportJob]
  );


  const onImportConfirmed = useCallback(
    (handler: (sourceId: string) => void): (() => void) => {
      importHandlers.add(handler);
      return () => {
        importHandlers.delete(handler);
      };
    },
    [importHandlers]
  );

  const value = useMemo<ContextValue>(
    () => ({
      sessions,
      registerSync,
      markDone,
      failSession,
      dismissSession,
      getSession,
      pendingPreview,
      fetchingPreviews,
      startPreview,
      confirmPreview,
      cancelPreview,
      onImportConfirmed,
    }),
    [
      sessions,
      registerSync,
      markDone,
      failSession,
      dismissSession,
      getSession,
      pendingPreview,
      fetchingPreviews,
      startPreview,
      confirmPreview,
      cancelPreview,
      onImportConfirmed,
    ]
  );

  return (
    <ListingIngestProgressContext.Provider value={value}>
      {children}
    </ListingIngestProgressContext.Provider>
  );
};

export const useListingIngestProgressContext = (): ContextValue => {
  const ctx = useContext(ListingIngestProgressContext);
  if (!ctx) {
    throw new Error('useListingIngestProgressContext must be used within ListingIngestProgressProvider');
  }
  return ctx;
};

/** Convenience hook for a single source's session. */
export const useSyncSession = (sourceId?: string): SyncSession | undefined => {
  const { sessions } = useListingIngestProgressContext();
  return sourceId ? sessions.get(sourceId) : undefined;
};
