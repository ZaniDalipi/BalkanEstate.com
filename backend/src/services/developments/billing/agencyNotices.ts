/**
 * Daily: keep agencies' free residences in step with their subscriptions and
 * tell the agency when they are in the grace period and when they go offline
 * (each once per lapse; a renewal resets it).
 */
import Agency from '../../../models/Agency';
import Development from '../../../models/Development';
import { createLogger } from '../../../utils/logger';
import { agencySubscribed } from './agencyYear';
import { recomputeAgencyResidences } from './residenceBillingService';
import { sendResidenceNotice, type ResidenceNoticeKey } from './residenceNotices';

const log = createLogger('AgencyResidenceNotices');
const AGENCY_KEYS = ['agencyGrace', 'agencyOffline'];

export async function runAgencyResidenceUpkeep(now = new Date()): Promise<{ agencies: number; notices: number }> {
  const agencyIds = await Development.distinct('agencyId', { deletedAt: { $exists: false }, 'billing.agencyYearStart': { $exists: true } });
  let notices = 0;
  for (const agencyId of agencyIds) {
    if (!agencyId) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      await recomputeAgencyResidences(agencyId, now);
      // eslint-disable-next-line no-await-in-loop
      const agency = await Agency.findById(agencyId).select('ownerId subscription').lean();
      const subscribed = !!agency && agencySubscribed(agency.subscription, now);
      // eslint-disable-next-line no-await-in-loop
      const devs = await Development.find({ agencyId, deletedAt: { $exists: false }, 'billing.agencyYearStart': { $exists: true } });
      for (const dev of devs) {
        const sent = dev.billing.remindersSent ?? [];
        if (subscribed) {
          // Renewed: a future lapse should be announced again.
          if (sent.some((k) => AGENCY_KEYS.includes(k))) {
            // eslint-disable-next-line no-await-in-loop
            await Development.updateOne({ _id: dev._id }, { $pull: { 'billing.remindersSent': { $in: AGENCY_KEYS } } });
          }
          continue;
        }
        if (dev.status !== 'published') continue;
        const until = dev.billing.agencyUntil;
        const key: ResidenceNoticeKey | null = until && until > now ? 'agencyGrace' : 'agencyOffline';
        if (sent.includes(key)) continue;
        // eslint-disable-next-line no-await-in-loop
        await Development.updateOne({ _id: dev._id }, { $addToSet: { 'billing.remindersSent': key } });
        // eslint-disable-next-line no-await-in-loop
        await sendResidenceNotice(dev, key, { until, extraRecipients: agency?.ownerId ? [String(agency.ownerId)] : [] });
        notices += 1;
      }
    } catch (error) {
      log.error(`Agency residence upkeep failed for agency ${String(agencyId)}:`, error);
    }
  }
  return { agencies: agencyIds.length, notices };
}
