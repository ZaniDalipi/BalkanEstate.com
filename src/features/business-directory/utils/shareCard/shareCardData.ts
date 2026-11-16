import type { BusinessListing } from '@/src/shared/types/businessListing.types';

/**
 * The lanyard / band colours, mirroring --color-chart-1…5 in src/index.css
 * (canvas can't read CSS vars cheaply) and BADGE_TONES in
 * backend/src/services/businessShare/individualShareLayout.ts. Keep the three in step.
 */
export const CARD_TONES = ['#0252CD', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'] as const;

/**
 * A listing's colour (0–4) from its id: the rail's badge, the share card and
 * the link preview (the backend's toneIndex, same hash) all use it, so a
 * professional is one colour everywhere.
 */
export function toneIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % CARD_TONES.length;
}

/** The listing's colour as hex, for the canvas card. */
export const toneFor = (id: string): string => CARD_TONES[toneIndex(id)] ?? CARD_TONES[0];

/** Up to two initials for the portrait when there is no photo (or it can't be drawn). */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => /\p{L}|\p{N}/u.test(w));
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words.slice(0, 1);
  return letters.map((w) => Array.from(w ?? '')[0] ?? '').join('').toUpperCase() || '?';
}

/** File name for the downloaded card, e.g. "ana-kovac-balkanestate.png". */
export function cardFileName(name: string): string {
  const slug = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || 'card'}-balkanestate.png`;
}

/** What the card prints. */
export interface ShareCardContent {
  name: string;
  role: string;
  place: string;
  /** Absolute link the QR code opens: the listing on our site. */
  url: string;
  imageUrl?: string;
  tone: string;
  /** Caption under the QR code, e.g. "Scan to view on BalkanEstate". */
  scanLabel: string;
  /** Site name printed in the footer, e.g. "balkanestateai.com". */
  site: string;
}

export function placeOf(listing: Pick<BusinessListing, 'city' | 'country'>): string {
  return [listing.city, listing.country].filter(Boolean).join(', ');
}
