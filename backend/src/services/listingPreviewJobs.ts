import { randomUUID } from 'crypto';
import type { IListingSource } from '../models/ListingSource';
import type { FetchOptions } from './listingAdapters/types';
import { previewSource, type PreviewResult } from './listingPreviewService';

/**
 * Fetching a whole feed (every catalogue page, then every listing's page at a
 * polite pace) takes minutes — far longer than one HTTP request may stay
 * open behind a proxy. So a preview runs as a background job: the client
 * starts it, then polls it for "N found / X of N read" until the listings
 * are ready for review.
 */

interface JobBase {
  jobId: string;
  sourceId: string;
  startedAt: number;
  /** Listings found so far on the source's catalogue pages. */
  found: number;
  /** Listing pages read so far (each listing's details). */
  detailsFetched: number;
}

export type PreviewJob =
  | (JobBase & { status: 'running' })
  | (JobBase & { status: 'done'; result: PreviewResult })
  | (JobBase & { status: 'failed'; error: string });

type StoredJob = PreviewJob & { userId: string; finishedAt?: number };

const JOB_TTL_MS = 30 * 60 * 1000;
const jobs = new Map<string, StoredJob>();

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (job.status !== 'running' && now - (job.finishedAt ?? job.startedAt) > JOB_TTL_MS) jobs.delete(id);
  }
}, 5 * 60 * 1000).unref();

const toPublic = (job: StoredJob): PreviewJob => {
  const { userId: _userId, finishedAt: _finishedAt, ...rest } = job;
  return rest as PreviewJob;
};

export type PreviewRunner = (
  source: IListingSource,
  limit: number,
  onProgress: NonNullable<FetchOptions['onProgress']>
) => Promise<PreviewResult>;

/**
 * Start a preview of `source` for its owner, or return the one already
 * running for it (a second click doesn't crawl the site twice).
 */
export const startPreviewJob = (
  source: IListingSource,
  userId: string,
  limit: number,
  run: PreviewRunner = previewSource
): PreviewJob => {
  const sourceId = String(source._id);
  for (const job of jobs.values()) {
    if (job.status === 'running' && job.sourceId === sourceId && job.userId === userId) return toPublic(job);
  }

  const job: StoredJob = {
    status: 'running', jobId: randomUUID(), sourceId, userId, startedAt: Date.now(), found: 0, detailsFetched: 0,
  };
  jobs.set(job.jobId, job);

  const update = (next: StoredJob) => jobs.set(job.jobId, next);
  run(source, limit, (found, detailsFetched) => {
    const current = jobs.get(job.jobId);
    if (current?.status === 'running') update({ ...current, found: Math.max(current.found, found), detailsFetched });
  })
    .then((result) => {
      const current = jobs.get(job.jobId) ?? job;
      update({ ...current, status: 'done', result, found: Math.max(current.found, result.fetched), finishedAt: Date.now() });
    })
    .catch((err: unknown) => {
      const current = jobs.get(job.jobId) ?? job;
      const error = (err as Error)?.message || 'Fetching the listings failed';
      update({ ...current, status: 'failed', error, finishedAt: Date.now() });
    });

  return toPublic(job);
};

/** The job, if it exists and belongs to this user and source. */
export const getPreviewJob = (jobId: string, userId: string, sourceId: string): PreviewJob | undefined => {
  const job = jobs.get(jobId);
  if (!job || job.userId !== userId || job.sourceId !== sourceId) return undefined;
  return toPublic(job);
};
