import { runAllEnabledSources, replayDeferredListings } from '../services/listingIngestService';
import { cronLogger } from '../utils/logger';

/**
 * Cron entry point for the universal listings ingestion pipeline.
 * Wired in `backend/src/cron/index.ts`.
 */
export const processListingIngest = async (): Promise<void> => {
  try {
    const results = await runAllEnabledSources();
    const totals = results.reduce(
      (acc, r) => ({
        imported: acc.imported + r.imported,
        updated: acc.updated + r.updated,
        failed: acc.failed + r.failed,
        deferred: acc.deferred + r.deferred,
      }),
      { imported: 0, updated: 0, failed: 0, deferred: 0 }
    );
    cronLogger.info(
      `🌐 Listing ingest cron completed: imported=${totals.imported} updated=${totals.updated} deferred=${totals.deferred} failed=${totals.failed} across ${results.length} source(s)`
    );
  } catch (err) {
    cronLogger.error('Listing ingest cron error:', err);
  }
};

/**
 * Replay listings that were deferred because the owning user reached their
 * monthly listing limit. Runs at month rollover (and hourly for safety on
 * the 1st) — see `backend/src/cron/index.ts`.
 */
export const processDeferredListingReplay = async (): Promise<void> => {
  try {
    const result = await replayDeferredListings();
    if (result.replayed > 0 || result.remaining > 0) {
      cronLogger.info(
        `🔁 Deferred-listing replay: imported=${result.replayed} stillPending=${result.remaining}`
      );
    }
  } catch (err) {
    cronLogger.error('Deferred-listing replay error:', err);
  }
};
