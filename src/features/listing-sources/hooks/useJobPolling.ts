import { useEffect, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';

export interface JobWatch {
  sourceId: string;
  jobId: string;
}

interface PolledJob {
  status: 'running' | 'done' | 'failed';
}

interface JobPollingOptions<J extends PolledJob> {
  /** Jobs to follow; a job stops being polled once it is done or failed. */
  watches: JobWatch[];
  queryKey: (watch: JobWatch) => readonly unknown[];
  fetchJob: (watch: JobWatch) => Promise<J>;
  /** Every new state of a job: counts while running, the result when done. */
  onJob: (sourceId: string, job: J) => void;
  /** The job could not be read (gone after a server restart, network down). */
  onError: (sourceId: string, error: Error) => void;
}

const POLL_MS = 2000;

/**
 * Polls server jobs (a feed fetch, an import) every couple of seconds until
 * they finish, and reports each new state. Keeps polling in a background tab,
 * so the result is ready when the user comes back.
 */
export const useJobPolling = <J extends PolledJob>({ watches, queryKey, fetchJob, onJob, onError }: JobPollingOptions<J>): void => {
  const results = useQueries({
    queries: watches.map((w) => ({
      queryKey: queryKey(w),
      queryFn: () => fetchJob(w),
      refetchInterval: (query: { state: { data?: J } }) =>
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
