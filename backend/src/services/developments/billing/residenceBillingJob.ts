/**
 * Daily Residence Pass upkeep:
 *  1. Residences published before billing existed start their free trial now
 *     (fair notice instead of vanishing on deploy).
 *  2. Plan coverage is recomputed, so a lapsed premium plan stops covering
 *     residences and a new one starts.
 *  3. Owners get the trial reminders (day 10, day 14) and the offline notice,
 *     in-app and by email, each exactly once.
 *  4. Agencies' free residences follow their subscriptions (agencyNotices).
 */
import Development from '../../../models/Development';
import { createLogger } from '../../../utils/logger';
import { runAgencyResidenceUpkeep } from './agencyNotices';
import { billingFacts, recomputeOwnerBilling } from './residenceBillingService';
import { reminderDue, residenceAccess, trialWindow } from './residencePlan';
import { sendResidenceNotice, type ResidenceNoticeKey } from './residenceNotices';

const log = createLogger('ResidenceBillingJob');

/** Published residences with no billing yet get a fresh trial starting now. */
export async function backfillPublishedResidences(now = new Date()): Promise<number> {
  const legacy = await Development.find({
    status: 'published',
    deletedAt: { $exists: false },
    'billing.trialStartedAt': { $exists: false },
    'billing.paidUntil': { $exists: false },
    visibleUntil: { $exists: false },
  }).select('_id');
  const t = trialWindow(now);
  if (legacy.length) {
    await Development.updateMany(
      { _id: { $in: legacy.map((d) => d._id) } },
      { $set: { 'billing.trialStartedAt': t.trialStartedAt, 'billing.trialEndsAt': t.trialEndsAt, visibleUntil: t.trialEndsAt } }
    );
  }
  return legacy.length;
}

export async function runResidenceBillingJob(
  now = new Date()
): Promise<{ backfilled: number; owners: number; reminders: number; agencies: number; agencyNotices: number }> {
  const backfilled = await backfillPublishedResidences(now);
  const agencyRun = await runAgencyResidenceUpkeep(now);

  const owners = await Development.distinct('ownerId', { status: 'published', deletedAt: { $exists: false } });
  for (const ownerId of owners) {
    // eslint-disable-next-line no-await-in-loop
    await recomputeOwnerBilling(ownerId, now);
  }

  let reminders = 0;
  const onTrial = await Development.find({ status: 'published', deletedAt: { $exists: false }, 'billing.trialStartedAt': { $exists: true } });
  for (const dev of onTrial) {
    const key = reminderDue(billingFacts(dev), dev.billing.remindersSent ?? [], now);
    if (!key) continue;
    try {
      // Mark first, so a failing email never turns into a daily resend.
      // eslint-disable-next-line no-await-in-loop
      await Development.updateOne({ _id: dev._id }, { $addToSet: { 'billing.remindersSent': key } });
      // eslint-disable-next-line no-await-in-loop
      await sendResidenceNotice(dev, key as ResidenceNoticeKey, { daysLeft: residenceAccess(billingFacts(dev), now).daysLeft });
      reminders += 1;
    } catch (error) {
      log.error(`Reminder ${key} failed for residence ${String(dev._id)}:`, error);
    }
  }
  return { backfilled, owners: owners.length, reminders, agencies: agencyRun.agencies, agencyNotices: agencyRun.notices };
}
