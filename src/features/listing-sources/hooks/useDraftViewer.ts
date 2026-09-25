import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ImportedDraft } from '../api/importReviewApi';
import type { ReviewDecision, ReviewMode } from '../types/review';
import { IMPORT_REVIEW_PAGE_SIZE } from './useImportReview';

interface ViewerOptions {
  drafts: ImportedDraft[];
  page: number;
  /** Page the current `drafts` belong to (the list keeps the old page while loading). */
  loadedPage: number | undefined;
  pages: number;
  total: number;
  setPage: (page: number) => void;
  /** Runs a decision; resolves to an error message, or null on success. */
  decide: (decision: ReviewDecision, id: string) => Promise<string | null>;
}

/**
 * Which draft is open in the full-size review, and walking through the queue
 * from it — across page boundaries, and on to the next draft once one is
 * decided, so a whole import can be reviewed without closing the view.
 */
export const useDraftViewer = ({ drafts: listed, page, loadedPage, pages, total, setPage, decide }: ViewerOptions) => {
  const [viewing, setViewing] = useState<{ id: string; mode: ReviewMode } | null>(null);
  const [pendingEdge, setPendingEdge] = useState<{ edge: 'first' | 'last'; page: number } | null>(null);
  const [decided, setDecided] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The list refetches after each decision; until it does, drafts already
  // decided here must not be offered as the next one to review.
  const drafts = useMemo(() => listed.filter((d) => !decided.has(d.id)), [listed, decided]);
  const index = viewing ? drafts.findIndex((d) => d.id === viewing.id) : -1;

  // After paging from the viewer, open the draft at the new page's edge —
  // once that page's data has actually arrived.
  useEffect(() => {
    if (!pendingEdge || page !== pendingEdge.page || loadedPage !== pendingEdge.page || drafts.length === 0) return;
    const target = pendingEdge.edge === 'first' ? drafts[0] : drafts[drafts.length - 1];
    setViewing((v) => ({ id: target.id, mode: v?.mode ?? 'preview' }));
    setPendingEdge(null);
  }, [drafts, pendingEdge, loadedPage, page]);

  // `decided` only spans one continuous review session.
  const open = useCallback((id: string, mode: ReviewMode = 'preview') => {
    setError(null);
    setDecided(new Set());
    setViewing({ id, mode });
  }, []);

  const close = useCallback(() => {
    setViewing(null);
    setDecided(new Set());
  }, []);

  const move = useCallback(
    (delta: 1 | -1) => {
      setError(null);
      const target = drafts[index + delta];
      if (target) setViewing({ id: target.id, mode: 'preview' });
      else if (delta === 1 && page < pages) { setPendingEdge({ edge: 'first', page: page + 1 }); setPage(page + 1); }
      else if (delta === -1 && page > 1) { setPendingEdge({ edge: 'last', page: page - 1 }); setPage(page - 1); }
    },
    [drafts, index, page, pages, setPage]
  );

  const onDecision = useCallback(
    async (decision: ReviewDecision) => {
      if (!viewing) return;
      // Decided drafts leave this list, so the neighbour becomes the next one to review.
      const neighbour = drafts[index + 1] ?? drafts[index - 1];
      setBusy(true);
      setError(null);
      const failure = await decide(decision, viewing.id);
      setBusy(false);
      if (failure) {
        setError(failure);
        return;
      }
      setDecided((prev) => new Set(prev).add(viewing.id));
      if (neighbour) setViewing({ id: neighbour.id, mode: 'preview' });
      else setViewing(null);
    },
    [viewing, drafts, index, decide]
  );

  const globalIndex = (page - 1) * IMPORT_REVIEW_PAGE_SIZE + Math.max(index, 0);
  // Decisions the server total doesn't reflect yet (list not refetched).
  const staleDecided = listed.length - drafts.length;
  return {
    viewing,
    position: { index: globalIndex, total: Math.max(total - staleDecided, globalIndex + 1) },
    hasPrev: index > 0 || page > 1,
    hasNext: (index >= 0 && index < drafts.length - 1) || page < pages,
    busy,
    error,
    open,
    close,
    prev: () => move(-1),
    next: () => move(1),
    onDecision,
  };
};
