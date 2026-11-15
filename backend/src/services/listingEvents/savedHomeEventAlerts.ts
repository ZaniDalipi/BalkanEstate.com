import mongoose from 'mongoose';
import Favorite from '../../models/Favorite';
import Property from '../../models/Property';
import User from '../../models/User';
import { createNotificationWithPush } from '../engagementService';
import { apiLogger } from '../../utils/logger';
import { formatOpenHouseWindow, formatInListingZone } from '../openHouse/openHouseTime';
import { sendSavedHomeEventEmail } from './listingEventEmails';

export type SavedHomeEvent =
  | { kind: 'openHouse'; startsAt: Date; endsAt: Date }
  | { kind: 'auction'; startsAt: Date; startingPrice?: number };

/**
 * Tell everyone who saved this home (and kept its alerts on) that it now has
 * an open house or an auction. The owner is never told about their own home.
 * One notification + one email per person.
 */
export async function alertSavers(
  propertyId: string | mongoose.Types.ObjectId,
  event: SavedHomeEvent,
): Promise<number> {
  const property = await Property.findById(propertyId).select('sellerId title city country address propertyType status').lean();
  if (!property || property.status !== 'active') return 0;

  const favorites = await Favorite.find({ propertyId, priceAlertEnabled: { $ne: false } }).select('userId').lean();
  const userIds = [...new Set(favorites.map((f) => String(f.userId)))].filter((id) => id !== String(property.sellerId));
  if (userIds.length === 0) return 0;

  const users = await User.find({ _id: { $in: userIds } }).select('email name').lean();
  const title = property.title || `${property.propertyType} in ${property.city}`;
  const address = [property.address, property.city, property.country].filter(Boolean).join(', ');
  const when = event.kind === 'openHouse'
    ? formatOpenHouseWindow(event.startsAt, event.endsAt, property.country)
    : formatInListingZone(event.startsAt, property.country);
  const id = String(property._id);

  for (const user of users) {
    createNotificationWithPush({
      userId: user._id,
      type: event.kind === 'openHouse' ? 'saved_home_open_house' : 'saved_home_auction',
      title: event.kind === 'openHouse' ? 'Open house at a home you saved' : 'A home you saved goes to auction',
      message: `${title} — ${when}`,
      icon: event.kind === 'openHouse' ? 'calendar' : 'gavel',
      data: { propertyId: id, actionUrl: `/property/${id}` },
    }).catch((err) => apiLogger.error('Saved-home event notification failed:', err));
    if (user.email) {
      sendSavedHomeEventEmail({ to: user.email, name: user.name, kind: event.kind, propertyTitle: title, propertyAddress: address, propertyId: id, when })
        .catch((err) => apiLogger.error('Saved-home event email failed:', err));
    }
  }
  return users.length;
}
