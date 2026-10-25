/**
 * Daily Residence Pass upkeep:
 *  1. Residences published before billing existed start their free trial now
 *     (fair notice instead of vanishing on deploy).
 *  2. Plan coverage is recomputed, so a lapsed premium plan stops covering
 *     residences and a new one starts.
 *  3. Owners get the trial reminders (day 10, day 14) and the offline notice,
 *     in-app and by email, each exactly once.
 */
import Development from '../../../models/Development';
import User from '../../../models/User';
import emailService from '../../emailService';
import { createNotificationWithPush } from '../../engagementService';
import { encodeId } from '../../../utils/idObfuscation';
import { createLogger } from '../../../utils/logger';
import { billingFacts, recomputeOwnerBilling } from './residenceBillingService';
import { reminderDue, residenceAccess, trialWindow } from './residencePlan';

const log = createLogger('ResidenceBillingJob');

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

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

const reminderText = (key: string, name: string, daysLeft: number | null) =>
  key === 'expired'
    ? { title: `${name} is offline`, message: `The free trial of ${name} has ended. Buy a Residence Pass to put it back online.` }
    : { title: `${name}: free trial ends soon`, message: `${name} goes offline in ${daysLeft ?? 0} day(s). Buy a Residence Pass to keep it public.` };

async function sendReminder(dev: InstanceType<typeof Development>, key: string, now: Date): Promise<void> {
  const owner = await User.findById(dev.ownerId).select('email name');
  const { daysLeft } = residenceAccess(billingFacts(dev), now);
  const { title, message } = reminderText(key, dev.name, daysLeft);
  const path = `/dashboard/developments/${encodeId(String(dev._id))}`;
  const link = `${process.env.FRONTEND_URL || 'https://balkanestateai.com'}/en${path}`;
  await createNotificationWithPush({
    userId: dev.ownerId,
    type: key === 'expired' ? 'residence_offline' : 'residence_trial_reminder',
    title,
    message,
    icon: 'building',
    priority: key === 'expired' ? 'high' : 'normal',
    data: { developmentId: encodeId(String(dev._id)), reminder: key, actionUrl: path },
  });
  if (owner?.email) {
    await emailService.sendEmail({
      to: owner.email,
      subject: title,
      category: 'alerts',
      html: `<p>${esc(message)}</p><p><a href="${esc(link)}">Open ${esc(dev.name)}</a></p>`,
      text: `${message}\n${link}`,
    });
  }
}

export async function runResidenceBillingJob(now = new Date()): Promise<{ backfilled: number; owners: number; reminders: number }> {
  const backfilled = await backfillPublishedResidences(now);

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
      await sendReminder(dev, key, now);
      reminders += 1;
    } catch (error) {
      log.error(`Reminder ${key} failed for residence ${String(dev._id)}:`, error);
    }
  }
  return { backfilled, owners: owners.length, reminders };
}
