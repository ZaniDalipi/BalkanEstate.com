/**
 * Residence Pass rules as pure functions: what a residence's billing facts
 * mean right now (state, public or not, building limit), whether publishing
 * may start a trial, how passes stack, prices and which reminder is due.
 * No database access, so every rule is unit-tested on its own.
 */
import {
  INCLUDED_RESIDENCES_BY_TIER,
  MAX_TRIALS_PER_OWNER,
  PREMIUM_PASS_DISCOUNT,
  RESIDENCE_INCLUDED_BUILDINGS,
  RESIDENCE_REMINDER_DAYS,
  RESIDENCE_TRIAL_DAYS,
  type ResidenceAccessState,
  type ResidencePurchaseKind,
} from '../../../config/residenceBilling';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BillingFacts {
  status: 'draft' | 'published' | 'archived';
  trialStartedAt?: Date | null;
  trialEndsAt?: Date | null;
  paidUntil?: Date | null;
  includedUntil?: Date | null;
  /** Covered by the agency's yearly free residence until this date (grace included). */
  agencyUntil?: Date | null;
  extraBuildings?: number;
  /** Buildings a residence includes (admin-editable on the pass product). */
  includedBuildings?: number;
  /** Admin override of the building limit; wins over everything else. */
  buildingLimitOverride?: number | null;
}

export interface ResidenceAccess {
  state: ResidenceAccessState;
  /** Latest moment any trial, pass or plan keeps it public; null if never. */
  visibleUntil: Date | null;
  /** Published and within that window. */
  publicNow: boolean;
  /** Whole days left in the current state; null without an end date. */
  daysLeft: number | null;
  /** Buildings allowed right now (existing ones are never removed). */
  buildingLimit: number;
}

const isAfter = (d: Date | null | undefined, now: Date): d is Date => !!d && d.getTime() > now.getTime();

const latest = (dates: Array<Date | null | undefined>): Date | null =>
  dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null);

export function residenceAccess(f: BillingFacts, now: Date): ResidenceAccess {
  let state: ResidenceAccessState = 'none';
  let ends: Date | null = null;
  if (isAfter(f.paidUntil, now)) [state, ends] = ['active', f.paidUntil];
  else if (isAfter(f.agencyUntil, now)) [state, ends] = ['agency', f.agencyUntil];
  else if (isAfter(f.includedUntil, now)) [state, ends] = ['included', f.includedUntil];
  else if (isAfter(f.trialEndsAt, now)) [state, ends] = ['trial', f.trialEndsAt];
  else if (f.trialStartedAt || f.agencyUntil) state = 'expired'; // a trial or an agency's free period has ended

  const visibleUntil = latest([f.paidUntil, f.agencyUntil, f.includedUntil, f.trialEndsAt]);
  const covered = state === 'active' || state === 'included' || state === 'agency';
  const included = f.includedBuildings && f.includedBuildings >= 1 ? f.includedBuildings : RESIDENCE_INCLUDED_BUILDINGS;
  const override = f.buildingLimitOverride && f.buildingLimitOverride >= 1 ? f.buildingLimitOverride : null;
  return {
    state,
    visibleUntil,
    publicNow: f.status === 'published' && isAfter(visibleUntil, now),
    daysLeft: ends ? Math.ceil((ends.getTime() - now.getTime()) / DAY_MS) : null,
    buildingLimit: override ?? included + (covered ? Math.max(0, f.extraBuildings ?? 0) : 0),
  };
}

export type PublishDecision =
  | { ok: true; startTrial: boolean }
  | { ok: false; code: 'PASS_REQUIRED' | 'TRIAL_IN_PROGRESS' | 'TRIAL_LIMIT' };

/**
 * Publishing is always allowed while a trial, pass, plan or agency covers the
 * residence. Otherwise the first publish starts its trial, unless the owner
 * already has one running or has used all their trials; after the trial,
 * publishing needs a pass.
 */
export function publishDecision(access: ResidenceAccess, ownerTrials: { total: number; running: number }): PublishDecision {
  if (access.state === 'trial' || access.state === 'active' || access.state === 'included' || access.state === 'agency') {
    return { ok: true, startTrial: false };
  }
  if (access.state === 'expired') return { ok: false, code: 'PASS_REQUIRED' };
  if (ownerTrials.total >= MAX_TRIALS_PER_OWNER) return { ok: false, code: 'TRIAL_LIMIT' };
  if (ownerTrials.running > 0) return { ok: false, code: 'TRIAL_IN_PROGRESS' };
  return { ok: true, startTrial: true };
}

export const trialWindow = (now: Date): { trialStartedAt: Date; trialEndsAt: Date } => ({
  trialStartedAt: now,
  trialEndsAt: new Date(now.getTime() + RESIDENCE_TRIAL_DAYS * DAY_MS),
});

/** `months` calendar months after `d` (UTC), clamped to the month's last day. */
export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime());
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + months);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

/** A new pass starts when the current one ends (or now), so renewing early never loses time. */
export function passPeriod(paidUntil: Date | null | undefined, now: Date, months: number): { start: Date; end: Date } {
  const start = isAfter(paidUntil, now) ? paidUntil : now;
  return { start, end: addMonths(start, months) };
}

export type BuildingCapacity = { ok: true } | { ok: false; limit: number; current: number; allowed: number };

export function canAddBuildings(limit: number, current: number, adding: number): BuildingCapacity {
  if (current + adding <= limit) return { ok: true };
  return { ok: false, limit, current, allowed: Math.max(0, limit - current) };
}

export interface PriceQuote {
  listPrice: number;
  unitPrice: number;
  amount: number;
  discountPct: number;
}

/** Price for `quantity` of a product; premium owners get the pass discount (not on buildings). */
export function quote(kind: ResidencePurchaseKind, quantity: number, listPrice: number, premium: boolean): PriceQuote {
  const discountPct = premium && kind === 'pass' ? Math.round(PREMIUM_PASS_DISCOUNT * 100) : 0;
  const unitPrice = Math.round(listPrice * (100 - discountPct)) / 100;
  return { listPrice, unitPrice, amount: Math.round(unitPrice * quantity * 100) / 100, discountPct };
}

/**
 * The reminder email due now, if any: the latest trial-day reminder not yet
 * sent (earlier ones are skipped, never sent late in a burst), or the expiry
 * notice once the trial ended without a pass.
 */
export function reminderDue(f: BillingFacts, sent: readonly string[], now: Date): string | null {
  const access = residenceAccess(f, now);
  if (f.status !== 'published' || !f.trialStartedAt) return null;
  if (access.state === 'expired') return sent.includes('expired') ? null : 'expired';
  if (access.state !== 'trial') return null;
  const elapsed = (now.getTime() - f.trialStartedAt.getTime()) / DAY_MS;
  const due = [...RESIDENCE_REMINDER_DAYS].reverse().find((d) => elapsed >= d);
  if (due === undefined) return null;
  const key = `day${due}`;
  return sent.includes(key) ? null : key;
}

/** Which of an owner's published residences (oldest publish first) their plan includes. */
export function includedResidenceIds(published: Array<{ id: string; publishedAt?: Date | null }>, included: number): Set<string> {
  const ordered = [...published].sort((a, b) => (a.publishedAt?.getTime() ?? 0) - (b.publishedAt?.getTime() ?? 0));
  return new Set(ordered.slice(0, Math.max(0, included)).map((r) => r.id));
}

/**
 * Residences an active premium plan includes. Reads the subscription tier,
 * falling back to the plan's product id for accounts that only carry the
 * legacy `subscriptionPlan` (e.g. "pro_yearly", "agency_yearly").
 */
export function includedResidencesFor(tier?: string | null, plan?: string | null): number {
  if (tier && INCLUDED_RESIDENCES_BY_TIER[tier] !== undefined) return INCLUDED_RESIDENCES_BY_TIER[tier];
  if (tier === 'agency_owner') return 0; // agencies: one free residence per subscription year instead
  const p = (plan ?? '').toLowerCase();
  if (p.includes('agency') || p.includes('enterprise')) return 0;
  if (p.includes('pro_')) return INCLUDED_RESIDENCES_BY_TIER.pro ?? 0;
  return 0;
}
