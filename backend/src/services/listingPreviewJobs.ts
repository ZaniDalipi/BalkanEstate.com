import type { IListingSource } from '../models/ListingSource';
import { createJobStore, type JobRecord } from './backgroundJobs';
import type { FetchOptions } from './listingAdapters/types';
import { previewSource, type PreviewResult } from './listingPreviewService';

/**
 * Fetching a whole feed (every catalogue page, then every listing's page at a
 * polite pace) takes minutes, so a preview runs as a background job: the
 * client starts it, then polls it for "N found / X of N read" until the
 * listings are ready for review.
 */

interface PreviewCounts {
  /** Listings found so far on the source's catalogue pages. */
  found: number;
  /** Listing pages read so far (each listing's details). */
  detailsFetched: number;
}

interface JobBase extends PreviewCounts {
  jobId: string;
  sourceId: string;
  startedAt: number;
}

export type PreviewJob =
  | (JobBase & { status: 'running' })
  | (JobBase & { status: 'done'; result: PreviewResult })
  | (JobBase & { status: 'failed'; error: string; errorCode?: string });

const store = createJobStore<PreviewCounts, PreviewResult>(() => ({ found: 0, detailsFetched: 0 }));

const toPublic = (job: JobRecord<PreviewCounts, PreviewResult>): PreviewJob => {
  const base: JobBase = { jobId: job.jobId, sourceId: job.sourceId, startedAt: job.startedAt, ...job.progress };
  if (job.status === 'done') return { ...base, status: 'done', result: job.result, found: Math.max(base.found, job.result.fetched) };
  if (job.status === 'failed') return { ...base, status: 'failed', error: job.error, errorCode: job.errorCode };
  return { ...base, status: 'running' };
};

export type PreviewRunner = (
  source: IListingSource,
  limit: number,
  onProgress: NonNullable<FetchOptions['onProgress']>
) => Promise<PreviewResult>;

/** Start a preview of `source` for its owner, or return the one already running for it. */
export const startPreviewJob = (
  source: IListingSource,
  userId: string,
  limit: number,
  run: PreviewRunner = previewSource
): PreviewJob =>
  toPublic(
    store.start(String(source._id), userId, (update) =>
      run(source, limit, (found, detailsFetched) =>
        update((p) => ({ found: Math.max(p.found, found), detailsFetched }))
      )
    )
  );

/** The job, if it exists and belongs to this user and source. */
export const getPreviewJob = (jobId: string, userId: string, sourceId: string): PreviewJob | undefined => {
  const job = store.get(jobId, userId, sourceId);
  return job ? toPublic(job) : undefined;
};
