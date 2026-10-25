/**
 * The dashboard's view of a residence's plan: state, countdown, buildings
 * used of allowed, prices and what publishing would do next.
 */
import mongoose from 'mongoose';
import DevelopmentBuilding from '../../../models/DevelopmentBuilding';
import type { IDevelopment } from '../../../models/Development';
import { RESIDENCE_INCLUDED_BUILDINGS, RESIDENCE_PASS_MONTHS, RESIDENCE_TRIAL_DAYS } from '../../../config/residenceBilling';
import { ownerPlan } from './ownerPlan';
import { billingFacts, ownerTrialCounts } from './residenceBillingService';
import { quoteFor } from './residencePurchaseService';
import { publishDecision, residenceAccess } from './residencePlan';

export async function billingSummary(dev: IDevelopment, now = new Date()) {
  const access = residenceAccess(billingFacts(dev), now);
  const [buildings, plan, trials, pass, extraBuilding] = await Promise.all([
    DevelopmentBuilding.countDocuments({ developmentId: dev._id, deletedAt: { $exists: false } }),
    ownerPlan(dev.ownerId),
    ownerTrialCounts(dev.ownerId, dev._id as mongoose.Types.ObjectId, now),
    quoteFor(dev, 'pass', 1),
    quoteFor(dev, 'extra_building', 1),
  ]);
  const next = publishDecision(access, trials);
  return {
    state: access.state,
    publicNow: access.publicNow,
    visibleUntil: access.visibleUntil,
    daysLeft: access.daysLeft,
    trialStartedAt: dev.billing?.trialStartedAt ?? null,
    trialEndsAt: dev.billing?.trialEndsAt ?? null,
    paidUntil: dev.billing?.paidUntil ?? null,
    includedUntil: dev.billing?.includedUntil ?? null,
    buildings: { used: buildings, limit: access.buildingLimit, included: RESIDENCE_INCLUDED_BUILDINGS, extra: dev.billing?.extraBuildings ?? 0 },
    /** What pressing "Publish" does now: start the trial, just publish, or need a pass. */
    publish: next.ok === false ? { allowed: false, reason: next.code } : { allowed: true, startsTrial: next.startTrial },
    premium: plan.premium,
    prices: { currency: 'EUR', pass, extraBuilding },
    terms: { trialDays: RESIDENCE_TRIAL_DAYS, passMonths: RESIDENCE_PASS_MONTHS, includedBuildings: RESIDENCE_INCLUDED_BUILDINGS },
    /** Online payment is off for now: purchases complete with a full-cover code. */
    paymentsEnabled: false,
  };
}

export type BillingSummary = Awaited<ReturnType<typeof billingSummary>>;
