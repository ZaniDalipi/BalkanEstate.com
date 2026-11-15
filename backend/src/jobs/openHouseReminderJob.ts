import OpenHouse from '../models/OpenHouse';
import Property from '../models/Property';
import { createNotificationWithPush } from '../services/engagementService';
import { dueReminder } from '../services/openHouse/openHouseRules';
import { formatOpenHouseWindow } from '../services/openHouse/openHouseTime';
import { sendOpenHouseReminder } from '../services/openHouse/openHouseEmails';
import { cronLogger } from '../utils/logger';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Remind everyone who signed up for an open house the day before and about
 * two hours before. Each RSVP carries flags so a reminder is sent only once.
 * Returns how many reminders went out.
 */
export async function processOpenHouseReminders(now: Date = new Date()): Promise<number> {
  const soon = await OpenHouse.find({
    status: 'scheduled',
    startsAt: { $gt: now, $lte: new Date(now.getTime() + DAY_MS) },
    'rsvps.0': { $exists: true },
  });

  let sent = 0;
  for (const oh of soon) {
    const property = await Property.findById(oh.propertyId).select('title city country address propertyType status');
    if (!property || property.status === 'sold' || property.status === 'rented') continue;
    const propertyTitle = property.title || `${property.propertyType} in ${property.city}`;
    const when = formatOpenHouseWindow(oh.startsAt, oh.endsAt, property.country);
    const propertyAddress = [property.address, property.city, property.country].filter(Boolean).join(', ');

    let changed = false;
    for (const rsvp of oh.rsvps) {
      const due = dueReminder(oh.startsAt, rsvp, now);
      if (!due) continue;
      // A "soon" reminder also covers the day-before one if that was missed.
      if (due === 'soon') { rsvp.remindedSoon = true; rsvp.remindedDayBefore = true; }
      else rsvp.remindedDayBefore = true;
      changed = true;
      sent += 1;

      sendOpenHouseReminder({
        to: rsvp.email, name: rsvp.name, propertyTitle, propertyAddress,
        propertyId: String(property._id), when, soon: due === 'soon',
      }).catch((err) => cronLogger.error('Open house reminder email failed:', err));
      if (rsvp.userId) {
        createNotificationWithPush({
          userId: rsvp.userId,
          type: 'open_house_reminder',
          title: due === 'soon' ? 'Open house starts soon' : 'Open house tomorrow',
          message: `${propertyTitle} — ${when}`,
          icon: 'calendar',
          data: { propertyId: String(property._id), openHouseId: String(oh._id), actionUrl: `/property/${String(property._id)}` },
        }).catch((err) => cronLogger.error('Open house reminder notification failed:', err));
      }
    }
    if (changed) await oh.save();
  }
  return sent;
}
