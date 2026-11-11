import type { IListingSource } from '../models/ListingSource';
import { createJobStore, type JobRecord } from './backgroundJobs';
import { runSource, type IngestProgress, type IngestStats } from './listingIngestService';
import type { RawListing } from './listingAdapters/types';

/**
 * Importing the listings a user approved (normalising, geocoding and
 * re-hosting photos for each) takes minutes for a big feed, so it runs as a
 * background job the page polls — the progress window shows real counts and
 * the listings as they are processed, without relying on a live socket.
 */

export type RunItemStatus = 'imported' | 'updated' | 'deferred' | 'failed';

export interface RunItem {
  id: string;
  title?: string;
  url?: string;
  status: RunItemStatus;
}

interface RunProgress {
  /** The latest progress of the import (the same as the socket event). */
  current: IngestProgress | null;
  /** Most recent processed listings, newest last (at most 100). */
  recentItems: RunItem[];
}

interface JobBase extends RunProgress {
  jobId: string;
  sourceId: string;
  startedAt: number;
}

export type RunJob =
  | (JobBase & { status: 'running' })
  | (JobBase & { status: 'done'; stats: IngestStats })
  | (JobBase & { status: 'failed'; error: string; errorCode?: string });

const MAX_ITEMS = 100;

/** Which counter moved since the previous update tells what happened to the current listing. */
export const itemStatus = (prev: IngestProgress | null, next: IngestProgress): RunItemStatus | null => {
  if (next.imported > (prev?.imported ?? 0)) return 'imported';
  if (next.updated > (prev?.updated ?? 0)) return 'updated';
  if ((next.deferred ?? 0) > (prev?.deferred ?? 0)) return 'deferred';
  if (next.failed > (prev?.failed ?? 0)) return 'failed';
  return null;
};

/** Fold one progress update into the job's progress. */
export const applyProgress = (progress: RunProgress, next: IngestProgress): RunProgress => {
  const status = itemStatus(progress.current, next);
  if (!status || !next.currentItem) return { ...progress, current: next };
  const item: RunItem = { id: next.currentItem.id, title: next.currentItem.title, url: next.currentItem.url, status };
  return { current: next, recentItems: [...progress.recentItems, item].slice(-MAX_ITEMS) };
};

const store = createJobStore<RunProgress, IngestStats>(() => ({ current: null, recentItems: [] }));

const toPublic = (job: JobRecord<RunProgress, IngestStats>): RunJob => {
  const base: JobBase = { jobId: job.jobId, sourceId: job.sourceId, startedAt: job.startedAt, ...job.progress };
  if (job.status === 'done') return { ...base, status: 'done', stats: job.result };
  if (job.status === 'failed') return { ...base, status: 'failed', error: job.error, errorCode: job.errorCode };
  return { ...base, status: 'running' };
};

export type ImportRunner = (
  source: IListingSource,
  raws: RawListing[],
  onProgress: (progress: IngestProgress) => void
) => Promise<IngestStats>;

const defaultRunner: ImportRunner = (source, raws, onProgress) => runSource(source, { preFetched: raws, onProgress });

/** Import the approved listings of `source` in the background. */
export const startImportJob = (
  source: IListingSource,
  userId: string,
  raws: RawListing[],
  run: ImportRunner = defaultRunner
): RunJob =>
  toPublic(
    store.start(String(source._id), userId, (update) =>
      run(source, raws, (next) => update((p) => applyProgress(p, next)))
    )
  );

/** The import job, if it exists and belongs to this user and source. */
export const getImportJob = (jobId: string, userId: string, sourceId: string): RunJob | undefined => {
  const job = store.get(jobId, userId, sourceId);
  return job ? toPublic(job) : undefined;
};
