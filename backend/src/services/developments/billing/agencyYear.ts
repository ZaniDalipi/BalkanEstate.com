/**
 * Agencies and their free residences, as pure functions: which subscription
 * year a moment falls in, and until when an agency's free residences stay
 * public (while subscribed, plus a grace period after it ends).
 */
import { AGENCY_GRACE_DAYS } from '../../../config/residenceBilling';
import { addMonths } from './residencePlan';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AgencySubscriptionFacts {
  status?: string | null;
  startDate?: Date | null;
  expiresAt?: Date | null;
}

export function agencySubscribed(sub: AgencySubscriptionFacts | null | undefined, now: Date): boolean {
  return !!sub && (sub.status === 'active' || sub.status === 'trial') && !!sub.expiresAt && sub.expiresAt > now;
}

/**
 * Start of the subscription year `now` is in. Years are counted from the
 * subscription's start date, so a renewal that only extends the end date and
 * one that restarts the subscription both give a new year on time.
 */
export function agencyYearStart(sub: AgencySubscriptionFacts, now: Date): Date {
  const anchor = sub.startDate ?? (sub.expiresAt ? addMonths(sub.expiresAt, -12) : now);
  if (now <= anchor) return anchor;
  let start = anchor;
  for (let i = 0; i < 200; i += 1) {
    const next = addMonths(anchor, 12 * (i + 1));
    if (next > now) break;
    start = next;
  }
  return start;
}

/**
 * Until when an agency's free residences are public. While subscribed: the
 * end of the subscription plus the grace period. After it ends: the grace
 * counts from when it ended (`endedAt`, recorded the first time it was seen
 * ended, so the date never moves).
 */
export function agencyCoverageEnd(sub: AgencySubscriptionFacts | null | undefined, endedAt: Date | null | undefined, now: Date): Date | null {
  if (!sub) return endedAt ? new Date(endedAt.getTime() + AGENCY_GRACE_DAYS * DAY_MS) : null;
  if (agencySubscribed(sub, now)) return new Date((sub.expiresAt as Date).getTime() + AGENCY_GRACE_DAYS * DAY_MS);
  const ended = endedAt ?? (sub.expiresAt && sub.expiresAt <= now ? sub.expiresAt : null);
  return ended ? new Date(ended.getTime() + AGENCY_GRACE_DAYS * DAY_MS) : null;
}
