import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSocket } from '@/shared/hooks/useSocket';
import {
  type IngestStats,
  type PreviewListing,
  confirmMyListingSourceImport,
  previewMyListingSource,
} from '../api/listingSourceApi';

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
  confirmingPreview: boolean;
  /** Kick off a preview fetch. Resolves once the modal is queued or rejects on failure. */
  startPreview: (sourceId: string, sourceName: string, limit?: number) => Promise<void>;
  /** Confirm the currently-pending preview, importing the approved subset. */
  confirmPreview: (approvedIds: string[]) => Promise<IngestStats | null>;
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
  const [confirmingPreview, setConfirmingPreview] = useState(false);
  const [confirmingSourceId, setConfirmingSourceId] = useState<string | null>(null);
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

  // When a confirmed import's session completes, close the preview modal and
  // refresh the sources list. This ensures the modal stays open while the
  // actual import is running, preventing a race where items appear before
  // the modal closes.
  useEffect(() => {
    if (!confirmingSourceId || !pendingPreview) return;

    const session = sessions.get(confirmingSourceId);
    if (session?.isDone) {
      setPendingPreview(null);
      setConfirmingSourceId(null);
      for (const handler of importHandlers) handler(confirmingSourceId);
    }
  }, [confirmingSourceId, pendingPreview, sessions, importHandlers]);

  const startPreview = useCallback(
    async (sourceId: string, sourceName: string, limit = 100): Promise<void> => {
      setFetchingPreviews((prev) => {
        const next = new Map(prev);
        next.set(sourceId, { sourceId, sourceName, startedAt: Date.now() });
        return next;
      });
      try {
        const result = await previewMyListingSource(sourceId, { limit });
        setPendingPreview({
          sourceId,
          sourceName,
          previewId: result.previewId,
          items: result.items,
        });
      } finally {
        setFetchingPreviews((prev) => {
          if (!prev.has(sourceId)) return prev;
          const next = new Map(prev);
          next.delete(sourceId);
          return next;
        });
      }
    },
    []
  );

  const cancelPreview = useCallback(() => {
    setPendingPreview(null);
  }, []);

  const confirmPreview = useCallback(
    async (approvedIds: string[]): Promise<IngestStats | null> => {
      const preview = pendingPreview;
      if (!preview) return null;
      const { sourceId, sourceName, previewId } = preview;
      setConfirmingPreview(true);
      setConfirmingSourceId(sourceId);
      // Register the sync session immediately so the dock transitions from
      // "review" → "syncing" without a gap.
      registerSync(sourceId, sourceName);
      try {
        const result = await confirmMyListingSourceImport(sourceId, previewId, approvedIds);
        // Store final stats in the session so the dock modal can display them
        // even after socket events are gone (the "keep track of it" case).
        setSessions((prev) => {
          const existing = prev.get(sourceId);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(sourceId, { ...existing, finalStats: result.stats });
          return next;
        });
        // The HTTP response returning guarantees the backend has finished
        // running runSource (the controller awaits it). Mark the session done
        // here as a safety net in case the final socket event was missed or
        // arrived before the session was registered.
        markDone(sourceId);
        return result.stats;
      } catch (err) {
        failSession(sourceId, (err as Error).message || 'Import failed');
        setConfirmingSourceId(null);
        throw err;
      } finally {
        setConfirmingPreview(false);
      }
    },
    [pendingPreview, registerSync, markDone, failSession]
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
      confirmingPreview,
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
      confirmingPreview,
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
