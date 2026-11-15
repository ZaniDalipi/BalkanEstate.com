import mongoose from 'mongoose';
import OpenHouse from '../../models/OpenHouse';
import Property from '../../models/Property';
import { pickNextEvent } from './pickNextEvent';

/**
 * Keep the listing's denormalized `nextOpenHouseAt` / `nextEventAt` in step
 * with its open houses and auction, so search can filter and sort on plain
 * indexed fields.
 */
export async function refreshEventDates(propertyId: string | mongoose.Types.ObjectId, now: Date = new Date()): Promise<void> {
  const property = await Property.findById(propertyId).select('auction').lean();
  if (!property) return;
  const openHouses = await OpenHouse.find({ propertyId, status: 'scheduled', endsAt: { $gt: now } })
    .select('startsAt endsAt').lean();
  const { nextOpenHouseAt, nextEventAt } = pickNextEvent(openHouses, property.auction ?? undefined, now);
  const $set: Record<string, Date> = {};
  const $unset: Record<string, ''> = {};
  if (nextOpenHouseAt) $set.nextOpenHouseAt = nextOpenHouseAt; else $unset.nextOpenHouseAt = '';
  if (nextEventAt) $set.nextEventAt = nextEventAt; else $unset.nextEventAt = '';
  await Property.updateOne({ _id: propertyId }, { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) });
}

/**
 * Hourly: listings whose next open house or auction has passed get their
 * dates recomputed (moved on to the next one, or cleared).
 */
export async function refreshPassedEventDates(now: Date = new Date()): Promise<number> {
  const stale = await Property.find({
    $or: [{ nextOpenHouseAt: { $lte: now } }, { nextEventAt: { $lte: now } }],
  }).select('_id').limit(2000).lean();
  for (const p of stale) await refreshEventDates(p._id, now);
  return stale.length;
}
