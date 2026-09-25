import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { importReviewKeys, propertyKeys } from '@/src/shared/query/queryKeys';
import {
  type DraftPatch,
  type DraftStatus,
  acceptImportDraft,
  bulkReviewImportDrafts,
  getImportDraft,
  getPendingImportCount,
  listImportDrafts,
  rejectImportDraft,
  restoreImportDraft,
  updateImportDraft,
} from '../api/importReviewApi';

export const IMPORT_REVIEW_PAGE_SIZE = 20;

export const useImportDrafts = (filters: { status: DraftStatus; sourceId?: string; page: number }) =>
  useQuery({
    queryKey: importReviewKeys.list(filters),
    queryFn: () => listImportDrafts({ ...filters, limit: IMPORT_REVIEW_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

/** One draft with its full listing, for the full-size review view. */
export const useImportDraft = (id: string | null) =>
  useQuery({
    queryKey: importReviewKeys.detail(id ?? ''),
    queryFn: () => getImportDraft(id as string),
    enabled: Boolean(id),
  });

/** Pending-review count for the account sidebar badge. */
export const usePendingImportCount = (enabled = true) =>
  useQuery({
    queryKey: importReviewKeys.count(),
    queryFn: getPendingImportCount,
    enabled,
    staleTime: 60_000,
  });

/**
 * Every mutation that changes the queue refreshes the lists and the badge;
 * publishing also refreshes property queries so "My Listings" picks it up.
 */
const useReviewMutation = <TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
  { publishes = false } = {}
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: importReviewKeys.all });
      if (publishes) void queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
};

export const useImportReviewActions = () => {
  const accept = useReviewMutation((id: string) => acceptImportDraft(id), { publishes: true });
  const reject = useReviewMutation((id: string) => rejectImportDraft(id));
  const restore = useReviewMutation((id: string) => restoreImportDraft(id));
  const edit = useReviewMutation(({ id, data }: { id: string; data: DraftPatch }) => updateImportDraft(id, data));
  const bulk = useReviewMutation(
    ({ ids, action }: { ids: string[]; action: 'accept' | 'reject' }) => bulkReviewImportDrafts(ids, action),
    { publishes: true }
  );
  return { accept, reject, restore, edit, bulk };
};
