import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agencyDashboardKeys } from '../api/agencyDashboardKeys';
import * as api from '../api/propertyImportsApi';
import type { FeedPayload } from '../api/propertyImportsApi';
import { ACTIVE_RUN_STATUSES, type AgencyFeed, type FeedRun } from '../types/propertyImports';

/** While an import is queued or running, poll so progress and results appear without a reload. */
const POLL_MS = 4000;

const isRunActive = (run?: FeedRun | null) => Boolean(run && ACTIVE_RUN_STATUSES.includes(run.status));

export function useFeedMeta(agencyId: string) {
  return useQuery({
    queryKey: agencyDashboardKeys.feedMeta(agencyId),
    queryFn: () => api.getFeedMeta(agencyId),
    staleTime: 60 * 60 * 1000,
    enabled: !!agencyId,
  });
}

export function useAgencyFeeds(agencyId: string) {
  return useQuery<{ feeds: AgencyFeed[]; workerOnline: boolean }>({
    queryKey: agencyDashboardKeys.feeds(agencyId),
    queryFn: () => api.listFeeds(agencyId),
    enabled: !!agencyId,
    refetchInterval: (query) => (query.state.data?.feeds.some((f) => f.activeJob) ? POLL_MS : false),
  });
}

export function useFeedRuns(agencyId: string, feedId: string | null) {
  return useQuery<FeedRun[]>({
    queryKey: agencyDashboardKeys.feedRuns(agencyId, feedId ?? ''),
    queryFn: () => api.listFeedRuns(agencyId, feedId as string),
    enabled: !!agencyId && !!feedId,
    refetchInterval: (query) => (isRunActive(query.state.data?.[0]) ? POLL_MS : false),
  });
}

export function useFeedRun(agencyId: string, feedId: string | null, runId: string | null) {
  return useQuery<FeedRun>({
    queryKey: agencyDashboardKeys.feedRun(agencyId, feedId ?? '', runId ?? ''),
    queryFn: () => api.getFeedRun(agencyId, feedId as string, runId as string),
    enabled: !!agencyId && !!feedId && !!runId,
    refetchInterval: (query) => (isRunActive(query.state.data) ? POLL_MS : false),
  });
}

export function useFeedMutations(agencyId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: agencyDashboardKeys.feeds(agencyId) });
  const options = { onSuccess: refresh };

  return {
    create: useMutation({ mutationFn: (payload: FeedPayload) => api.createFeed(agencyId, payload), ...options }),
    update: useMutation({
      mutationFn: ({ feedId, payload }: { feedId: string; payload: FeedPayload }) => api.updateFeed(agencyId, feedId, payload),
      ...options,
    }),
    remove: useMutation({ mutationFn: (feedId: string) => api.deleteFeed(agencyId, feedId), ...options }),
    preview: useMutation({ mutationFn: (feedId: string) => api.requestPreview(agencyId, feedId), ...options }),
    sync: useMutation({ mutationFn: (feedId: string) => api.requestSync(agencyId, feedId), ...options }),
    activate: useMutation({
      mutationFn: ({ feedId, acceptListingLimit }: { feedId: string; acceptListingLimit: boolean }) =>
        api.activateFeed(agencyId, feedId, { confirmAuthorized: true, acceptListingLimit }),
      ...options,
    }),
    upload: useMutation({
      mutationFn: ({ feedId, file, filename, previewOnly }: { feedId: string; file: Blob; filename: string; previewOnly: boolean }) =>
        api.uploadFeedFile(agencyId, feedId, file, filename, previewOnly),
      ...options,
    }),
    pause: useMutation({ mutationFn: (feedId: string) => api.pauseFeed(agencyId, feedId), ...options }),
    resume: useMutation({ mutationFn: (feedId: string) => api.resumeFeed(agencyId, feedId), ...options }),
    review: useMutation({
      mutationFn: ({ feedId, runId, decision }: { feedId: string; runId: string; decision: 'approve' | 'dismiss' }) =>
        api.reviewDeactivations(agencyId, feedId, runId, decision),
      ...options,
    }),
  };
}
