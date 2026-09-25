import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { importReviewKeys } from '@/src/shared/query/queryKeys';
import type { DraftPatch, DraftStatus, ImportedDraft } from '../api/importReviewApi';
import { listMyListingSources } from '../api/listingSourceApi';
import { IMPORT_REVIEW_PAGE_SIZE, useImportDrafts, useImportReviewActions } from './useImportReview';

export interface ReviewNotice {
  tone: 'success' | 'error';
  text: string;
}

const errorCode = (err: unknown): string | undefined => (err as { code?: string } | null)?.code ?? undefined;

/** State and actions for the imported-drafts review page. */
export const useImportReviewQueue = () => {
  const { t } = useTranslation('listingFeeds');
  const [status, setStatusState] = useState<DraftStatus>('pending');
  const [sourceId, setSourceIdState] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<ImportedDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [notice, setNotice] = useState<ReviewNotice | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const query = useImportDrafts({ status, sourceId: sourceId || undefined, page });
  const sourcesQuery = useQuery({ queryKey: importReviewKeys.sources(), queryFn: listMyListingSources });
  const { accept, reject, restore, edit, bulk } = useImportReviewActions();

  const drafts = useMemo(() => query.data?.drafts ?? [], [query.data]);
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / IMPORT_REVIEW_PAGE_SIZE));
  const sources = useMemo(
    () => (sourcesQuery.data ?? []).map((s) => ({ id: s.id, name: s.name })),
    [sourcesQuery.data]
  );

  // Selection only ever covers what is on screen.
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(drafts.map((d) => d.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [drafts]);

  // Stepping back when the last item on a page was handled.
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const messageFor = useCallback(
    (err: unknown) => (errorCode(err) === 'LISTING_LIMIT_REACHED' ? t('review.limitReached') : (err as Error).message),
    [t]
  );

  const runSingle = useCallback(
    async (id: string, action: (id: string) => Promise<unknown>) => {
      setBusyIds((prev) => new Set(prev).add(id));
      setNotice(null);
      try {
        await action(id);
      } catch (err) {
        setNotice({ tone: 'error', text: messageFor(err) });
      } finally {
        setBusyIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }
    },
    [messageFor]
  );

  const runBulk = useCallback(
    async (action: 'accept' | 'reject') => {
      const ids = [...selected];
      if (ids.length === 0) return;
      setNotice(null);
      try {
        const result = await bulk.mutateAsync({ ids, action });
        const limitHit = result.failed.some((f) => f.code === 'LISTING_LIMIT_REACHED');
        const summary = t('review.bulkResult', { ok: result.succeeded.length, failed: result.failed.length });
        setNotice({
          tone: result.failed.length ? 'error' : 'success',
          text: limitHit ? `${summary}. ${t('review.limitReached')}` : summary,
        });
        setSelected(new Set());
      } catch (err) {
        setNotice({ tone: 'error', text: messageFor(err) });
      }
    },
    [selected, bulk, t, messageFor]
  );

  const saveEdit = useCallback(
    async (patch: DraftPatch) => {
      if (!editing) return;
      setEditError(null);
      try {
        await edit.mutateAsync({ id: editing.id, data: patch });
        setEditing(null);
      } catch (err) {
        setEditError((err as Error).message);
      }
    },
    [editing, edit]
  );

  return {
    status,
    setStatus: (s: DraftStatus) => { setStatusState(s); setPage(1); setSelected(new Set()); },
    sourceId,
    setSourceId: (id: string) => { setSourceIdState(id); setPage(1); },
    page,
    pages,
    setPage,
    drafts,
    total,
    sources,
    isLoading: query.isLoading,
    isError: query.isError,
    selected,
    toggleSelected: (id: string) =>
      setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    toggleAll: () =>
      setSelected((prev) => (prev.size === drafts.length ? new Set() : new Set(drafts.map((d) => d.id)))),
    busyIds,
    bulkBusy: bulk.isPending,
    notice,
    dismissNotice: () => setNotice(null),
    acceptDraft: (id: string) => runSingle(id, accept.mutateAsync),
    rejectDraft: (id: string) => runSingle(id, reject.mutateAsync),
    restoreDraft: (id: string) => runSingle(id, restore.mutateAsync),
    runBulk,
    editing,
    editError,
    editSaving: edit.isPending,
    startEdit: (draft: ImportedDraft) => { setEditError(null); setEditing(draft); },
    cancelEdit: () => setEditing(null),
    saveEdit,
  };
};
