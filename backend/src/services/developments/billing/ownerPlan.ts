/**
 * The residence owner's premium plan, as the Residence Pass sees it: whether
 * it is active, how many residences it includes and until when. Reads the
 * existing subscription fields; billing never changes them.
 */
import mongoose from 'mongoose';
import User from '../../../models/User';
import Development from '../../../models/Development';
import { includedResidenceIds, includedResidencesFor } from './residencePlan';

export interface OwnerPlan {
  premium: boolean;
  included: number;
  until: Date | null;
}

const NO_PLAN: OwnerPlan = { premium: false, included: 0, until: null };

export async function ownerPlan(ownerId: mongoose.Types.ObjectId | string): Promise<OwnerPlan> {
  const user = await User.findById(ownerId).select('isSubscribed subscriptionExpiresAt subscriptionPlan subscription');
  if (!user || !user.hasActiveSubscription()) return NO_PLAN;
  return {
    premium: true,
    included: includedResidencesFor(user.subscription?.tier, user.subscriptionPlan),
    until: user.subscriptionExpiresAt ?? null,
  };
}

/**
 * Until when the owner's plan covers this residence, if it is (or, with
 * `assumePublished`, would be) among the oldest-published residences the
 * plan includes.
 */
export async function includedUntilFor(
  dev: { _id: unknown; ownerId: unknown; publishedAt?: Date | null },
  now: Date,
  assumePublished = false,
  plan?: OwnerPlan
): Promise<Date | undefined> {
  const p = plan ?? (await ownerPlan(String(dev.ownerId)));
  if (!p.premium || p.included <= 0 || !p.until) return undefined;
  const others = await Development.find({
    ownerId: dev.ownerId,
    status: 'published',
    deletedAt: { $exists: false },
    _id: { $ne: dev._id },
  })
    .select('_id publishedAt')
    .lean();
  const candidates = others.map((o) => ({ id: String(o._id), publishedAt: o.publishedAt }));
  const self = await Development.findById(dev._id).select('status').lean();
  if (assumePublished || self?.status === 'published') {
    candidates.push({ id: String(dev._id), publishedAt: dev.publishedAt ?? now });
  }
  return includedResidenceIds(candidates, p.included).has(String(dev._id)) ? p.until : undefined;
}
