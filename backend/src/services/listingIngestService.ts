import ListingSource, { type IListingSource } from '../models/ListingSource';
import Property from '../models/Property';
import DeferredListing from '../models/DeferredListing';
import User from '../models/User';
import listingLimitService from './listingLimitService';
import { getAdapter } from './listingAdapters';
import { normalize } from './listingNormalizerService';
import {
  emitPropertyCreated,
  emitPropertyUpdated,
  emitListingIngestProgress,
} from '../sockets/propertySocket';
import { cronLogger } from '../utils/logger';
import type { RawListing } from './listingAdapters/types';

export interface IngestStats {
  sourceSlug: string;
  fetched: number;
  imported: number;
  updated: number;
  failed: number;
  deferred: number;
  errors: string[];
  durationMs: number;
  monthlyUsage?: {
    monthlyAllowance: number;
    created: number;
    remaining: number;
  };
}

interface RunOptions {
  /** Hard cap on listings per source per run (defaults to 500). */
  limit?: number;
  /** Set true to ignore the source's lastSuccessAt and re-fetch everything. */
  fullRefresh?: boolean;
  /** When set, treat this as a deferred-listing replay and skip limit checks
   *  for fetching (we already have the raw payload). */
  preFetched?: RawListing[];
}

const log = cronLogger;

const firstOfNextMonth = (now: Date = new Date()): Date => {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(1);
  d.setUTCHours(0, 1, 0, 0);
  return d;
};

/**
 * Compute how many *new* listings this user is still allowed to create this
 * calendar month. Free tier with no plan returns 0 (we won't import anything
 * for them). When the source has no userId, returns Infinity (system import).
 */
const getRemainingMonthlyCapacity = async (
  source: IListingSource
): Promise<{ remaining: number; allowance: number; created: number }> => {
  if (!source.userId) {
    return { remaining: Number.POSITIVE_INFINITY, allowance: 0, created: 0 };
  }
  try {
    const usage = await listingLimitService.getMonthlyUsage(source.userId.toString());
    return {
      remaining: usage.remaining,
      allowance: usage.monthlyAllowance,
      created: usage.created,
    };
  } catch {
    // If user has no subscription / no plan we cannot import — return 0
    return { remaining: 0, allowance: 0, created: 0 };
  }
};

const incrementUserMonthlyCounter = async (userId: unknown): Promise<void> => {
  if (!userId) return;
  try {
    await User.updateOne(
      { _id: userId },
      {
        $inc: { 'subscription.listingsCreatedThisMonth': 1 },
        $setOnInsert: { 'subscription.monthResetDate': new Date() },
      }
    );
  } catch (err) {
    log.info(`[ingest] failed to increment user counter ${String(userId)}: ${(err as Error).message}`);
  }
};

const persistDeferred = async (
  source: IListingSource,
  raw: RawListing,
  scheduledFor: Date
): Promise<void> => {
  try {
    await DeferredListing.findOneAndUpdate(
      { source: source._id, sourceListingId: raw.id },
      {
        $set: {
          sourceSlug: source.slug,
          userId: source.userId,
          rawId: raw.id,
          rawUrl: raw.url,
          rawPayload: raw.raw,
          scheduledFor,
        },
        $setOnInsert: { deferredAt: new Date() },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    log.info(
      `[ingest] failed to defer listing ${raw.id} for source ${source.slug}: ${(err as Error).message}`
    );
  }
};

/**
 * Run a single ListingSource end-to-end: adapter → normalize → upsert by
 * `(source, sourceListingId)`. Errors are caught per-listing so a single
 * malformed item doesn't abort the entire run.
 *
 * Respects the owning user's monthly listing limit: items that would be NEW
 * inserts past the limit are saved as `DeferredListing`s and replayed on the
 * 1st of next month.
 */
export const runSource = async (
  source: IListingSource,
  options: RunOptions = {}
): Promise<IngestStats> => {
  const start = Date.now();
  const stats: IngestStats = {
    sourceSlug: source.slug,
    fetched: 0,
    imported: 0,
    updated: 0,
    failed: 0,
    deferred: 0,
    errors: [],
    durationMs: 0,
  };

  source.lastRunAt = new Date();
  await source.save();

  const capacity = await getRemainingMonthlyCapacity(source);
  let remaining = capacity.remaining;
  if (capacity.allowance > 0) {
    stats.monthlyUsage = {
      monthlyAllowance: capacity.allowance,
      created: capacity.created,
      remaining: capacity.remaining,
    };
  }

  try {
    let raws: RawListing[];
    if (options.preFetched) {
      raws = options.preFetched;
    } else {
      const adapter = getAdapter(source);
      const since = options.fullRefresh ? undefined : source.lastSuccessAt;
      const limit = options.limit ?? 500;
      log.info(
        `[ingest] ${source.slug}: starting (since=${since?.toISOString() ?? 'none'}, limit=${limit}, remaining=${remaining})`
      );
      raws = await adapter.fetchListings(source, { since, limit });
    }
    stats.fetched = raws.length;

    const rehostImages = Boolean(
      (source.adapterConfig as Record<string, unknown> | undefined)?.rehostImages
    );
    const emitNew =
      (source.adapterConfig as Record<string, unknown> | undefined)?.emitNewListingEvents === true;
    const deferUntil = firstOfNextMonth();

    for (let i = 0; i < raws.length; i++) {
      const raw = raws[i];
      try {
        const existing = await Property.findOne({
          source: source.slug,
          sourceListingId: raw.id,
        }).select('_id');
        const wasInsert = !existing;

        // Limit only applies to genuinely new listings
        if (wasInsert && remaining <= 0) {
          await persistDeferred(source, raw, deferUntil);
          stats.deferred++;
        } else {
          const normalized = await normalize(raw, source, { rehostImages });
          const property = await Property.findOneAndUpdate(
            { source: source.slug, sourceListingId: raw.id },
            {
              $set: { ...normalized, sourceFetchedAt: new Date() },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          if (wasInsert) {
            stats.imported++;
            if (source.userId) {
              await incrementUserMonthlyCounter(source.userId);
              remaining--;
            }
            if (emitNew && property) emitPropertyCreated(property.toObject());
            // If this raw item had a deferred copy from a previous run, drop it
            await DeferredListing.deleteOne({
              source: source._id,
              sourceListingId: raw.id,
            }).catch(() => undefined);
          } else {
            stats.updated++;
            if (property) emitPropertyUpdated(String(property._id), property.toObject());
          }
        }
      } catch (err) {
        stats.failed++;
        const msg = (err as Error).message;
        stats.errors.push(`${raw.id}: ${msg}`);
        log.info(`[ingest] ${source.slug}: failed listing ${raw.id} — ${msg}`);
      }

      emitListingIngestProgress(String(source._id), {
        fetched: stats.fetched,
        processed: i + 1,
        imported: stats.imported,
        updated: stats.updated,
        failed: stats.failed,
        deferred: stats.deferred,
        currentItem: {
          id: raw.id,
          title: (raw.raw as Record<string, unknown>)?.title as string | undefined,
          url: raw.url,
        },
        monthlyUsage: stats.monthlyUsage
          ? {
              monthlyAllowance: stats.monthlyUsage.monthlyAllowance,
              remaining: Math.max(0, remaining),
            }
          : undefined,
      });
    }

    source.listingsImported += stats.imported;
    source.listingsUpdated += stats.updated;
    source.listingsFailed += stats.failed;
    source.lastSuccessAt = new Date();
    source.lastErrorMessage = undefined;
    if (stats.deferred > 0) {
      source.lastErrorMessage =
        `Reached monthly limit — ${stats.deferred} listing(s) deferred to ${deferUntil.toISOString().slice(0, 10)}.`;
    }
    await source.save();
  } catch (err) {
    const msg = (err as Error).message;
    stats.errors.push(`source: ${msg}`);
    source.lastErrorMessage = msg;
    await source.save();
    log.info(`[ingest] ${source.slug}: source-level failure — ${msg}`);
  }

  stats.durationMs = Date.now() - start;
  log.info(
    `[ingest] ${source.slug}: done — fetched=${stats.fetched} imported=${stats.imported} updated=${stats.updated} deferred=${stats.deferred} failed=${stats.failed} (${stats.durationMs}ms)`
  );
  return stats;
};

/**
 * Run every enabled `ListingSource` in sequence. Sequential rather than
 * parallel because each adapter applies per-host rate limits and we want
 * predictable error logging per source.
 */
export const runAllEnabledSources = async (options: RunOptions = {}): Promise<IngestStats[]> => {
  const sources = await ListingSource.find({ enabled: true });
  log.info(`[ingest] running ${sources.length} enabled source(s)`);
  const results: IngestStats[] = [];
  for (const source of sources) {
    results.push(await runSource(source, options));
  }
  return results;
};

/**
 * Replay listings that were deferred in earlier runs and whose `scheduledFor`
 * timestamp is now in the past (typically meaning a new month started and the
 * user's monthly counter has reset). Called from the cron job at a safe
 * interval (e.g. once per hour on the 1st of the month).
 */
export const replayDeferredListings = async (): Promise<{ replayed: number; remaining: number }> => {
  const due = await DeferredListing.find({ scheduledFor: { $lte: new Date() } }).limit(2000);
  if (due.length === 0) return { replayed: 0, remaining: 0 };

  // Group by source so we can run normalize+upsert with the correct source config
  const bySource = new Map<string, typeof due>();
  for (const d of due) {
    const key = String(d.source);
    const arr = bySource.get(key) ?? [];
    arr.push(d);
    bySource.set(key, arr);
  }

  let replayed = 0;
  for (const [sourceId, items] of bySource) {
    const source = await ListingSource.findById(sourceId);
    if (!source) {
      // Orphan deferred records — clean them up.
      await DeferredListing.deleteMany({ source: sourceId });
      continue;
    }
    const raws: RawListing[] = items.map((d) => ({
      id: d.rawId,
      url: d.rawUrl,
      raw: d.rawPayload,
    }));
    const stats = await runSource(source, { preFetched: raws });
    replayed += stats.imported;
    // Drop deferred records that just got imported; leave any that re-deferred.
    if (stats.imported > 0) {
      const importedIds = new Set<string>();
      // We can't know exactly which got imported; only drop ones that are now Property docs.
      const props = await Property.find({
        source: source.slug,
        sourceListingId: { $in: items.map((d) => d.rawId) },
      })
        .select('sourceListingId')
        .lean();
      for (const p of props) importedIds.add(p.sourceListingId as unknown as string);
      if (importedIds.size > 0) {
        await DeferredListing.deleteMany({
          source: source._id,
          sourceListingId: { $in: Array.from(importedIds) },
        });
      }
    }
  }

  const remaining = await DeferredListing.countDocuments({ scheduledFor: { $lte: new Date() } });
  return { replayed, remaining };
};
