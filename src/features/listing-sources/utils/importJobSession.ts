import type { ImportJob } from '../api/listingSourceApi';
import type { ListingIngestProgressEvent, SyncSession } from '../context/ListingIngestProgressContext';

/**
 * The progress window's session after a new state of its import job: the
 * counts and the listings processed so far, then the final stats (or the
 * reason it failed). Same shape the live socket events produce, so the
 * window shows either source the same way.
 */
export const sessionFromImportJob = (session: SyncSession, job: ImportJob): SyncSession => {
  const finished = job.status !== 'running';
  const counts = job.current ?? session.current ?? { fetched: 0, processed: 0, imported: 0, updated: 0, failed: 0, deferred: 0 };
  const current: ListingIngestProgressEvent = {
    ...counts,
    sourceId: session.sourceId,
    timestamp: new Date().toISOString(),
    ...(finished && { done: true }),
    ...(job.status === 'failed' && { message: job.error }),
  };
  return {
    ...session,
    jobId: job.jobId,
    current,
    recentItems: job.recentItems.length ? job.recentItems : session.recentItems,
    isDone: session.isDone || finished,
    ...(job.status === 'done' && { finalStats: job.stats }),
  };
};
