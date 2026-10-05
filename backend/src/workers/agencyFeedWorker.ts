import { hostname } from 'os';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { claimNextJob, processJob, scheduleDueFeeds } from '../services/agencyFeeds/feedJobQueue';
import { feedLogger } from '../services/agencyFeeds/feedAudit';
import { defaultSyncDeps } from '../services/agencyFeeds/syncService';

/**
 * Agency property-feed worker: the scheduler plus a pool of job runners.
 *
 * All state lives in MongoDB (AgencyFeed.nextSyncAt, AgencyFeedJob), so the
 * timers here only decide how often to look — nothing is lost when the process
 * restarts, and several workers can run side by side safely. Normally started
 * as its own process (`npm run worker:feeds`, see agencyFeedWorkerMain.ts);
 * AGENCY_FEED_WORKER_MODE=embedded starts it inside the API process instead,
 * which is convenient for development and single-container hosting.
 */

export interface FeedWorkerHandle {
  stop: () => Promise<void>;
}

const intEnv = (name: string, fallback: number, min: number, max: number): number => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : fallback;
};

export const startAgencyFeedWorker = (): FeedWorkerHandle => {
  const workerId = `${hostname()}-${process.pid}-${randomBytes(3).toString('hex')}`;
  const concurrency = intEnv('AGENCY_FEED_WORKER_CONCURRENCY', 2, 1, 8);
  const pollMs = intEnv('AGENCY_FEED_POLL_INTERVAL_MS', 5_000, 1_000, 60_000);
  const deps = defaultSyncDeps();
  let stopping = false;
  const lanes: Array<Promise<void>> = [];

  const sleep = (ms: number) => new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    t.unref?.();
  });

  const lane = async (): Promise<void> => {
    while (!stopping) {
      if (mongoose.connection.readyState !== 1) {
        await sleep(pollMs);
        continue;
      }
      try {
        const job = await claimNextJob(workerId);
        if (!job) {
          await sleep(pollMs);
          continue;
        }
        await processJob(job, workerId, deps);
      } catch (err) {
        feedLogger.error('worker lane error', { workerId, error: (err as Error).message });
        await sleep(pollMs);
      }
    }
  };

  const schedulerTick = async (): Promise<void> => {
    if (stopping || mongoose.connection.readyState !== 1) return;
    try {
      const queued = await scheduleDueFeeds();
      if (queued > 0) feedLogger.info('scheduled feed syncs', { workerId, queued });
    } catch (err) {
      feedLogger.error('scheduler error', { workerId, error: (err as Error).message });
    }
  };
  const scheduler = setInterval(schedulerTick, 60_000);
  void schedulerTick();

  for (let i = 0; i < concurrency; i++) lanes.push(lane());
  feedLogger.info('agency feed worker started', { workerId, concurrency, pollMs });

  return {
    stop: async () => {
      stopping = true;
      clearInterval(scheduler);
      // Lanes finish the job they hold; an interrupted job is resumed by its lease expiring.
      await Promise.race([Promise.all(lanes), sleep(25_000)]);
      feedLogger.info('agency feed worker stopped', { workerId });
    },
  };
};
