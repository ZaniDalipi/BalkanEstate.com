import { sendEmail } from '../emailService';
import { details, layout, type OpenHouseMail } from '../openHouse/openHouseEmails';

type EventMail = OpenHouseMail & { kind: 'openHouse' | 'auction' };

/** A home the person saved now has an open house or an auction. */
export function sendSavedHomeEventEmail(m: EventMail): Promise<void> {
  const heading = m.kind === 'openHouse' ? 'Open house at a home you saved' : 'A home you saved goes to auction';
  return sendEmail({
    to: m.to,
    category: 'alerts',
    subject: `${heading}: ${m.propertyTitle}`,
    html: layout(heading, details(m), m.propertyId),
    text: `${heading}: ${m.propertyTitle}, ${m.propertyAddress} — ${m.when}.`,
  });
}

/** The day before an auction, to everyone who saved the home. */
export function sendAuctionReminderEmail(m: OpenHouseMail): Promise<void> {
  return sendEmail({
    to: m.to,
    category: 'alerts',
    subject: `Auction tomorrow: ${m.propertyTitle}`,
    html: layout('The auction is tomorrow', details(m), m.propertyId),
    text: `Reminder: the auction for ${m.propertyTitle} is ${m.when}.`,
  });
}
