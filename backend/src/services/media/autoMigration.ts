import os from 'os';
import mongoose from 'mongoose';
import { isR2Enabled, missingR2Vars } from '../../config/r2';
import { runMigration, Stats } from '../../scripts/migrateCloudinaryToR2';
import { mediaLogger } from '../../utils/logger';

/**
 * Moves every image still on Cloudinary to R2 from inside the running
 * server, once — switched on with MEDIA_MIGRATE_ON_START=true.
 *
 * It runs in the background after startup, one image at a time with a short
 * pause between images, so the site stays responsive. Images keep showing from
 * Cloudinary until the moment each link is switched to R2, and a field a user
 * edits meanwhile is never overwritten (see migrateCloudinaryToR2.ts).
 *
 * State lives in one MongoDB document (`mediamigrationstates`):
 *  - a lock with a heartbeat, so with several instances or a restart it only
 *    ever runs once at a time; a lock whose holder died expires after
 *    LOCK_MS and the next start takes over, continuing where it stopped;
 *  - `status: 'done'` once finished — it never runs again, even with the
 *    switch still on. Delete the document to run it again.
 */

export const MIGRATION_STATE_COLLECTION = 'mediamigrationstates';
const STATE_ID = 'cloudinary-to-r2';
const LOCK_MS = 5 * 60_000;
const HEARTBEAT_MS = 60_000;

interface MigrationState {
  _id: string;
  status: 'running' | 'done' | 'failed';
  owner?: string;
  lockedUntil?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  runs?: number;
  error?: string;
  stats?: Omit<Stats, 'failed'> & { failedCount: number; failed: Stats['failed'] };
}

const collection = () => mongoose.connection.db!.collection<MigrationState>(MIGRATION_STATE_COLLECTION);

/** A failure the next run can't fix: Cloudinary no longer has the image. */
const isPermanentFailure = (error: string): boolean => /HTTP 404\b/.test(error);

/**
 * Take the lock unless it's done or another live instance holds it. True when
 * acquired. A run recorded as done but with downloads Cloudinary refused (from
 * before this rule existed) counts as unfinished.
 */
const acquire = async (owner: string): Promise<boolean> => {
  const now = new Date();
  try {
    const result = await collection().findOneAndUpdate(
      {
        _id: STATE_ID,
        $and: [
          {
            $or: [
              { status: { $ne: 'done' } },
              { 'stats.failed': { $elemMatch: { error: { $not: /HTTP 404\b/ } } } },
            ],
          },
          { $or: [{ status: { $ne: 'running' } }, { lockedUntil: { $lt: now } }] },
        ],
      },
      {
        $set: { status: 'running', owner, lockedUntil: new Date(now.getTime() + LOCK_MS), startedAt: now },
        $unset: { error: '' },
        $inc: { runs: 1 },
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result?.owner === owner;
  } catch (error: any) {
    // The document exists but didn't match (done, or locked): the upsert's
    // insert collides with its _id.
    if (error?.code === 11000) return false;
    throw error;
  }
};

export interface AutoMigrationOptions {
  /** Wait before starting, so the server finishes booting first. */
  startDelayMs?: number;
  /** Pause between images. */
  throttleMs?: number;
  /** For tests: the migration to run. */
  run?: typeof runMigration;
}

/**
 * Run the migration once if MEDIA_MIGRATE_ON_START=true. Never throws: a
 * failure is logged and recorded, and the next start tries again.
 * Resolves when this instance has finished (or decided not to run).
 */
export const startAutoMediaMigration = async (options: AutoMigrationOptions = {}): Promise<void> => {
  // Tolerant of how dashboards store it: "true", 'true', TRUE, 1, yes.
  const raw = process.env.MEDIA_MIGRATE_ON_START;
  const flag = raw?.trim().replace(/^["']|["']$/g, '').trim().toLowerCase();
  if (!flag) return;
  if (!['true', '1', 'yes', 'on'].includes(flag)) {
    if (!['false', '0', 'no', 'off'].includes(flag)) {
      mediaLogger.warn(`[media-migrate] MEDIA_MIGRATE_ON_START=${JSON.stringify(raw)} isn't understood — set it to true to run the migration`);
    }
    return;
  }
  if (!isR2Enabled()) {
    mediaLogger.warn(`[media-migrate] MEDIA_MIGRATE_ON_START is set but R2 isn't configured (missing ${missingR2Vars().join(', ')})`);
    return;
  }

  const startDelayMs = options.startDelayMs ?? Number(process.env.MEDIA_MIGRATE_START_DELAY_MS ?? 30_000);
  const throttleMs = options.throttleMs ?? Number(process.env.MEDIA_MIGRATE_THROTTLE_MS ?? 200);
  mediaLogger.info(`[media-migrate] MEDIA_MIGRATE_ON_START is on — checking Cloudinary → R2 in ${Math.round(startDelayMs / 1000)}s`);
  if (startDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, startDelayMs).unref?.());
  if (mongoose.connection.readyState !== 1) await mongoose.connection.asPromise();

  const owner = `${os.hostname()}:${process.pid}:${Date.now()}`;
  let heartbeat: NodeJS.Timeout | undefined;
  try {
    if (!(await acquire(owner))) {
      const state = await collection().findOne({ _id: STATE_ID });
      if (state?.status === 'done') {
        const st = state.stats;
        mediaLogger.info(
          `[media-migrate] Already done${state.finishedAt ? ` (${state.finishedAt.toISOString()})` : ''}` +
            (st ? `: ${st.migrated} images moved, ${st.docsUpdated} documents updated, ${st.failedCount} failed` : '') +
            '. You can remove MEDIA_MIGRATE_ON_START.'
        );
      } else {
        mediaLogger.info(`[media-migrate] Another instance is migrating (${state?.owner}); not starting here.`);
      }
      return;
    }

    mediaLogger.info('[media-migrate] Moving images from Cloudinary to R2 in the background…');
    heartbeat = setInterval(() => {
      collection()
        .updateOne({ _id: STATE_ID, owner }, { $set: { lockedUntil: new Date(Date.now() + LOCK_MS) } })
        .catch((error) => mediaLogger.warn(`[media-migrate] heartbeat failed: ${error.message}`));
    }, HEARTBEAT_MS);
    heartbeat.unref?.();

    const stats = await (options.run ?? runMigration)({
      apply: true,
      throttleMs,
      log: (line) => {
        const text = line.trim();
        if (text) mediaLogger.info(`[media-migrate] ${text}`);
      },
    });

    // Done only when nothing is left that a later run could still move:
    // images Cloudinary no longer has (404) are final, anything else — 401
    // refused, timeouts — is retried on the next start.
    const retryable = stats.failed.filter((f) => !isPermanentFailure(f.error));
    const recorded = { ...stats, failedCount: stats.failed.length, failed: stats.failed.slice(0, 500) };
    if (retryable.length > 0) {
      const sample = [...new Set(retryable.map((f) => f.error))].slice(0, 3).join('; ');
      await collection().updateOne(
        { _id: STATE_ID, owner },
        {
          $set: { status: 'failed', finishedAt: new Date(), stats: recorded, error: `${retryable.length} downloads failed: ${sample}` },
          $unset: { lockedUntil: '' },
        }
      );
      mediaLogger.warn(
        `[media-migrate] Not finished: ${stats.migrated} images moved, ${retryable.length} couldn't be downloaded (${sample}). ` +
          (/HTTP 401|HTTP 403/.test(sample)
            ? 'Cloudinary is refusing delivery — set CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET so they are fetched through the Cloudinary API. '
            : '') +
          'They are retried on the next start.'
      );
      return;
    }
    await collection().updateOne(
      { _id: STATE_ID, owner },
      { $set: { status: 'done', finishedAt: new Date(), stats: recorded }, $unset: { lockedUntil: '' } }
    );
    mediaLogger.info(
      `[media-migrate] Done: ${stats.migrated} images moved (${stats.alreadyMigrated} were already on R2), ` +
        `${stats.docsUpdated} documents updated, ${stats.failed.length} failed` +
        (stats.failed.length ? ' — no longer on Cloudinary (404), listed in mediamigrationstates.' : '.')
    );
  } catch (error: any) {
    mediaLogger.error(`[media-migrate] Stopped: ${error?.message || error}. It continues where it stopped on the next start.`);
    await collection()
      .updateOne({ _id: STATE_ID, owner }, { $set: { status: 'failed', error: String(error?.message || error) }, $unset: { lockedUntil: '' } })
      .catch(() => undefined);
  } finally {
    if (heartbeat) clearInterval(heartbeat);
  }
};
