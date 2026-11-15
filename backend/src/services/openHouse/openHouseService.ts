import mongoose from 'mongoose';
import OpenHouse, { IOpenHouse } from '../../models/OpenHouse';
import Property from '../../models/Property';
import User from '../../models/User';
import { createNotificationWithPush } from '../engagementService';
import { apiLogger } from '../../utils/logger';
import {
  checkAgainstSchedule,
  OpenHouseDraft,
  parseOpenHouseDraft,
  rsvpBlock,
} from './openHouseRules';
import { formatOpenHouseWindow } from './openHouseTime';
import {
  sendOpenHouseCancelled,
  sendOpenHouseHostNotice,
  sendOpenHouseRsvpConfirmation,
} from './openHouseEmails';

/** Service outcome: a value, or an HTTP status with a message the user can act on. */
export type ServiceResult<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const fail = (status: number, error: string): { ok: false; status: number; error: string } => ({ ok: false, status, error });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What a visitor sees: no names or emails of other visitors. */
export interface PublicOpenHouse {
  id: string;
  propertyId: string;
  startsAt: string;
  endsAt: string;
  note?: string;
  capacity?: number;
  spotsLeft: number | null;
  rsvpCount: number;
  isFull: boolean;
  /** True when the asking user already signed up. */
  isGoing: boolean;
  /** Their own sign-up's id, so a guest can cancel it later. */
  myRsvpId?: string;
}

/**
 * `viewer.email` is only passed right after that person signed up (they just
 * typed it), never from a query, so nobody can probe who else is coming.
 */
export function toPublic(oh: IOpenHouse, viewer?: { userId?: string; email?: string }): PublicOpenHouse {
  const rsvpCount = oh.rsvps.length;
  const spotsLeft = oh.capacity != null ? Math.max(0, oh.capacity - rsvpCount) : null;
  const mine = viewer ? oh.rsvps.find((r) =>
    (viewer.userId && r.userId && String(r.userId) === viewer.userId) ||
    (viewer.email && r.email === viewer.email.toLowerCase())) : undefined;
  return {
    id: String(oh._id),
    propertyId: String(oh.propertyId),
    startsAt: oh.startsAt.toISOString(),
    endsAt: oh.endsAt.toISOString(),
    note: oh.note,
    capacity: oh.capacity,
    spotsLeft,
    rsvpCount,
    isFull: spotsLeft === 0,
    isGoing: !!mine,
    myRsvpId: mine ? String(mine._id) : undefined,
  };
}

const upcomingFilter = (now: Date) => ({ status: 'scheduled' as const, endsAt: { $gt: now } });

/**
 * Validate a batch of raw open houses for a listing — used both by the
 * create-listing request (before the listing exists, so `propertyId` is null)
 * and by the add-open-house endpoint.
 */
export async function validateDrafts(
  rawList: unknown,
  propertyId: string | null,
  now: Date = new Date(),
): Promise<ServiceResult<OpenHouseDraft[]>> {
  if (rawList == null) return { ok: true, value: [] };
  if (!Array.isArray(rawList)) return fail(400, 'Open houses must be a list');
  const drafts: OpenHouseDraft[] = [];
  for (const raw of rawList) {
    const parsed = parseOpenHouseDraft(raw, now);
    if (parsed.ok === false) return fail(400, parsed.error);
    drafts.push(parsed.value);
  }
  const upcoming = propertyId
    ? await OpenHouse.find({ propertyId, ...upcomingFilter(now) }).select('startsAt endsAt').lean()
    : [];
  const schedule = checkAgainstSchedule(drafts, upcoming);
  if (schedule.ok === false) return fail(400, schedule.error);
  return { ok: true, value: drafts };
}

/** Save already-validated drafts for a listing. */
export async function insertDrafts(
  propertyId: string,
  hostId: string,
  drafts: OpenHouseDraft[],
): Promise<IOpenHouse[]> {
  if (drafts.length === 0) return [];
  return OpenHouse.insertMany(drafts.map((d) => ({ ...d, propertyId, hostId }))) as unknown as Promise<IOpenHouse[]>;
}

async function ownedProperty(propertyId: string, userId: string) {
  if (!mongoose.isValidObjectId(propertyId)) return fail(400, 'Invalid property ID');
  const property = await Property.findById(propertyId).select('sellerId status title city country address propertyType');
  if (!property) return fail(404, 'Property not found');
  if (String(property.sellerId) !== userId) return fail(403, 'Only the owner of this listing can manage its open houses');
  return { ok: true as const, value: property };
}

export async function createOpenHouse(
  propertyId: string,
  userId: string,
  raw: unknown,
): Promise<ServiceResult<PublicOpenHouse>> {
  const owned = await ownedProperty(propertyId, userId);
  if (owned.ok === false) return owned;
  if (owned.value.status === 'sold' || owned.value.status === 'rented') {
    return fail(400, 'This listing is no longer available, so it cannot have an open house');
  }
  const drafts = await validateDrafts([raw], propertyId);
  if (drafts.ok === false) return drafts;
  const [created] = await insertDrafts(propertyId, userId, drafts.value);
  return { ok: true, value: toPublic(created) };
}

export async function listUpcomingForProperty(
  propertyId: string,
  viewer?: { userId?: string },
  now: Date = new Date(),
): Promise<ServiceResult<PublicOpenHouse[]>> {
  if (!mongoose.isValidObjectId(propertyId)) return fail(400, 'Invalid property ID');
  const list = await OpenHouse.find({ propertyId, ...upcomingFilter(now) }).sort({ startsAt: 1 });
  return { ok: true, value: list.map((oh) => toPublic(oh, viewer)) };
}

function mailContext(property: { title?: string; city?: string; country?: string; address?: string; propertyType?: string; _id: unknown }, oh: IOpenHouse) {
  return {
    propertyTitle: property.title || `${property.propertyType ?? 'Home'} in ${property.city ?? ''}`.trim(),
    propertyAddress: [property.address, property.city, property.country].filter(Boolean).join(', '),
    propertyId: String(property._id),
    when: formatOpenHouseWindow(oh.startsAt, oh.endsAt, property.country),
  };
}

export async function cancelOpenHouse(openHouseId: string, userId: string): Promise<ServiceResult<true>> {
  if (!mongoose.isValidObjectId(openHouseId)) return fail(400, 'Invalid open house ID');
  const oh = await OpenHouse.findById(openHouseId);
  if (!oh) return fail(404, 'Open house not found');
  const owned = await ownedProperty(String(oh.propertyId), userId);
  if (owned.ok === false) return owned;
  if (oh.status === 'cancelled') return { ok: true, value: true };

  oh.status = 'cancelled';
  await oh.save();

  const ctx = mailContext(owned.value, oh);
  for (const r of oh.rsvps) {
    sendOpenHouseCancelled({ ...ctx, to: r.email, name: r.name })
      .catch((err) => apiLogger.error('Open house cancel email failed:', err));
    if (r.userId) {
      createNotificationWithPush({
        userId: r.userId,
        type: 'open_house_cancelled',
        title: 'Open house cancelled',
        message: `The open house at ${ctx.propertyTitle} (${ctx.when}) was cancelled.`,
        icon: 'calendar',
        data: { propertyId: ctx.propertyId, openHouseId, actionUrl: `/property/${ctx.propertyId}` },
      }).catch((err) => apiLogger.error('Open house cancel notification failed:', err));
    }
  }
  return { ok: true, value: true };
}

export interface RsvpInput {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
}

function parseRsvp(input: RsvpInput): ServiceResult<{ name: string; email: string; phone?: string }> {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = typeof input.phone === 'string' && input.phone.trim() ? input.phone.trim() : undefined;
  if (!name || name.length > 200) return fail(400, 'Please enter your name');
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return fail(400, 'Please enter a valid email address');
  if (phone && phone.length > 30) return fail(400, 'The phone number is too long');
  return { ok: true, value: { name, email, phone } };
}

export async function rsvp(
  openHouseId: string,
  input: RsvpInput,
  userId: string | undefined,
  now: Date = new Date(),
): Promise<ServiceResult<PublicOpenHouse>> {
  if (!mongoose.isValidObjectId(openHouseId)) return fail(400, 'Invalid open house ID');
  const person = parseRsvp(input);
  if (person.ok === false) return person;

  const oh = await OpenHouse.findById(openHouseId);
  if (!oh) return fail(404, 'Open house not found');

  const viewer = { userId, email: person.value.email };
  const already = toPublic(oh, viewer);
  if (already.isGoing) return { ok: true, value: already };

  const block = rsvpBlock({ status: oh.status, endsAt: oh.endsAt, capacity: oh.capacity, rsvpCount: oh.rsvps.length }, now);
  if (block === 'cancelled') return fail(409, 'This open house was cancelled');
  if (block === 'over') return fail(409, 'This open house is already over');
  if (block === 'full') return fail(409, 'This open house is full');

  // Checked again inside the write so two people can't take the last spot,
  // or one person sign up twice, at the same moment.
  const entry = { ...person.value, userId: userId ? new mongoose.Types.ObjectId(userId) : undefined, createdAt: now };
  const updated = await OpenHouse.findOneAndUpdate(
    {
      _id: oh._id,
      status: 'scheduled',
      'rsvps.email': { $ne: person.value.email },
      ...(oh.capacity != null ? { $expr: { $lt: [{ $size: '$rsvps' }, oh.capacity] } } : {}),
    },
    { $push: { rsvps: entry } },
    { new: true },
  );
  if (!updated) return fail(409, 'This open house just filled up — please try another time');

  const property = await Property.findById(oh.propertyId).select('sellerId title city country address propertyType');
  if (property) {
    const ctx = mailContext(property, updated);
    sendOpenHouseRsvpConfirmation({ ...ctx, to: person.value.email, name: person.value.name })
      .catch((err) => apiLogger.error('Open house RSVP email failed:', err));
    createNotificationWithPush({
      userId: updated.hostId,
      type: 'open_house_rsvp',
      title: 'New open house sign-up',
      message: `${person.value.name} is coming to your open house at ${ctx.propertyTitle} (${ctx.when}).`,
      icon: 'calendar',
      priority: 'high',
      data: { propertyId: ctx.propertyId, openHouseId, actionUrl: '/account/listings' },
    }).catch((err) => apiLogger.error('Open house RSVP notification failed:', err));
    User.findById(updated.hostId).select('email name')
      .then((host) => host && sendOpenHouseHostNotice({
        ...ctx,
        to: host.email,
        name: host.name,
        visitorName: person.value.name,
        visitorEmail: person.value.email,
        visitorPhone: person.value.phone,
      }))
      .catch((err) => apiLogger.error('Open house host email failed:', err));
  }

  return { ok: true, value: toPublic(updated, viewer) };
}

/**
 * A signed-in visitor cancels by their account; a guest needs the sign-up id
 * they got back when signing up, so nobody can cancel someone else's place.
 */
export async function cancelRsvp(
  openHouseId: string,
  viewer: { userId?: string; rsvpId?: string },
): Promise<ServiceResult<PublicOpenHouse>> {
  if (!mongoose.isValidObjectId(openHouseId)) return fail(400, 'Invalid open house ID');
  let match: Record<string, unknown>;
  if (viewer.userId) match = { userId: new mongoose.Types.ObjectId(viewer.userId) };
  else if (viewer.rsvpId && mongoose.isValidObjectId(viewer.rsvpId)) match = { _id: new mongoose.Types.ObjectId(viewer.rsvpId) };
  else return fail(400, 'We could not find your sign-up');
  const updated = await OpenHouse.findByIdAndUpdate(openHouseId, { $pull: { rsvps: match } }, { new: true });
  if (!updated) return fail(404, 'Open house not found');
  return { ok: true, value: toPublic(updated, { userId: viewer.userId }) };
}

/** The host's view: every upcoming open house on their listings, with who's coming. */
export interface HostOpenHouse extends PublicOpenHouse {
  rsvps: { name: string; email: string; phone?: string; createdAt: string }[];
}

export async function listForHost(hostId: string, propertyId?: string, now: Date = new Date()): Promise<HostOpenHouse[]> {
  const filter: Record<string, unknown> = { hostId, ...upcomingFilter(now) };
  if (propertyId && mongoose.isValidObjectId(propertyId)) filter.propertyId = propertyId;
  const list = await OpenHouse.find(filter).sort({ startsAt: 1 });
  return list.map((oh) => ({
    ...toPublic(oh),
    rsvps: oh.rsvps.map((r) => ({ name: r.name, email: r.email, phone: r.phone, createdAt: r.createdAt.toISOString() })),
  }));
}

/** Property ids with an upcoming open house — for the optional search filter. */
export async function propertyIdsWithUpcomingOpenHouse(now: Date = new Date()): Promise<mongoose.Types.ObjectId[]> {
  return OpenHouse.distinct('propertyId', upcomingFilter(now));
}

/** Next upcoming open house per property, for badges on result cards. */
export async function nextOpenHouseByProperty(
  propertyIds: string[],
  now: Date = new Date(),
): Promise<Map<string, { startsAt: string; endsAt: string }>> {
  const map = new Map<string, { startsAt: string; endsAt: string }>();
  if (propertyIds.length === 0) return map;
  const list = await OpenHouse.find({ propertyId: { $in: propertyIds }, ...upcomingFilter(now) })
    .select('propertyId startsAt endsAt').sort({ startsAt: 1 }).lean();
  for (const oh of list) {
    const key = String(oh.propertyId);
    if (!map.has(key)) map.set(key, { startsAt: oh.startsAt.toISOString(), endsAt: oh.endsAt.toISOString() });
  }
  return map;
}
