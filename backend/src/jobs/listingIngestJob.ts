import { runAllEnabledSources } from '../services/listingIngestService';
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
      }),
      { imported: 0, updated: 0, failed: 0 }
    );
    cronLogger.info(
      `🌐 Listing ingest cron completed: imported=${totals.imported} updated=${totals.updated} failed=${totals.failed} across ${results.length} source(s)`
    );
  } catch (err) {
    cronLogger.error('Listing ingest cron error:', err);
  }
};
