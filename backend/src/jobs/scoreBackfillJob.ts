import Agent from '../models/Agent';
import Agency from '../models/Agency';
import { calcAgentScoreBreakdown, calcAgencyScoreBreakdown } from '../utils/scoringUtils';
import { cronLogger } from '../utils/logger';

const BATCH_SIZE = 500;

export interface ScoreBackfillResult {
  agentsUpdated: number;
  agenciesUpdated: number;
  errors: string[];
}

function isValidNumber(value: unknown): boolean {
  return typeof value === 'number' && isFinite(value);
}

async function backfillAgents(forceAll: boolean): Promise<{ updated: number; errors: string[] }> {
  const filter = forceAll
    ? {}
    : { $or: [{ score: { $lte: 0 } }, { score: { $exists: false } }], isActive: true };

  const total = await Agent.countDocuments(filter);
  if (total === 0) return { updated: 0, errors: [] };

  cronLogger.info(`[ScoreBackfill] Backfilling ${total} agent score(s)...`);

  let updated = 0;
  const errors: string[] = [];
  let skip = 0;

  while (skip < total) {
    try {
      const batch = await Agent.find(filter)
        .select('_id rating totalSales activeListings totalReviews')
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      const ops = batch
        .filter(a => isValidNumber(a.rating) || isValidNumber(a.totalSales) || isValidNumber(a.activeListings))
        .map(a => {
          const b = calcAgentScoreBreakdown({
            rating: isValidNumber(a.rating) ? (a.rating as number) : 0,
            totalSales: isValidNumber(a.totalSales) ? (a.totalSales as number) : 0,
            activeListings: isValidNumber(a.activeListings) ? (a.activeListings as number) : 0,
            totalReviews: isValidNumber(a.totalReviews) ? (a.totalReviews as number) : 0,
          });
          return {
            updateOne: {
              filter: { _id: a._id },
              update: {
                $set: {
                  score: b.total,
                  scoreBreakdown: { rating: b.rating, sales: b.sales, active: b.active, reviews: b.reviews },
                },
              },
            },
          };
        });

      if (ops.length > 0) {
        const result = await Agent.bulkWrite(ops, { ordered: false });
        updated += result.modifiedCount;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Agent batch skip=${skip}: ${msg}`);
      cronLogger.error(`[ScoreBackfill] Agent batch error at skip=${skip}:`, err);
    }

    skip += BATCH_SIZE;
  }

  return { updated, errors };
}

async function backfillAgencies(forceAll: boolean): Promise<{ updated: number; errors: string[] }> {
  const filter = forceAll
    ? {}
    : { $or: [{ score: { $lte: 0 } }, { score: { $exists: false } }] };

  const total = await Agency.countDocuments(filter);
  if (total === 0) return { updated: 0, errors: [] };

  cronLogger.info(`[ScoreBackfill] Backfilling ${total} agency score(s)...`);

  let updated = 0;
  const errors: string[] = [];
  let skip = 0;

  while (skip < total) {
    try {
      const batch = await Agency.find(filter)
        .select('_id totalProperties totalAgents yearsInBusiness isFeatured')
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      const ops = batch.map(a => {
        const b = calcAgencyScoreBreakdown({
          totalProperties: isValidNumber(a.totalProperties) ? (a.totalProperties as number) : 0,
          totalAgents: isValidNumber(a.totalAgents) ? (a.totalAgents as number) : 0,
          yearsInBusiness: isValidNumber(a.yearsInBusiness) ? (a.yearsInBusiness as number) : 0,
          isFeatured: Boolean(a.isFeatured),
        });
        return {
          updateOne: {
            filter: { _id: a._id },
            update: {
              $set: {
                score: b.total,
                scoreBreakdown: { listings: b.listings, team: b.team, experience: b.experience, featured: b.featured },
              },
            },
          },
        };
      });

      if (ops.length > 0) {
        const result = await Agency.bulkWrite(ops, { ordered: false });
        updated += result.modifiedCount;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Agency batch skip=${skip}: ${msg}`);
      cronLogger.error(`[ScoreBackfill] Agency batch error at skip=${skip}:`, err);
    }

    skip += BATCH_SIZE;
  }

  return { updated, errors };
}

/** Backfills only records with score === 0 or missing. Safe to run on startup. */
export async function runScoreBackfill(): Promise<ScoreBackfillResult> {
  cronLogger.info('[ScoreBackfill] Starting partial backfill (score=0 records only)...');
  const [agents, agencies] = await Promise.all([backfillAgents(false), backfillAgencies(false)]);
  const result: ScoreBackfillResult = {
    agentsUpdated: agents.updated,
    agenciesUpdated: agencies.updated,
    errors: [...agents.errors, ...agencies.errors],
  };
  cronLogger.info(`[ScoreBackfill] Done — agents: ${result.agentsUpdated}, agencies: ${result.agenciesUpdated}, errors: ${result.errors.length}`);
  return result;
}

/** Full refresh of ALL scores. Safe to run weekly to catch drift. */
export async function runScoreFullRefresh(): Promise<ScoreBackfillResult> {
  cronLogger.info('[ScoreBackfill] Starting full score refresh (all records)...');
  const [agents, agencies] = await Promise.all([backfillAgents(true), backfillAgencies(true)]);
  const result: ScoreBackfillResult = {
    agentsUpdated: agents.updated,
    agenciesUpdated: agencies.updated,
    errors: [...agents.errors, ...agencies.errors],
  };
  cronLogger.info(`[ScoreBackfill] Full refresh done — agents: ${result.agentsUpdated}, agencies: ${result.agenciesUpdated}, errors: ${result.errors.length}`);
  return result;
}
