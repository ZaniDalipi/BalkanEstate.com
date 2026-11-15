import { sendEmail } from '../emailService';

const escapeHtml = (s: string | undefined | null): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const frontendUrl = (): string => process.env.FRONTEND_URL || 'https://balkanestateai.com';

interface OpenHouseMail {
  to: string;
  name: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyId: string;
  when: string;
}

const layout = (heading: string, body: string, propertyId: string): string => `
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
  <h2 style="margin: 0 0 16px 0;">${escapeHtml(heading)}</h2>
  ${body}
  <p style="margin: 24px 0 0 0;">
    <a href="${frontendUrl()}/property/${encodeURIComponent(propertyId)}"
       style="background: #4f46e5; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; display: inline-block;">
      See the listing
    </a>
  </p>
</div>`;

const details = (m: OpenHouseMail): string => `
  <p style="margin: 0 0 8px 0;"><strong>${escapeHtml(m.propertyTitle)}</strong></p>
  <p style="margin: 0 0 8px 0; color: #4b5563;">${escapeHtml(m.propertyAddress)}</p>
  <p style="margin: 0 0 8px 0;">🗓 ${escapeHtml(m.when)}</p>`;

export function sendOpenHouseRsvpConfirmation(m: OpenHouseMail): Promise<void> {
  return sendEmail({
    to: m.to,
    category: 'noreply',
    subject: `You're on the list: open house ${m.when}`,
    html: layout(`See you there, ${m.name}!`, `<p>You signed up for this open house:</p>${details(m)}`, m.propertyId),
    text: `You signed up for the open house at ${m.propertyTitle}, ${m.propertyAddress} — ${m.when}.`,
  });
}

export function sendOpenHouseHostNotice(m: OpenHouseMail & { visitorName: string; visitorEmail: string; visitorPhone?: string }): Promise<void> {
  const contact = [m.visitorEmail, m.visitorPhone].filter(Boolean).map(escapeHtml).join(' · ');
  return sendEmail({
    to: m.to,
    category: 'alerts',
    subject: `${m.visitorName} is coming to your open house`,
    html: layout('New sign-up for your open house', `<p><strong>${escapeHtml(m.visitorName)}</strong> (${contact}) is coming to:</p>${details(m)}`, m.propertyId),
    text: `${m.visitorName} (${m.visitorEmail}) is coming to your open house at ${m.propertyTitle} — ${m.when}.`,
  });
}

export function sendOpenHouseCancelled(m: OpenHouseMail): Promise<void> {
  return sendEmail({
    to: m.to,
    category: 'noreply',
    subject: `Open house cancelled: ${m.propertyTitle}`,
    html: layout('This open house was cancelled', `<p>Sorry, ${escapeHtml(m.name)} — the host cancelled this open house. You can still ask for a private viewing on the listing.</p>${details(m)}`, m.propertyId),
    text: `The open house at ${m.propertyTitle} (${m.when}) was cancelled. You can still ask for a private viewing on the listing.`,
  });
}

export function sendOpenHouseReminder(m: OpenHouseMail & { soon: boolean }): Promise<void> {
  const heading = m.soon ? 'Your open house starts soon' : 'Your open house is tomorrow';
  return sendEmail({
    to: m.to,
    category: 'noreply',
    subject: `Reminder: open house ${m.when}`,
    html: layout(heading, details(m), m.propertyId),
    text: `Reminder: open house at ${m.propertyTitle}, ${m.propertyAddress} — ${m.when}.`,
  });
}
