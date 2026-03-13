import cron, { ScheduledTask } from 'node-cron';
import Property from '../models/Property';
import PropertyStats from '../models/PropertyStats';
import { cronLogger } from '../utils/logger';

/**
 * Pre-compute Property Statistics Job
 *
 * Runs every hour to aggregate property stats into a single document.
 * This eliminates the need for expensive aggregation pipelines on every
 * dashboard/API request.
 *
 * Schedule: '0 * * * *' (every hour at minute 0)
 */

let statsJob: ScheduledTask | null = null;

export async function computePropertyStats(): Promise<void> {
  const start = performance.now();

  // Run all aggregations in parallel
  const [
    statusCounts,
    promotedCount,
    countByCountry,
    avgPriceByCity,
    countByType,
  ] = await Promise.all([
    // Status counts
    Property.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // Promoted count
    Property.countDocuments({ isPromoted: true }),

    // Count by country (active only)
    Property.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Average price by city (active + for sale)
    Property.aggregate([
      { $match: { status: 'active', listingType: 'sale' } },
      {
        $group: {
          _id: { city: '$city', country: '$country' },
          avgPrice: { $avg: '$price' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 100 }, // Top 100 cities
    ]),

    // Count by property type (active only)
    Property.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$propertyType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  // Parse status counts
  const statusMap: Record<string, number> = {};
  statusCounts.forEach((s: any) => { statusMap[s._id] = s.count; });

  // Upsert into PropertyStats
  await PropertyStats.findOneAndUpdate(
    { key: 'global' },
    {
      totalActive: statusMap['active'] || 0,
      totalSold: statusMap['sold'] || 0,
      totalRented: statusMap['rented'] || 0,
      totalPromoted: promotedCount,
      countByCountry: countByCountry.map((c: any) => ({
        country: c._id,
        count: c.count,
      })),
      avgPriceByCity: avgPriceByCity.map((c: any) => ({
        city: c._id.city,
        country: c._id.country,
        avgPrice: Math.round(c.avgPrice),
        count: c.count,
      })),
      countByType: countByType.map((c: any) => ({
        propertyType: c._id,
        count: c.count,
      })),
      computedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  const ms = Math.round(performance.now() - start);
  cronLogger.info(`Property stats computed in ${ms}ms`);
}

export function startPropertyStatsJob(): void {
  if (statsJob) {
    cronLogger.info('Property stats job is already running');
    return;
  }

  // Run immediately on startup
  computePropertyStats().catch((err) => {
    cronLogger.error('Initial property stats computation failed:', err);
  });

  // Then run every hour
  statsJob = cron.schedule('0 * * * *', async () => {
    try {
      await computePropertyStats();
    } catch (error) {
      cronLogger.error('Property stats computation failed:', error);
    }
  }, {
    timezone: 'Europe/Belgrade',
  });

  cronLogger.info('Property stats job scheduled (hourly)');
}

export function stopPropertyStatsJob(): void {
  if (statsJob) {
    statsJob.stop();
    statsJob = null;
    cronLogger.info('Property stats job stopped');
  }
}
