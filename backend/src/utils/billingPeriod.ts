/**
 * Dates of a paid period. Pure, and in UTC so the server's time zone never
 * moves an expiry.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days the grace period lasts after a web plan expires. */
export const GRACE_PERIOD_DAYS = 7;

/**
 * `from` plus `months` calendar months, kept on the same day of the month
 * where it exists and on the month's last day where it doesn't:
 * Jan 31 + 1 month = Feb 28 (29 in a leap year), not Mar 3.
 */
export function addMonthsClamped(from: Date, months: number): Date {
  const day = from.getUTCDate();
  const result = new Date(from.getTime());
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/** The end of one billing period that starts at `from`. Unknown periods count as monthly. */
export function addBillingPeriod(from: Date, period: string | undefined): Date {
  switch (period) {
    case 'yearly':
      return addMonthsClamped(from, 12);
    case 'quarterly':
      return addMonthsClamped(from, 3);
    case 'weekly':
      return new Date(from.getTime() + 7 * DAY_MS);
    default:
      return addMonthsClamped(from, 1);
  }
}

/** Rough length of a period in days, for comparing the value of two plans. */
export function periodDays(period: string | undefined): number {
  switch (period) {
    case 'yearly':
      return 365;
    case 'quarterly':
      return 91;
    case 'weekly':
      return 7;
    default:
      return 30;
  }
}

export interface CurrentPeriod {
  status: string;
  expirationDate: Date;
  gracePeriodEndDate?: Date;
}

/**
 * Where a newly paid period of the same plan starts:
 *  - no current plan: now;
 *  - still running: when it ends, so paying early never loses days;
 *  - in its grace period: when it originally ended, so the grace days are
 *    not given twice;
 *  - over: now.
 */
export function renewalStart(now: Date, current?: CurrentPeriod | null): Date {
  if (!current) return now;
  const expiry = current.expirationDate;
  if (current.status === 'grace') {
    const graceEnd = current.gracePeriodEndDate ?? new Date(expiry.getTime() + GRACE_PERIOD_DAYS * DAY_MS);
    if (now.getTime() <= graceEnd.getTime()) return expiry;
    return now;
  }
  return expiry.getTime() > now.getTime() ? expiry : now;
}

/** `date` plus whole days. */
export const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);
