import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSocket } from '@/shared/hooks/useSocket';

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
}

interface ContextValue {
  sessions: Map<string, SyncSession>;
  registerSync: (sourceId: string, sourceName: string) => void;
  markDone: (sourceId: string) => void;
  failSession: (sourceId: string, errorMessage: string) => void;
  dismissSession: (sourceId: string) => void;
  getSession: (sourceId: string) => SyncSession | undefined;
}

const ListingIngestProgressContext = createContext<ContextValue | null>(null);

export const ListingIngestProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<Map<string, SyncSession>>(new Map());
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

  const value = useMemo<ContextValue>(
    () => ({ sessions, registerSync, markDone, failSession, dismissSession, getSession }),
    [sessions, registerSync, markDone, failSession, dismissSession, getSession]
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
