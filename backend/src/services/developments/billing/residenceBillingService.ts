/**
 * Residence Pass state: recompute a residence's billing from its purchases
 * and its owner's plan, gate publishing (start the free trial, or require a
 * pass), and enforce the building limit wherever buildings are created.
 */
import mongoose from 'mongoose';
import Development, { type IDevelopment } from '../../../models/Development';
import DevelopmentBuilding from '../../../models/DevelopmentBuilding';
import ResidencePurchase from '../../../models/ResidencePurchase';
import { setDevelopmentStatus } from '../developmentService';
import { BillingError } from './billingErrors';
import { includedUntilFor, ownerPlan } from './ownerPlan';
import {
  canAddBuildings,
  publishDecision,
  residenceAccess,
  trialWindow,
  type BillingFacts,
  type BuildingCapacity,
} from './residencePlan';

type Id = mongoose.Types.ObjectId | string;

export const billingFacts = (dev: IDevelopment, includedUntil?: Date | null): BillingFacts => ({
  status: dev.status,
  trialStartedAt: dev.billing?.trialStartedAt,
  trialEndsAt: dev.billing?.trialEndsAt,
  paidUntil: dev.billing?.paidUntil,
  includedUntil: includedUntil === undefined ? dev.billing?.includedUntil : includedUntil,
  extraBuildings: dev.billing?.extraBuildings ?? 0,
});

/** Rebuild `billing` and `visibleUntil` from the purchase ledger and the owner's plan. */
export async function recomputeBilling(developmentId: Id, now = new Date()): Promise<IDevelopment | null> {
  const dev = await Development.findById(developmentId);
  if (!dev) return null;
  const purchases = await ResidencePurchase.find({ developmentId: dev._id, status: 'completed' }).lean();
  const passEnds = purchases.filter((p) => p.kind === 'pass').map((p) => p.periodEnd.getTime());
  const extras = purchases
    .filter((p) => p.kind === 'extra_building' && p.periodEnd > now)
    .reduce((n, p) => n + p.quantity, 0);
  const includedUntil = await includedUntilFor(dev, now);

  dev.billing.paidUntil = passEnds.length ? new Date(Math.max(...passEnds)) : undefined;
  dev.billing.extraBuildings = extras;
  dev.billing.includedUntil = includedUntil;
  dev.visibleUntil = residenceAccess(billingFacts(dev), now).visibleUntil ?? undefined;
  await dev.save();
  return dev;
}

/** Plan inclusion depends on the owner's other residences, so recompute them all. */
export async function recomputeOwnerBilling(ownerId: Id, now = new Date()): Promise<void> {
  const devs = await Development.find({ ownerId, deletedAt: { $exists: false } }).select('_id').lean();
  for (const d of devs) {
    // eslint-disable-next-line no-await-in-loop
    await recomputeBilling(d._id, now);
  }
}

/** Trials the owner has used (deleted residences count) and has running now. */
export async function ownerTrialCounts(ownerId: Id, excludeId: Id, now = new Date()) {
  const base = { ownerId, _id: { $ne: excludeId }, 'billing.trialStartedAt': { $exists: true } };
  const [total, running] = await Promise.all([
    Development.countDocuments(base),
    Development.countDocuments({
      ...base,
      deletedAt: { $exists: false },
      'billing.trialEndsAt': { $gt: now },
      $or: [{ 'billing.paidUntil': { $exists: false } }, { 'billing.paidUntil': null }, { 'billing.paidUntil': { $lte: now } }],
    }),
  ]);
  return { total, running };
}

const PUBLISH_MESSAGES = {
  PASS_REQUIRED: 'The free trial has ended. Buy a Residence Pass to publish this residence.',
  TRIAL_IN_PROGRESS: 'Another residence of yours is on its free trial. Buy a Residence Pass to publish this one now.',
  TRIAL_LIMIT: 'You have used all your free trials. Buy a Residence Pass to publish this residence.',
} as const;

/**
 * Publish or unpublish through the Residence Pass rules. The first publish
 * starts the free trial; once it has ended, publishing needs a pass or plan.
 * Unpublishing is always allowed.
 */
export async function setResidenceStatus(
  dev: IDevelopment,
  status: 'draft' | 'published',
  now = new Date()
): Promise<IDevelopment> {
  if (status === 'published' && dev.status !== 'published') {
    const included = await includedUntilFor(dev, now, true);
    const access = residenceAccess(billingFacts(dev, included ?? null), now);
    const decision = publishDecision(access, await ownerTrialCounts(dev.ownerId, dev._id as Id, now));
    if (decision.ok === false) throw new BillingError(decision.code, PUBLISH_MESSAGES[decision.code]);
    if (decision.startTrial) Object.assign(dev.billing, trialWindow(now));
  }
  await setDevelopmentStatus(dev, status);
  await recomputeOwnerBilling(dev.ownerId, now);
  return (await Development.findById(dev._id)) ?? dev;
}

/** Whether `adding` more buildings fit this residence's limit right now. */
export async function buildingCapacity(developmentId: Id, adding = 1, now = new Date()): Promise<BuildingCapacity> {
  const dev = await Development.findById(developmentId);
  if (!dev) return { ok: true };
  const current = await DevelopmentBuilding.countDocuments({ developmentId: dev._id, deletedAt: { $exists: false } });
  return canAddBuildings(residenceAccess(billingFacts(dev), now).buildingLimit, current, adding);
}

/**
 * Refuse to go past the residence's building limit. Called by every path that
 * creates buildings, before anything is written.
 */
export async function assertBuildingCapacity(developmentId: Id, adding = 1, now = new Date()): Promise<void> {
  const check = await buildingCapacity(developmentId, adding, now);
  if (check.ok === false) {
    throw new BillingError(
      'BUILDING_LIMIT',
      `This residence can have ${check.limit} buildings. Unlock more to add another.`,
      { limit: check.limit, current: check.current, allowed: check.allowed, adding }
    );
  }
}

export { ownerPlan };
