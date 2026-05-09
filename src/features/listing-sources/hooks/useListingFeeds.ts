import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type IngestStats,
  type ListingSource,
  type PreviewListing,
  type PreviewResult,
  bulkDeleteMyListingSources,
  clearMyListingSourceImports,
  confirmMyListingSourceImport,
  deleteMyListingSource,
  listMyListingSources,
  previewMyListingSource,
  runMyListingSource,
  updateMyListingSource,
} from '../api/listingSourceApi';
import { useListingIngestProgressContext } from '../context/ListingIngestProgressContext';

export interface PendingPreview {
  sourceId: string;
  sourceName: string;
  previewId: string;
  items: PreviewListing[];
}

export interface UseListingFeedsReturn {
  // Data
  sources: ListingSource[];
  loading: boolean;
  error: string | null;
  // Per-row operation state
  runningIds: Set<string>;
  previewingIds: Set<string>;
  deletingIds: Set<string>;
  togglingIds: Set<string>;
  clearingIds: Set<string>;
  lastRun: Record<string, IngestStats>;
  // Preview state
  pendingPreview: PendingPreview | null;
  confirmingPreview: boolean;
  // Selection state (for bulk ops)
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  bulkDeleting: boolean;
  // Single-source actions
  refresh: () => Promise<void>;
  deleteFeed: (id: string) => Promise<void>;
  runFeed: (id: string) => void;
  previewFeed: (id: string) => void;
  confirmFeed: (approvedIds: string[]) => void;
  cancelPreview: () => void;
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
  const [previewingIds, setPreviewingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [clearingIds, setClearingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [lastRun, setLastRun] = useState<Record<string, IngestStats>>({});
  const [pendingPreview, setPendingPreview] = useState<PendingPreview | null>(null);
  const [confirmingPreview, setConfirmingPreview] = useState(false);
  const { registerSync, failSession } = useListingIngestProgressContext();

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

  /**
   * Fire-and-forget direct sync (bypasses review). Kept for backwards compat
   * and for future "force sync" scenarios where review is skipped intentionally.
   */
  const runFeed = useCallback((id: string): void => {
    const source = sources.find((s) => s.id === id);
    if (!source) return;

    setRunningIds((prev) => new Set(prev).add(id));
    setError(null);
    registerSync(id, source.name);

    void (async () => {
      try {
        const stats = await runMyListingSource(id);
        setLastRun((prev) => ({ ...prev, [id]: stats }));
        try {
          setSources(await listMyListingSources());
        } catch { /* listing refresh failure shouldn't surface as a sync error */ }
      } catch (e) {
        const msg = (e as Error).message || 'Sync failed';
        setError(msg);
        failSession(id, msg);
      } finally {
        setRunningIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }
    })();
  }, [sources, registerSync, failSession]);

  /**
   * Fetch listings from the source and open the review modal so the user can
   * choose which ones to import. Does NOT save anything until confirmFeed().
   */
  const previewFeed = useCallback((id: string): void => {
    const source = sources.find((s) => s.id === id);
    if (!source) return;

    setPreviewingIds((prev) => new Set(prev).add(id));
    setError(null);

    void (async () => {
      try {
        const result: PreviewResult = await previewMyListingSource(id, { limit: 100 });
        setPendingPreview({
          sourceId: id,
          sourceName: source.name,
          previewId: result.previewId,
          items: result.items,
        });
      } catch (e) {
        setError((e as Error).message || 'Failed to fetch listings');
      } finally {
        setPreviewingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }
    })();
  }, [sources]);

  /**
   * Import the listings the user approved in the review modal.
   * Triggers the normal socket-based progress flow.
   */
  const confirmFeed = useCallback((approvedIds: string[]): void => {
    if (!pendingPreview) return;
    const { sourceId, sourceName, previewId } = pendingPreview;

    setPendingPreview(null);
    setConfirmingPreview(true);
    setRunningIds((prev) => new Set(prev).add(sourceId));
    registerSync(sourceId, sourceName);

    void (async () => {
      try {
        const { stats } = await confirmMyListingSourceImport(sourceId, previewId, approvedIds);
        setLastRun((prev) => ({ ...prev, [sourceId]: stats }));
        try {
          setSources(await listMyListingSources());
        } catch { /* refresh failure non-fatal */ }
      } catch (e) {
        const msg = (e as Error).message || 'Import failed';
        setError(msg);
        failSession(sourceId, msg);
      } finally {
        setConfirmingPreview(false);
        setRunningIds((prev) => { const n = new Set(prev); n.delete(sourceId); return n; });
      }
    })();
  }, [pendingPreview, registerSync, failSession]);

  const cancelPreview = useCallback(() => {
    setPendingPreview(null);
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
    previewingIds,
    deletingIds,
    togglingIds,
    clearingIds,
    lastRun,
    pendingPreview,
    confirmingPreview,
    selectedIds,
    isAllSelected,
    isSomeSelected,
    bulkDeleting,
    refresh,
    deleteFeed,
    runFeed,
    previewFeed,
    confirmFeed,
    cancelPreview,
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
