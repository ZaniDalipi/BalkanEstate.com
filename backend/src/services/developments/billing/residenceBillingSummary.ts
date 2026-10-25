/**
 * The dashboard's view of a residence's plan: state, countdown, buildings
 * used of allowed, prices and what publishing would do next.
 */
import mongoose from 'mongoose';
import DevelopmentBuilding from '../../../models/DevelopmentBuilding';
import type { IDevelopment } from '../../../models/Development';
import { RESIDENCE_TRIAL_DAYS } from '../../../config/residenceBilling';
import { agencyAllowance } from './agencyResidences';
import { residenceTerms } from './residenceTerms';
import { ownerPlan } from './ownerPlan';
import { billingFacts, ownerTrialCounts } from './residenceBillingService';
import { quoteFor } from './residencePurchaseService';
import { publishDecision, residenceAccess } from './residencePlan';

export async function billingSummary(dev: IDevelopment, now = new Date()) {
  const terms = await residenceTerms();
  const access = residenceAccess(billingFacts(dev, { includedBuildings: terms.includedBuildings }), now);
  const [buildings, plan, trials, pass, extraBuilding, agency] = await Promise.all([
    DevelopmentBuilding.countDocuments({ developmentId: dev._id, deletedAt: { $exists: false } }),
    ownerPlan(dev.ownerId),
    ownerTrialCounts({ ownerId: dev.ownerId, agencyId: dev.agencyId }, dev._id as mongoose.Types.ObjectId, now),
    quoteFor(dev, 'pass', 1),
    quoteFor(dev, 'extra_building', 1),
    dev.agencyId ? agencyAllowance(dev.agencyId, terms.residencesPerYear, now) : Promise.resolve(null),
  ]);
  // An unpublished agency residence takes a free one on publish while any is left this year.
  const agencyFree = !!agency && !dev.billing?.agencyYearStart && dev.status !== 'published' && agency.left > 0;
  const next = agencyFree ? ({ ok: true, startTrial: false } as const) : publishDecision(access, trials);
  return {
    state: access.state,
    publicNow: access.publicNow,
    visibleUntil: access.visibleUntil,
    daysLeft: access.daysLeft,
    trialStartedAt: dev.billing?.trialStartedAt ?? null,
    trialEndsAt: dev.billing?.trialEndsAt ?? null,
    paidUntil: dev.billing?.paidUntil ?? null,
    includedUntil: dev.billing?.includedUntil ?? null,
    buildings: {
      used: buildings,
      limit: access.buildingLimit,
      included: terms.includedBuildings,
      extra: dev.billing?.extraBuildings ?? 0,
      adminLimit: dev.billing?.buildingLimit ?? null,
    },
    /** What pressing "Publish" does now: start the trial, just publish, or need a pass. */
    publish:
      next.ok === false ? { allowed: false, reason: next.code } : { allowed: true, startsTrial: next.startTrial, usesAgencyFree: agencyFree },
    agencyUntil: dev.billing?.agencyUntil ?? null,
    agency: agency
      ? { name: agency.agencyName ?? null, subscribed: agency.subscribed, left: agency.left, allowed: agency.allowed, yearEnd: agency.yearEnd }
      : null,
    premium: plan.premium,
    prices: { currency: 'EUR', pass, extraBuilding },
    terms: { trialDays: RESIDENCE_TRIAL_DAYS, passMonths: terms.passMonths, includedBuildings: terms.includedBuildings, residencesPerYear: terms.residencesPerYear },
    /** Online payment is off for now: purchases complete with a full-cover code. */
    paymentsEnabled: false,
  };
}

export type BillingSummary = Awaited<ReturnType<typeof billingSummary>>;
