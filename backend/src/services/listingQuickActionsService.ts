/**
 * Quick actions a seller runs from "My listings": renew, and move a listing
 * between their private profile and their agency.
 *
 * Each one changes a field or two, so it writes exactly those fields with an
 * atomic update instead of loading and re-saving the whole document. A full
 * `save()` re-validates every field, which made these actions fail with a
 * server error on older listings that predate today's required fields - and
 * two quick presses could both pass a check made on a stale copy.
 */

import mongoose from 'mongoose';
import Property from '../models/Property';
import User from '../models/User';
import SalesHistory from '../models/SalesHistory';
import ArchivedListing from '../models/ArchivedListing';
import { propertyLogger } from '../utils/logger';

export const RENEW_COOLDOWN_HOURS = 24;
export const RENEW_COOLDOWN_MS = RENEW_COOLDOWN_HOURS * 60 * 60 * 1000;

export interface RenewCooldown {
  canRenewAt: Date;
  hoursRemaining: number;
  minutesRemaining: number;
}

/** Time left before a listing renewed at `lastRenewed` can be renewed again; null when it can. */
export const renewCooldown = (lastRenewed: Date | undefined | null, now: Date): RenewCooldown | null => {
  if (!lastRenewed) return null;
  const last = new Date(lastRenewed).getTime();
  if (!Number.isFinite(last)) return null;
  const remaining = last + RENEW_COOLDOWN_MS - now.getTime();
  if (remaining <= 0) return null;
  const totalMinutes = Math.ceil(remaining / 60_000);
  return {
    canRenewAt: new Date(last + RENEW_COOLDOWN_MS),
    hoursRemaining: Math.floor(totalMinutes / 60),
    minutesRemaining: totalMinutes % 60,
  };
};

export type RenewResult =
  | { ok: true; lastRenewed: Date; canRenewAt: Date }
  | { ok: false; reason: 'not_found' | 'forbidden' }
  | { ok: false; reason: 'cooldown'; lastRenewed: Date; cooldown: RenewCooldown };

/** Put the listing back on top of the results, at most once per cooldown. */
export const renewListing = async (
  propertyId: string,
  userId: string,
  now = new Date(),
  isRetry = false
): Promise<RenewResult> => {
  const _id = new mongoose.Types.ObjectId(propertyId);
  const sellerId = new mongoose.Types.ObjectId(userId);
  const renewableBefore = new Date(now.getTime() - RENEW_COOLDOWN_MS);

  // The cooldown is part of the filter, so of two simultaneous requests only
  // one can match and write.
  const updated = await Property.updateOne(
    { _id, sellerId, $or: [{ lastRenewed: { $exists: false } }, { lastRenewed: null }, { lastRenewed: { $lte: renewableBefore } }] },
    { $set: { lastRenewed: now } }
  );
  if (updated.modifiedCount === 1) {
    return { ok: true, lastRenewed: now, canRenewAt: new Date(now.getTime() + RENEW_COOLDOWN_MS) };
  }

  // Nothing written: say why. `lean()` so a never-renewed listing isn't given
  // the schema default (now) and mistaken for one on cooldown.
  const existing = await Property.findById(_id).select('sellerId lastRenewed').lean();
  if (!existing) return { ok: false, reason: 'not_found' };
  if (String(existing.sellerId) !== String(sellerId)) return { ok: false, reason: 'forbidden' };
  const cooldown = renewCooldown(existing.lastRenewed, now);
  if (!cooldown) {
    // The listing became renewable between the two queries: one retry settles
    // it. A second miss means the write itself is not landing - say so rather
    // than loop.
    if (isRetry) throw new Error(`Renew did not apply to listing ${propertyId}`);
    return renewListing(propertyId, userId, new Date(), true);
  }
  return { ok: false, reason: 'cooldown', lastRenewed: existing.lastRenewed, cooldown };
};

export type ListingRole = 'private_seller' | 'agent';
export const LISTING_ROLES: readonly ListingRole[] = ['private_seller', 'agent'];
export const isListingRole = (value: unknown): value is ListingRole =>
  typeof value === 'string' && (LISTING_ROLES as readonly string[]).includes(value);

export interface SubscriptionCounters {
  activeListingsCount?: number;
  privateSellerCount?: number;
  agentCount?: number;
  listingsLimit?: number;
  tier?: string;
}

export type ReassignResult =
  | { ok: true; changed: boolean; previousRole: string | undefined; subscription: SubscriptionCounters | null }
  | { ok: false; reason: 'not_found' | 'forbidden' | 'external' | 'user_not_found' | 'agent_required' };

/** Copy the new role onto the sale records and archive snapshots of this listing. */
const propagateRole = async (
  propertyId: mongoose.Types.ObjectId,
  targetRole: ListingRole,
  agency: { name?: string; id?: unknown }
): Promise<void> => {
  await SalesHistory.updateMany({ propertyId }, { $set: { sellerRole: targetRole } });

  const set: Record<string, unknown> = { createdAsRole: targetRole };
  const unset: Record<string, 1> = {};
  if (targetRole === 'agent' && agency.name) set.createdByAgencyName = agency.name; else unset.createdByAgencyName = 1;
  if (targetRole === 'agent' && agency.id) set.createdByAgencyId = agency.id; else unset.createdByAgencyId = 1;
  const update: Record<string, unknown> = { $set: set };
  if (Object.keys(unset).length > 0) update.$unset = unset;
  await ArchivedListing.updateMany({ originalPropertyId: propertyId }, update);
};

const counterField = (role: string | undefined): string | null => {
  if (role === 'agent') return 'subscription.agentCount';
  if (role === 'private_seller') return 'subscription.privateSellerCount';
  return null;
};

/** Move one listing from the old role's counter to the new one, never below zero. */
const shiftRoleCounters = async (
  userId: mongoose.Types.ObjectId,
  previousRole: string | undefined,
  targetRole: ListingRole
): Promise<SubscriptionCounters | null> => {
  const from = counterField(previousRole);
  const to = counterField(targetRole) as string;
  const stage: Record<string, unknown> = {
    [to]: { $add: [{ $ifNull: [`$${to}`, 0] }, 1] },
  };
  if (from) stage[from] = { $max: [0, { $subtract: [{ $ifNull: [`$${from}`, 0] }, 1] }] };

  await User.updateOne({ _id: userId, subscription: { $type: 'object' } }, [{ $set: stage }]);
  const fresh = await User.findById(userId).select('subscription').lean();
  const s = fresh?.subscription;
  if (!s) return null;
  return {
    activeListingsCount: s.activeListingsCount,
    privateSellerCount: s.privateSellerCount,
    agentCount: s.agentCount,
    listingsLimit: s.listingsLimit,
    tier: s.tier,
  };
};

/**
 * Move a listing between the seller's private profile and their agency.
 * Asking for the role the listing already has succeeds with `changed: false`:
 * the seller got what they wanted, and a second press (or a screen that was a
 * step behind) must not be answered with an error.
 */
export const reassignListingRole = async (
  propertyId: string,
  userId: string,
  targetRole: ListingRole
): Promise<ReassignResult> => {
  const _id = new mongoose.Types.ObjectId(propertyId);
  const sellerId = new mongoose.Types.ObjectId(userId);

  const property = await Property.findById(_id).select('sellerId createdAsRole').lean();
  if (!property) return { ok: false, reason: 'not_found' };
  if (String(property.sellerId) !== String(sellerId)) return { ok: false, reason: 'forbidden' };
  if (property.createdAsRole === 'external') return { ok: false, reason: 'external' };
  const previousRole = property.createdAsRole as string | undefined;
  if (previousRole === targetRole) {
    return { ok: true, changed: false, previousRole, subscription: null };
  }

  const user = await User.findById(sellerId)
    .select('role availableRoles agentId licenseNumber agencyId agencyName agency')
    .lean();
  if (!user) return { ok: false, reason: 'user_not_found' };

  if (targetRole === 'agent') {
    const canActAsAgent =
      user.role === 'agent' ||
      (Array.isArray(user.availableRoles) && user.availableRoles.includes('agent')) ||
      !!user.agentId || !!user.licenseNumber || !!user.agencyId ||
      user.agency?.role === 'agent' || user.agency?.role === 'owner';
    if (!canActAsAgent) return { ok: false, reason: 'agent_required' };
  }

  // Snapshot the agency credentials at the time of the move, as creation does.
  const agency = { name: user.agencyName || undefined, id: user.agencyId || user.agency?.agencyId || undefined };
  const set: Record<string, unknown> = { createdAsRole: targetRole };
  const unset: Record<string, 1> = {};
  const credentials: Array<[string, unknown]> = [
    ['createdByAgencyName', agency.name],
    ['createdByAgencyId', agency.id],
    ['createdByLicenseNumber', user.licenseNumber || undefined],
  ];
  for (const [field, value] of credentials) {
    if (targetRole === 'agent' && value) set[field] = value; else unset[field] = 1;
  }
  const update: Record<string, unknown> = { $set: set };
  if (Object.keys(unset).length > 0) update.$unset = unset;

  // Only the request that actually flips the role moves the counters.
  const written = await Property.updateOne({ _id, sellerId, createdAsRole: { $nin: [targetRole, 'external'] } }, update);
  if (written.modifiedCount !== 1) {
    // Nothing written. That is fine only if another request got there first
    // and the listing now has the role asked for; anything else is a failure
    // and must not be reported as "moved".
    const current = await Property.findById(_id).select('createdAsRole').lean();
    if (current?.createdAsRole !== targetRole) {
      throw new Error(`Role change did not apply to listing ${propertyId}`);
    }
    return { ok: true, changed: false, previousRole, subscription: null };
  }

  try {
    await propagateRole(_id, targetRole, agency);
  } catch (error) {
    // The listing itself is moved; its historical snapshots are best effort.
    propertyLogger.error('Failed to copy the new role to sale/archive records (non-fatal):', error);
  }

  let subscription: SubscriptionCounters | null = null;
  try {
    subscription = await shiftRoleCounters(sellerId, previousRole, targetRole);
  } catch (error) {
    propertyLogger.error('Failed to shift per-role listing counters (non-fatal):', error);
  }

  return { ok: true, changed: true, previousRole, subscription };
};
