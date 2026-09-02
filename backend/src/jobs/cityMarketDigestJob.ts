/**
 * Explore-Cities Market Digest Job
 *
 * Two entry points, one service:
 *  - `runMonthlyCityMarketDigest()` — the scheduled monthly send (cron).
 *  - `runSourceUpdateCityMarketDigest()` — called right after a market-data
 *    refresh, so a large move reaches readers when the sources publish it
 *    instead of waiting for the calendar.
 *
 * Both capture fresh snapshots first: without a snapshot there is nothing to
 * diff, and capturing is a no-op when the upstream figures are unchanged.
 */

import {
  runCityMarketDigest,
  CityMarketDigestResult,
} from '../services/cityMarketDigestService';
import { cronLogger } from '../utils/logger';

export async function runMonthlyCityMarketDigest(): Promise<CityMarketDigestResult> {
  cronLogger.info('🌍 Monthly Explore-Cities market digest starting...');
  return runCityMarketDigest({ reason: 'monthly', captureFirst: true });
}

/**
 * Follow-up to a market-data refresh. Internally gated: it sends only when a
 * city cleared the out-of-cycle threshold and the previous digest is old enough.
 */
export async function runSourceUpdateCityMarketDigest(): Promise<CityMarketDigestResult> {
  cronLogger.info('🌍 Checking Explore-Cities data refresh for report-worthy moves...');
  return runCityMarketDigest({ reason: 'source-update', captureFirst: true });
}

/**
 * Admin-triggered run. `force` skips the cadence guard only — an empty digest
 * is still never sent.
 *
 * A dry run still captures snapshots: that is what makes the preview reflect
 * the figures currently on /explore-cities, and a capture writes only history
 * rows the next real run would write anyway. It does not move the comparison
 * window, so nothing is consumed by looking.
 */
export async function triggerCityMarketDigest(
  options: { dryRun?: boolean; force?: boolean } = {},
): Promise<CityMarketDigestResult> {
  cronLogger.info(
    `🌍 Manual Explore-Cities market digest (dryRun=${options.dryRun === true}, force=${options.force === true})`,
  );
  return runCityMarketDigest({
    reason: 'manual',
    captureFirst: true,
    dryRun: options.dryRun === true,
    force: options.force !== false,
  });
}
