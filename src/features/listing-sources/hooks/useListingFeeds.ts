import { useCallback, useEffect, useState } from 'react';
import {
  type IngestStats,
  type ListingSource,
  listMyListingSources,
  deleteMyListingSource,
  runMyListingSource,
  updateMyListingSource,
} from '../api/listingSourceApi';

export interface UseListingFeedsReturn {
  sources: ListingSource[];
  loading: boolean;
  error: string | null;
  runningIds: Set<string>;
  deletingIds: Set<string>;
  togglingIds: Set<string>;
  lastRun: Record<string, IngestStats>;
  refresh: () => Promise<void>;
  deleteFeed: (id: string) => Promise<void>;
  runFeed: (id: string) => Promise<void>;
  toggleEnabled: (source: ListingSource) => Promise<void>;
  upsertFeed: (source: ListingSource) => void;
  clearError: () => void;
}

export const useListingFeeds = (): UseListingFeedsReturn => {
  const [sources, setSources] = useState<ListingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [lastRun, setLastRun] = useState<Record<string, IngestStats>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSources(await listMyListingSources());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const upsertFeed = useCallback((source: ListingSource) => {
    setSources((prev) => {
      const idx = prev.findIndex((s) => s.id === source.id);
      if (idx === -1) return [source, ...prev];
      const next = [...prev];
      next[idx] = source;
      return next;
    });
  }, []);

  const deleteFeed = useCallback(async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    setError(null);
    try {
      await deleteMyListingSource(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, []);

  const runFeed = useCallback(async (id: string) => {
    setRunningIds((prev) => new Set(prev).add(id));
    setError(null);
    try {
      const stats = await runMyListingSource(id);
      setLastRun((prev) => ({ ...prev, [id]: stats }));
      // Refresh counters on the source without a full reload
      const updated = await listMyListingSources();
      setSources(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunningIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, []);

  const toggleEnabled = useCallback(async (source: ListingSource) => {
    setTogglingIds((prev) => new Set(prev).add(source.id));
    setError(null);
    try {
      const updated = await updateMyListingSource(source.id, { enabled: !source.enabled });
      setSources((prev) => prev.map((s) => (s.id === source.id ? updated : s)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTogglingIds((prev) => { const n = new Set(prev); n.delete(source.id); return n; });
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    sources,
    loading,
    error,
    runningIds,
    deletingIds,
    togglingIds,
    lastRun,
    refresh,
    deleteFeed,
    runFeed,
    toggleEnabled,
    upsertFeed,
    clearError,
  };
};
