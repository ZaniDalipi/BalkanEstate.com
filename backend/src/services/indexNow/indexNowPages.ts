/**
 * Announce changed agency, agent and residence (development) pages to
 * IndexNow, the same way listings are announced. Each looks up the public
 * address of the page (slug or agent id) and queues it in every language.
 * Fire-and-forget: a failure is logged and never reaches the person who made
 * the change.
 */
import Agency from '../../models/Agency';
import Agent from '../../models/Agent';
import Development from '../../models/Development';
import { isIndexNowEnabled } from '../../config/indexNow';
import { isValidObjectId } from '../../utils/validateParams';
import { createLogger } from '../../utils/logger';
import { agencyPagePath, agentPagePath, developmentPagePath } from './indexNowUrls';
import { queuePagePaths } from './indexNowService';

const logger = createLogger('IndexNow');

const safely = async (what: string, work: () => Promise<void>): Promise<void> => {
  if (!isIndexNowEnabled()) return;
  try {
    await work();
  } catch (error) {
    logger.warn(`Could not queue a changed ${what}:`, error instanceof Error ? error.message : error);
  }
};

/** An agency changed (profile, logo, cover, team). `key` is its id or slug. */
export const notifyAgencyChanged = (key: string): Promise<void> =>
  safely('agency', async () => {
    const agency = await Agency.findOne(isValidObjectId(key) ? { _id: key } : { slug: key.toLowerCase() })
      .select('slug')
      .lean();
    if (agency?.slug) queuePagePaths([agencyPagePath(String(agency.slug))]);
  });

/**
 * An agent's page changed. Give `userId` for the signed-in agent's own
 * profile, or `key` for the `:id` an agent route was called with (agent id,
 * record id or user id, as GET /api/agents/:id accepts).
 */
export const notifyAgentChanged = (who: { userId?: string; key?: string }): Promise<void> =>
  safely('agent', async () => {
    const or: Record<string, string>[] = [];
    if (who.userId) or.push({ userId: who.userId });
    if (who.key) {
      or.push({ agentId: who.key });
      if (isValidObjectId(who.key)) or.push({ _id: who.key }, { userId: who.key });
    }
    if (or.length === 0) return;
    const agent = await Agent.findOne({ $or: or }).select('agentId').lean();
    if (agent?.agentId) queuePagePaths([agentPagePath(agent.agentId)]);
  });

/**
 * A residence changed (details, photos, units, prices, scenes, publish or
 * delete). Residences that were never published have no public page and are
 * skipped; an unpublished or deleted one is still announced, so search
 * engines drop it quickly.
 */
export const notifyDevelopmentChanged = (developmentId: string): Promise<void> =>
  safely('residence', async () => {
    if (!isValidObjectId(developmentId)) return;
    const development = await Development.findById(developmentId).select('slug publishedAt').lean();
    if (development?.slug && development.publishedAt) queuePagePaths([developmentPagePath(development.slug)]);
  });
