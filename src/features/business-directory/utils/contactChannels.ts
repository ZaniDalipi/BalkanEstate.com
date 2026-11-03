import type { BusinessListing } from '@/src/shared/types/businessListing.types';
import { formatPhone, telHref, toDialable, viberHref, whatsappHref } from './phone';
import { directionsUrl, fullAddress, websiteHref, websiteLabel } from './businessFacts';

export type ContactChannelId = 'call' | 'whatsapp' | 'viber' | 'email' | 'website' | 'directions';

export interface ContactChannel {
  id: ContactChannelId;
  href: string;
  /** What the row shows: the formatted number, address, site… */
  value: string;
  /** Opens in a new tab (web links) rather than handing off to an app. */
  external: boolean;
}

/**
 * Every way to reach the business, in the order people reach for them —
 * one list for the action row, the contact card and the mobile bar.
 * Channels without data are left out.
 */
export function contactChannels(l: BusinessListing): ContactChannel[] {
  const channels: ContactChannel[] = [];
  if (toDialable(l.contactPhone)) {
    channels.push({ id: 'call', href: telHref(l.contactPhone), value: formatPhone(l.contactPhone), external: false });
  }
  if (toDialable(l.whatsapp)) {
    channels.push({ id: 'whatsapp', href: whatsappHref(l.whatsapp), value: formatPhone(l.whatsapp), external: true });
  }
  if (toDialable(l.viber)) {
    channels.push({ id: 'viber', href: viberHref(l.viber), value: formatPhone(l.viber), external: false });
  }
  if (l.contactEmail?.trim()) {
    channels.push({ id: 'email', href: `mailto:${l.contactEmail.trim()}`, value: l.contactEmail.trim(), external: false });
  }
  if (l.website?.trim()) {
    channels.push({ id: 'website', href: websiteHref(l.website), value: websiteLabel(l.website), external: true });
  }
  if (l.city || l.address || (l.latitude != null && l.longitude != null)) {
    channels.push({ id: 'directions', href: directionsUrl(l), value: fullAddress(l), external: true });
  }
  return channels;
}

/**
 * The quick-action row: call first, then one messenger, directions, website
 * and email — at most `max`, so the buttons stay a comfortable size.
 */
export function quickActions(channels: ContactChannel[], max = 4): ContactChannel[] {
  const byId = (id: ContactChannelId) => channels.find((c) => c.id === id);
  const messenger = byId('whatsapp') ?? byId('viber');
  return [byId('call'), messenger, byId('directions'), byId('website'), byId('email')]
    .filter((c): c is ContactChannel => !!c)
    .slice(0, max);
}
