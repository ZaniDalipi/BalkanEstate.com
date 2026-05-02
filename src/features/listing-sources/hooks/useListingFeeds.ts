import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type IngestStats,
  type ListingSource,
  bulkDeleteMyListingSources,
  clearMyListingSourceImports,
  deleteMyListingSource,
  listMyListingSources,
  runMyListingSource,
  updateMyListingSource,
} from '../api/listingSourceApi';

export interface UseListingFeedsReturn {
  // Data
  sources: ListingSource[];
  loading: boolean;
  error: string | null;
  // Per-row operation state
  runningIds: Set<string>;
  deletingIds: Set<string>;
  togglingIds: Set<string>;
  clearingIds: Set<string>;
  lastRun: Record<string, IngestStats>;
  // Selection state (for bulk ops)
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  bulkDeleting: boolean;
  // Single-source actions
  refresh: () => Promise<void>;
  deleteFeed: (id: string) => Promise<void>;
  runFeed: (id: string) => Promise<void>;
  toggleEnabled: (source: ListingSource) => Promise<void>;
  clearImports: (id: string) => Promise<void>;
  upsertFeed: (source: ListingSource) => void;
  // Selection actions
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  bulkDeleteSelected: () => Promise<void>;
  // Misc
  clearError: () => void;
}

export const useListingFeeds = (): UseListingFeedsReturn => {
  const [sources, setSources] = useState<ListingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [clearingIds, setClearingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
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

  // Prune selection when sources list changes (deleted ids should drop out).
  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(sources.map((s) => s.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (valid.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [sources]);

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
      setSources(await listMyListingSources());
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

  const clearImports = useCallback(async (id: string) => {
    setClearingIds((prev) => new Set(prev).add(id));
    setError(null);
    try {
      const { source } = await clearMyListingSourceImports(id);
      setSources((prev) => prev.map((s) => (s.id === source.id ? source : s)));
      setLastRun((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setClearingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, []);

  // ── Selection ──────────────────────────────────────────────────────────────

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(sources.map((s) => s.id)));
  }, [sources]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const bulkDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setBulkDeleting(true);
    setError(null);
    try {
      await bulkDeleteMyListingSources(ids);
      setSources((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedIds]);

  const clearError = useCallback(() => setError(null), []);

  const isAllSelected = useMemo(
    () => sources.length > 0 && selectedIds.size === sources.length,
    [sources, selectedIds]
  );
  const isSomeSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < sources.length,
    [sources, selectedIds]
  );

  return {
    sources,
    loading,
    error,
    runningIds,
    deletingIds,
    togglingIds,
    clearingIds,
    lastRun,
    selectedIds,
    isAllSelected,
    isSomeSelected,
    bulkDeleting,
    refresh,
    deleteFeed,
    runFeed,
    toggleEnabled,
    clearImports,
    upsertFeed,
    toggleSelected,
    selectAll,
    clearSelection,
    bulkDeleteSelected,
    clearError,
  };
};
