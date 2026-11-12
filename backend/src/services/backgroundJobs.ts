import { randomUUID } from 'crypto';

/**
 * Background jobs for a listing source: work that takes minutes (fetching a
 * whole feed, importing hundreds of listings) runs here instead of inside one
 * HTTP request, which a proxy would cut off. The client starts a job and
 * polls it for progress, then for its result or the reason it failed.
 *
 * Kept in memory: a job lives for this server process (finished jobs for 30
 * minutes), which is all a page watching it needs.
 */

export type JobRecord<P, R> = {
  jobId: string;
  sourceId: string;
  userId: string;
  startedAt: number;
  finishedAt?: number;
  progress: P;
} & ({ status: 'running' } | { status: 'done'; result: R } | { status: 'failed'; error: string });

const FINISHED_TTL_MS = 30 * 60 * 1000;

export interface JobStore<P, R> {
  /**
   * Start `run` for this user's source, or return the job already running for
   * it (a second click doesn't do the work twice). `run` receives `update`,
   * which applies a change to the job's progress.
   */
  start: (
    sourceId: string,
    userId: string,
    run: (update: (change: (progress: P) => P) => void) => Promise<R>
  ) => JobRecord<P, R>;
  /** The job, only if it belongs to this user and source. */
  get: (jobId: string, userId: string, sourceId: string) => JobRecord<P, R> | undefined;
}

export const createJobStore = <P, R>(initialProgress: () => P): JobStore<P, R> => {
  const jobs = new Map<string, JobRecord<P, R>>();

  setInterval(() => {
    const now = Date.now();
    for (const [id, job] of jobs) {
      if (job.status !== 'running' && now - (job.finishedAt ?? job.startedAt) > FINISHED_TTL_MS) jobs.delete(id);
    }
  }, 5 * 60 * 1000).unref();

  const start: JobStore<P, R>['start'] = (sourceId, userId, run) => {
    for (const job of jobs.values()) {
      if (job.status === 'running' && job.sourceId === sourceId && job.userId === userId) return job;
    }
    const jobId = randomUUID();
    const job: JobRecord<P, R> = {
      jobId, sourceId, userId, startedAt: Date.now(), progress: initialProgress(), status: 'running',
    };
    jobs.set(jobId, job);

    const update = (change: (progress: P) => P) => {
      const current = jobs.get(jobId);
      if (current?.status === 'running') jobs.set(jobId, { ...current, progress: change(current.progress) });
    };
    // A synchronous throw becomes a failed job too. Settling is always
    // asynchronous, so `start` hands back a running job.
    let work: Promise<R>;
    try {
      work = run(update);
    } catch (err) {
      work = Promise.reject(err);
    }
    work
      .then((result) => {
        const current = jobs.get(jobId) ?? job;
        jobs.set(jobId, { ...current, status: 'done', result, finishedAt: Date.now() });
      })
      .catch((err: unknown) => {
        const current = jobs.get(jobId) ?? job;
        const error = (err as Error)?.message || 'The job failed';
        jobs.set(jobId, { ...current, status: 'failed', error, finishedAt: Date.now() });
      });
    return job;
  };

  const get: JobStore<P, R>['get'] = (jobId, userId, sourceId) => {
    const job = jobs.get(jobId);
    return job && job.userId === userId && job.sourceId === sourceId ? job : undefined;
  };

  return { start, get };
};
