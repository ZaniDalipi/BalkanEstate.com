import { useEffect, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { listingFeedKeys } from '@/src/shared/query/queryKeys';
import { getMyListingSourcePreviewJob, type PreviewJob } from '../api/listingSourceApi';

export interface PreviewJobWatch {
  sourceId: string;
  jobId: string;
}

const POLL_MS = 2000;

/**
 * Polls each running feed fetch until it is done or failed, and reports
 * every new state of it: counts while running, the listings when done.
 * Keeps polling in a background tab, so the review opens when it's ready.
 */
export const usePreviewJobPolling = (
  watches: PreviewJobWatch[],
  onJob: (sourceId: string, job: PreviewJob) => void,
  onError: (sourceId: string, error: Error) => void
): void => {
  const results = useQueries({
    queries: watches.map((w) => ({
      queryKey: listingFeedKeys.previewJob(w.sourceId, w.jobId),
      queryFn: () => getMyListingSourcePreviewJob(w.sourceId, w.jobId),
      refetchInterval: (query: { state: { data?: PreviewJob } }) =>
        !query.state.data || query.state.data.status === 'running' ? POLL_MS : false,
      refetchIntervalInBackground: true,
      retry: 2,
      gcTime: 0,
    })),
  });

  // Latest callbacks in refs, so the effect below only runs on new data.
  const onJobRef = useRef(onJob);
  const onErrorRef = useRef(onError);
  onJobRef.current = onJob;
  onErrorRef.current = onError;

  const stamp = results.map((r) => `${r.dataUpdatedAt}:${r.errorUpdatedAt}`).join('|');
  useEffect(() => {
    results.forEach((r, i) => {
      const watch = watches[i];
      if (!watch) return;
      if (r.data) onJobRef.current(watch.sourceId, r.data);
      else if (r.error) onErrorRef.current(watch.sourceId, r.error as Error);
    });
    // `stamp` changes exactly when a result does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);
};
