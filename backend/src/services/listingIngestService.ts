import ListingSource, { type IListingSource } from '../models/ListingSource';
import Property from '../models/Property';
import { getAdapter } from './listingAdapters';
import { normalize } from './listingNormalizerService';
import { emitPropertyCreated, emitPropertyUpdated, emitListingIngestProgress } from '../sockets/propertySocket';
import { cronLogger } from '../utils/logger';

export interface IngestStats {
  sourceSlug: string;
  fetched: number;
  imported: number;
  updated: number;
  failed: number;
  errors: string[];
  durationMs: number;
}

interface RunOptions {
  /** Hard cap on listings per source per run (defaults to 500). */
  limit?: number;
  /** Set true to ignore the source's lastSuccessAt and re-fetch everything. */
  fullRefresh?: boolean;
}

const log = cronLogger;

/**
 * Run a single ListingSource end-to-end: adapter → normalize → upsert by
 * `(source, sourceListingId)`. Errors are caught per-listing so a single
 * malformed item doesn't abort the entire run.
 */
export const runSource = async (source: IListingSource, options: RunOptions = {}): Promise<IngestStats> => {
  const start = Date.now();
  const stats: IngestStats = {
    sourceSlug: source.slug,
    fetched: 0,
    imported: 0,
    updated: 0,
    failed: 0,
    errors: [],
    durationMs: 0,
  };

  source.lastRunAt = new Date();
  await source.save();

  try {
    const adapter = getAdapter(source);
    const since = options.fullRefresh ? undefined : source.lastSuccessAt;
    const limit = options.limit ?? 500;

    log.info(`[ingest] ${source.slug}: starting (since=${since?.toISOString() ?? 'none'}, limit=${limit})`);

    const raws = await adapter.fetchListings(source, { since, limit });
    stats.fetched = raws.length;

    const rehostImages = Boolean((source.adapterConfig as Record<string, unknown> | undefined)?.rehostImages);
    const emitNew = (source.adapterConfig as Record<string, unknown> | undefined)?.emitNewListingEvents === true;

    for (let i = 0; i < raws.length; i++) {
      const raw = raws[i];
      try {
        const normalized = await normalize(raw, source, { rehostImages });
        const existing = await Property.findOne({ source: source.slug, sourceListingId: raw.id }).select('_id');
        const wasInsert = !existing;
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
          if (emitNew && property) emitPropertyCreated(property.toObject());
        } else {
          stats.updated++;
          if (property) emitPropertyUpdated(String(property._id), property.toObject());
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
        currentItem: {
          id: raw.id,
          title: (raw.raw as Record<string, unknown>)?.title as string | undefined,
          url: raw.url,
        },
      });
    }

    source.listingsImported += stats.imported;
    source.listingsUpdated += stats.updated;
    source.listingsFailed += stats.failed;
    source.lastSuccessAt = new Date();
    source.lastErrorMessage = undefined;
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
    `[ingest] ${source.slug}: done — fetched=${stats.fetched} imported=${stats.imported} updated=${stats.updated} failed=${stats.failed} (${stats.durationMs}ms)`
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
