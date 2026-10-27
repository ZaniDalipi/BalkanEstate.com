/**
 * Owner notices about a residence's visibility, in-app (opens the residence
 * dashboard) and by email: trial reminders, the offline notice, and an
 * agency's grace period after its subscription ended.
 */
import Development from '../../../models/Development';
import User from '../../../models/User';
import emailService from '../../emailService';
import { createNotificationWithPush } from '../../engagementService';
import { encodeId } from '../../../utils/idObfuscation';

export type ResidenceNoticeKey = 'day10' | 'day14' | 'expired' | 'agencyGrace' | 'agencyOffline';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '');

const noticeText = (key: string, name: string, daysLeft: number | null, until?: Date | null) => {
  switch (key) {
    case 'expired':
      return { title: `${name} is offline`, message: `The free trial of ${name} has ended. Buy a Residence Pass to put it back online.` };
    case 'agencyGrace':
      return {
        title: `${name}: renew your agency plan`,
        message: `Your agency subscription has ended. ${name} stays public until ${day(until)}; renew to keep it online.`,
      };
    case 'agencyOffline':
      return { title: `${name} is offline`, message: `Your agency subscription has ended, so ${name} is offline. Renew to put it back online.` };
    default:
      return { title: `${name}: free trial ends soon`, message: `${name} goes offline in ${daysLeft ?? 0} day(s). Buy a Residence Pass to keep it public.` };
  }
};

const TYPE: Record<string, 'residence_trial_reminder' | 'residence_offline' | 'residence_agency_grace'> = {
  day10: 'residence_trial_reminder',
  day14: 'residence_trial_reminder',
  expired: 'residence_offline',
  agencyGrace: 'residence_agency_grace',
  agencyOffline: 'residence_offline',
};

/** The client's text for each notice (developments:notices.<key>.title / .message). */
const NOTICE_TEXT_KEY: Record<ResidenceNoticeKey, string> = {
  day10: 'trialEndsSoon',
  day14: 'trialEndsSoon',
  expired: 'trialEnded',
  agencyGrace: 'agencyGrace',
  agencyOffline: 'agencyOffline',
};

export async function sendResidenceNotice(
  dev: InstanceType<typeof Development>,
  key: ResidenceNoticeKey,
  opts: { daysLeft?: number | null; until?: Date | null; extraRecipients?: string[] } = {}
): Promise<void> {
  const { title, message } = noticeText(key, dev.name, opts.daysLeft ?? null, opts.until);
  const path = `/dashboard/developments/${encodeId(String(dev._id))}`;
  const link = `${process.env.FRONTEND_URL || 'https://balkanestateai.com'}/en${path}`;
  const recipients = [...new Set([String(dev.ownerId), ...(opts.extraRecipients ?? [])])];
  for (const userId of recipients) {
    // eslint-disable-next-line no-await-in-loop
    await createNotificationWithPush({
      userId,
      type: TYPE[key],
      title,
      message,
      icon: 'building',
      priority: key === 'expired' || key === 'agencyOffline' ? 'high' : 'normal',
      // textKey + textParams let the bell show it in the reader's language; title/message stay as the English fallback.
      data: {
        developmentId: encodeId(String(dev._id)),
        reminder: key,
        actionUrl: path,
        textKey: NOTICE_TEXT_KEY[key],
        textParams: { name: dev.name, days: opts.daysLeft ?? 0, date: day(opts.until) },
      },
    });
    // eslint-disable-next-line no-await-in-loop
    const user = await User.findById(userId).select('email');
    if (user?.email) {
      // eslint-disable-next-line no-await-in-loop
      await emailService.sendEmail({
        to: user.email,
        subject: title,
        category: 'alerts',
        html: `<p>${esc(message)}</p><p><a href="${esc(link)}">Open ${esc(dev.name)}</a></p>`,
        text: `${message}\n${link}`,
      });
    }
  }
}
