import OpenHouse from '../models/OpenHouse';
import Property from '../models/Property';
import Favorite from '../models/Favorite';
import User from '../models/User';
import { createNotificationWithPush } from '../services/engagementService';
import { formatInListingZone, formatOpenHouseWindow } from '../services/openHouse/openHouseTime';
import { sendAuctionReminderEmail, sendSavedHomeEventEmail } from '../services/listingEvents/listingEventEmails';
import { cronLogger } from '../utils/logger';

const DAY_MS = 24 * 60 * 60 * 1000;

/** People who saved this home with its alerts on, the owner left out. */
async function saversOf(propertyId: unknown, sellerId: unknown) {
  const favs = await Favorite.find({ propertyId, priceAlertEnabled: { $ne: false } }).select('userId').lean();
  const ids = [...new Set(favs.map((f) => String(f.userId)))].filter((id) => id !== String(sellerId));
  return ids.length ? User.find({ _id: { $in: ids } }).select('email name').lean() : [];
}

/**
 * The day before: remind people who saved a home about its auction or open
 * house. A flag on the auction / open house makes each reminder go out once.
 */
export async function processListingEventReminders(now: Date = new Date()): Promise<number> {
  const until = new Date(now.getTime() + DAY_MS);
  let sent = 0;

  // Claim before sending, so two runs never send the same reminder.
  const auctions = await Property.find({
    status: 'active',
    'auction.startsAt': { $gt: now, $lte: until },
    'auction.reminderSentAt': { $exists: false },
  }).select('title city country address propertyType sellerId auction');
  for (const p of auctions) {
    const claimed = await Property.updateOne({ _id: p._id, 'auction.reminderSentAt': { $exists: false } }, { $set: { 'auction.reminderSentAt': now } });
    if (claimed.modifiedCount === 0 || !p.auction) continue;
    const title = p.title || `${p.propertyType} in ${p.city}`;
    const when = formatInListingZone(p.auction.startsAt, p.country);
    const address = [p.address, p.city, p.country].filter(Boolean).join(', ');
    for (const u of await saversOf(p._id, p.sellerId)) {
      sent += 1;
      createNotificationWithPush({
        userId: u._id, type: 'auction_reminder', title: 'Auction tomorrow', message: `${title} — ${when}`, icon: 'gavel',
        data: { propertyId: String(p._id), actionUrl: `/property/${String(p._id)}` },
      }).catch((err) => cronLogger.error('Auction reminder notification failed:', err));
      if (u.email) {
        sendAuctionReminderEmail({ to: u.email, name: u.name, propertyTitle: title, propertyAddress: address, propertyId: String(p._id), when })
          .catch((err) => cronLogger.error('Auction reminder email failed:', err));
      }
    }
  }

  const openHouses = await OpenHouse.find({ status: 'scheduled', startsAt: { $gt: now, $lte: until }, favoritesRemindedAt: { $exists: false } });
  for (const oh of openHouses) {
    const claimed = await OpenHouse.updateOne({ _id: oh._id, favoritesRemindedAt: { $exists: false } }, { $set: { favoritesRemindedAt: now } });
    if (claimed.modifiedCount === 0) continue;
    const p = await Property.findById(oh.propertyId).select('title city country address propertyType sellerId status').lean();
    if (!p || p.status !== 'active') continue;
    // Anyone already signed up gets the RSVP reminder instead.
    const going = new Set(oh.rsvps.map((r) => r.email));
    const title = p.title || `${p.propertyType} in ${p.city}`;
    const when = formatOpenHouseWindow(oh.startsAt, oh.endsAt, p.country);
    const address = [p.address, p.city, p.country].filter(Boolean).join(', ');
    for (const u of await saversOf(p._id, p.sellerId)) {
      if (u.email && going.has(u.email.toLowerCase())) continue;
      sent += 1;
      createNotificationWithPush({
        userId: u._id, type: 'open_house_reminder', title: 'Open house tomorrow', message: `${title} — ${when}`, icon: 'calendar',
        data: { propertyId: String(p._id), actionUrl: `/property/${String(p._id)}` },
      }).catch((err) => cronLogger.error('Open house saver reminder failed:', err));
      if (u.email) {
        sendSavedHomeEventEmail({ to: u.email, name: u.name, kind: 'openHouse', propertyTitle: title, propertyAddress: address, propertyId: String(p._id), when })
          .catch((err) => cronLogger.error('Open house saver email failed:', err));
      }
    }
  }
  return sent;
}
