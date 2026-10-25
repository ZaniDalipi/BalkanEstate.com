/**
 * Residence Pass state: recompute a residence's billing from its purchases,
 * its owner's plan and its agency, gate publishing (claim the agency's free
 * residence, start the free trial, or require a pass), and enforce the
 * building limit wherever buildings are created.
 */
import mongoose from 'mongoose';
import Development, { type IDevelopment } from '../../../models/Development';
import DevelopmentBuilding from '../../../models/DevelopmentBuilding';
import ResidencePurchase from '../../../models/ResidencePurchase';
import { setDevelopmentStatus } from '../developmentService';
import { agencyCoverage, claimAgencySlot } from './agencyResidences';
import { BillingError } from './billingErrors';
import { includedUntilFor, ownerPlan } from './ownerPlan';
import { residenceTerms } from './residenceTerms';
import {
  canAddBuildings,
  publishDecision,
  residenceAccess,
  trialWindow,
  type BillingFacts,
  type BuildingCapacity,
} from './residencePlan';

type Id = mongoose.Types.ObjectId | string;

interface FactOptions {
  /** Plan coverage to use instead of the stored one (e.g. "as if published"). */
  includedUntil?: Date | null;
  agencyUntil?: Date | null;
  /** Buildings a residence includes (from the pass product). */
  includedBuildings?: number;
}

export const billingFacts = (dev: IDevelopment, opts: FactOptions = {}): BillingFacts => ({
  status: dev.status,
  trialStartedAt: dev.billing?.trialStartedAt,
  trialEndsAt: dev.billing?.trialEndsAt,
  paidUntil: dev.billing?.paidUntil,
  includedUntil: opts.includedUntil === undefined ? dev.billing?.includedUntil : opts.includedUntil,
  agencyUntil: opts.agencyUntil === undefined ? dev.billing?.agencyUntil : opts.agencyUntil,
  extraBuildings: dev.billing?.extraBuildings ?? 0,
  includedBuildings: opts.includedBuildings,
  buildingLimitOverride: dev.billing?.buildingLimit ?? null,
});

/** The residence's access right now, with the admin-editable terms applied. */
export async function accessFor(dev: IDevelopment, now = new Date()) {
  const terms = await residenceTerms();
  return residenceAccess(billingFacts(dev, { includedBuildings: terms.includedBuildings }), now);
}

/** Rebuild `billing` and `visibleUntil` from the purchases, the owner's plan and the agency. */
export async function recomputeBilling(developmentId: Id, now = new Date()): Promise<IDevelopment | null> {
  const dev = await Development.findById(developmentId);
  if (!dev) return null;
  const purchases = await ResidencePurchase.find({ developmentId: dev._id, status: 'completed' }).lean();
  const passEnds = purchases.filter((p) => p.kind === 'pass').map((p) => p.periodEnd.getTime());
  const extras = purchases
    .filter((p) => p.kind === 'extra_building' && p.periodEnd > now)
    .reduce((n, p) => n + p.quantity, 0);
  const [includedUntil, agencyUntil] = await Promise.all([
    includedUntilFor(dev, now),
    dev.agencyId && dev.billing.agencyYearStart ? agencyCoverage(dev.agencyId, now) : Promise.resolve(null),
  ]);

  dev.billing.paidUntil = passEnds.length ? new Date(Math.max(...passEnds)) : undefined;
  dev.billing.extraBuildings = extras;
  dev.billing.includedUntil = includedUntil;
  dev.billing.agencyUntil = agencyUntil ?? undefined;
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

/** After an agency's subscription changes: its free residences follow (renewal, lapse, grace). */
export async function recomputeAgencyResidences(agencyId: Id, now = new Date()): Promise<number> {
  const devs = await Development.find({ agencyId, deletedAt: { $exists: false }, 'billing.agencyYearStart': { $exists: true } })
    .select('_id')
    .lean();
  if (!devs.length) return 0;
  await agencyCoverage(agencyId, now); // records or clears the end date once, before the loop
  for (const d of devs) {
    // eslint-disable-next-line no-await-in-loop
    await recomputeBilling(d._id, now);
  }
  return devs.length;
}

/**
 * Trials used (deleted residences count) and running now: per agency for an
 * agency's residences, per owner otherwise.
 */
export async function ownerTrialCounts(scope: { ownerId: Id; agencyId?: Id | null }, excludeId: Id, now = new Date()) {
  const who = scope.agencyId ? { agencyId: scope.agencyId } : { ownerId: scope.ownerId, agencyId: { $exists: false } };
  const base = { ...who, _id: { $ne: excludeId }, 'billing.trialStartedAt': { $exists: true } };
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
 * An agency residence's first publish takes one of the agency's free
 * residences for this subscription year, when one is left.
 */
async function claimForAgency(dev: IDevelopment, now: Date): Promise<Date | null> {
  if (!dev.agencyId || dev.billing.agencyYearStart) return null;
  const { residencesPerYear } = await residenceTerms();
  const yearStart = await claimAgencySlot(dev.agencyId, residencesPerYear, now);
  if (!yearStart) return null;
  dev.billing.agencyYearStart = yearStart;
  return agencyCoverage(dev.agencyId, now);
}

/**
 * Publish or unpublish through the Residence Pass rules. An agency residence
 * first tries the agency's free residence; otherwise the first publish starts
 * the free trial, and after it publishing needs a pass or plan. Unpublishing
 * is always allowed.
 */
export async function setResidenceStatus(
  dev: IDevelopment,
  status: 'draft' | 'published',
  now = new Date()
): Promise<IDevelopment> {
  if (status === 'published' && dev.status !== 'published') {
    const [included, claimedUntil, terms] = await Promise.all([includedUntilFor(dev, now, true), claimForAgency(dev, now), residenceTerms()]);
    const agencyUntil = claimedUntil ?? dev.billing.agencyUntil ?? null;
    const access = residenceAccess(
      billingFacts(dev, { includedUntil: included ?? null, agencyUntil, includedBuildings: terms.includedBuildings }),
      now
    );
    const decision = publishDecision(access, await ownerTrialCounts({ ownerId: dev.ownerId, agencyId: dev.agencyId }, dev._id as Id, now));
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
  return canAddBuildings((await accessFor(dev, now)).buildingLimit, current, adding);
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
