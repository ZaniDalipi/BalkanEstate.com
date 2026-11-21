import { periodDays } from './billingPeriod';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Never credit more than ten years, whatever the inputs. */
const MAX_CREDIT_DAYS = 3650;

export interface SwitchCreditInput {
  /** What was paid for the old plan's current period, in euros (0 for a free code). */
  paidForOldPeriod: number;
  oldPeriod: string | undefined;
  oldExpiresAt: Date;
  /** List price of the new plan, in euros. */
  newPrice: number;
  newPeriod: string | undefined;
  now: Date;
}

/**
 * Days added to a new plan for the unused part of the plan it replaces.
 *
 * Credit is by value, not by days: 10 unused days of a €25/month plan are
 * worth about €8.33, which buys fewer days of a pricier plan and more of a
 * cheaper one. A plan that was free (a 100%-off code) earns no credit.
 */
export function creditDaysForSwitch(input: SwitchCreditInput): number {
  const remainingDays = Math.max(0, (input.oldExpiresAt.getTime() - input.now.getTime()) / DAY_MS);
  if (remainingDays === 0 || input.paidForOldPeriod <= 0 || input.newPrice <= 0) return 0;
  const unusedValue = remainingDays * (input.paidForOldPeriod / periodDays(input.oldPeriod));
  const newDailyPrice = input.newPrice / periodDays(input.newPeriod);
  return Math.min(MAX_CREDIT_DAYS, Math.floor(unusedValue / newDailyPrice));
}
