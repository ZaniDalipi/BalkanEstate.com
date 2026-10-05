import { Types } from 'mongoose';
import AgencyFeed, { type IAgencyFeed } from '../../models/AgencyFeed';
import AgencyFeedJob, { type AgencyFeedJobKind, type IAgencyFeedJob } from '../../models/AgencyFeedJob';
import AgencyFeedRun, { type AgencyFeedRunTrigger } from '../../models/AgencyFeedRun';
import { feedLogger } from './feedAudit';
import { applyHeldDeactivations, executeRun, failRun, RetryLaterError, defaultSyncDeps, type SyncDeps } from './syncService';

/**
 * MongoDB-backed queue for feed work. See models/AgencyFeedJob for the
 * guarantees (one active job per feed, leases, backoff).
 */

export class FeedBusyError extends Error {
  constructor() {
    super('An import for this feed is already queued or running');
    this.name = 'FeedBusyError';
  }
}

const LEASE_MS = 5 * 60 * 1000;
const BACKOFF_BASE_MS = 2 * 60 * 1000;

export const syncIntervalMs = (): number => {
  const hours = Number(process.env.AGENCY_FEED_SYNC_INTERVAL_HOURS);
  return (Number.isFinite(hours) && hours >= 1 ? hours : 24) * 60 * 60 * 1000;
};

/** 2 min, 8 min, 32 min … capped at 6 h. */
export const backoffMs = (attempt: number): number => Math.min(BACKOFF_BASE_MS * 4 ** Math.max(0, attempt - 1), 6 * 60 * 60 * 1000);

const isDuplicateKey = (err: unknown): boolean => (err as { code?: number }).code === 11000;

export interface EnqueueInput {
  feed: Pick<IAgencyFeed, '_id' | 'agencyId' | 'configVersion'>;
  kind: AgencyFeedJobKind;
  trigger: AgencyFeedRunTrigger;
  requestedBy?: Types.ObjectId | string;
  /** For `apply_deactivations`: the run whose held deactivations were approved. */
  runId?: Types.ObjectId | string;
  /** Import this uploaded file instead of fetching the feed URL. */
  upload?: { id: Types.ObjectId | string; filename: string; bytes: number };
  now?: Date;
}

/** Queue work for a feed. Throws FeedBusyError if the feed already has a job in flight. */
export const enqueueFeedJob = async (input: EnqueueInput): Promise<{ jobId: Types.ObjectId; runId: Types.ObjectId }> => {
  const now = input.now ?? new Date();
  let runId: Types.ObjectId;
  let createdRun = false;
  if (input.kind === 'apply_deactivations') {
    if (!input.runId) throw new Error('runId is required to apply deactivations');
    runId = new Types.ObjectId(String(input.runId));
  } else {
    const run = await AgencyFeedRun.create({
      feedId: input.feed._id,
      agencyId: input.feed.agencyId,
      trigger: input.trigger,
      dryRun: input.kind === 'preview',
      configVersion: input.feed.configVersion,
      requestedBy: input.requestedBy,
      ...(input.upload ? { uploadId: input.upload.id, sourceFile: { filename: input.upload.filename, bytes: input.upload.bytes } } : {}),
      status: 'queued',
      snapshot: { mode: 'snapshot', complete: false, pages: 0, bytes: 0 },
    });
    runId = run._id as Types.ObjectId;
    createdRun = true;
  }
  try {
    const job = await AgencyFeedJob.create({
      feedId: input.feed._id,
      agencyId: input.feed.agencyId,
      runId,
      kind: input.kind,
      status: 'queued',
      activeKey: String(input.feed._id),
      availableAt: now,
      maxAttempts: input.kind === 'sync' ? 4 : 2,
    });
    return { jobId: job._id as Types.ObjectId, runId };
  } catch (err) {
    if (createdRun) await AgencyFeedRun.deleteOne({ _id: runId });
    if (isDuplicateKey(err)) throw new FeedBusyError();
    throw err;
  }
};

/** Claim the next due job, or a running job whose worker stopped renewing its lease. */
export const claimNextJob = async (workerId: string, now: Date = new Date()): Promise<IAgencyFeedJob | null> =>
  AgencyFeedJob.findOneAndUpdate(
    {
      $or: [
        { status: 'queued', availableAt: { $lte: now } },
        { status: 'running', leaseUntil: { $lt: now } },
      ],
    },
    {
      $set: { status: 'running', workerId, leaseUntil: new Date(now.getTime() + LEASE_MS) },
      $inc: { attempts: 1 },
    },
    { sort: { availableAt: 1 }, new: true }
  );

const renewLease = async (job: IAgencyFeedJob, workerId: string): Promise<void> => {
  await AgencyFeedJob.updateOne(
    { _id: job._id, workerId, status: 'running' },
    { $set: { leaseUntil: new Date(Date.now() + LEASE_MS) } }
  );
};

const finishJob = async (job: IAgencyFeedJob, status: 'done' | 'failed', lastError?: string): Promise<void> => {
  await AgencyFeedJob.updateOne(
    { _id: job._id },
    { $set: { status, finishedAt: new Date(), ...(lastError ? { lastError: lastError.slice(0, 1000) } : {}) }, $unset: { activeKey: '', leaseUntil: '' } }
  );
};

/** Run one claimed job to completion, retry, or final failure. */
export const processJob = async (job: IAgencyFeedJob, workerId: string, deps: SyncDeps = defaultSyncDeps()): Promise<void> => {
  const heartbeat = setInterval(() => {
    renewLease(job, workerId).catch(() => undefined);
  }, LEASE_MS / 3);
  heartbeat.unref?.();
  const finalAttempt = job.attempts >= job.maxAttempts;
  const log = { jobId: String(job._id), feedId: String(job.feedId), runId: String(job.runId), kind: job.kind, attempt: job.attempts };
  try {
    feedLogger.info('job started', log);
    if (job.kind === 'apply_deactivations') {
      const run = await AgencyFeedRun.findById(job.runId).select('deactivation');
      await applyHeldDeactivations(job.runId, run?.deactivation.resolvedBy ?? job.agencyId);
    } else {
      await executeRun(job.runId, { ...deps, heartbeat: () => renewLease(job, workerId) }, { finalAttempt });
    }
    await finishJob(job, 'done');
    feedLogger.info('job finished', log);
  } catch (err) {
    const message = (err as Error).message ?? String(err);
    if (!finalAttempt) {
      const delay = backoffMs(job.attempts);
      await AgencyFeedJob.updateOne(
        { _id: job._id },
        { $set: { status: 'queued', availableAt: new Date(Date.now() + delay), lastError: message.slice(0, 1000) }, $unset: { leaseUntil: '' } }
      );
      feedLogger.warn('job will retry', { ...log, delayMs: delay, error: message, retryable: err instanceof RetryLaterError });
    } else {
      await finishJob(job, 'failed', message);
      const run = await AgencyFeedRun.findById(job.runId);
      if (run && !['previewed', 'succeeded', 'partial', 'awaiting_review', 'failed'].includes(run.status)) {
        const feed = await AgencyFeed.findById(job.feedId);
        await failRun(run, feed, {
          code: 'import_failed',
          message: run.status === 'applying'
            ? 'The import stopped part-way; listings already updated are kept and the next sync will finish the rest'
            : 'The import failed after several attempts',
        });
      }
      feedLogger.error('job failed permanently', { ...log, error: message });
    }
  } finally {
    clearInterval(heartbeat);
  }
};

/**
 * Queue a sync for every active feed that is due, moving its next sync time
 * forward first so concurrent schedulers cannot double-queue it.
 */
export const scheduleDueFeeds = async (now: Date = new Date()): Promise<number> => {
  // Upload feeds have nothing to fetch: they import when a file is uploaded.
  const due = await AgencyFeed.find({ state: 'active', sourceType: { $ne: 'upload' }, nextSyncAt: { $lte: now } })
    .select('_id agencyId configVersion nextSyncAt')
    .limit(200);
  let queued = 0;
  for (const feed of due) {
    // Spread feeds over ten minutes so one hour's worth do not hit the worker at once.
    const jitter = Math.floor(Math.random() * 10 * 60 * 1000);
    const claimed = await AgencyFeed.updateOne(
      { _id: feed._id, nextSyncAt: feed.nextSyncAt },
      { $set: { nextSyncAt: new Date(now.getTime() + syncIntervalMs() + jitter) } }
    );
    if (claimed.modifiedCount === 0) continue;
    try {
      await enqueueFeedJob({ feed, kind: 'sync', trigger: 'scheduled', now });
      queued++;
    } catch (err) {
      if (err instanceof FeedBusyError) continue;
      feedLogger.error('could not queue scheduled sync', { feedId: String(feed._id), error: (err as Error).message });
    }
  }
  return queued;
};
