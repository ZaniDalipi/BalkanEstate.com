/**
 * The share card of a business — what Facebook, WhatsApp, LinkedIn… show when
 * someone shares its BalkanEstate link. 1200×630, built from what the
 * business uploaded, whichever looks best:
 *
 *   cover  their cover photo fills the card (cropped where the owner set it),
 *          their logo on a white tile, name and "Category · City" below
 *   logo   no cover: a branded card with their logo large on a white tile
 *   plain  neither: the branded card with their initial
 *
 * Pure: returns the SVG overlay and where the logo goes; sharp does the photos.
 */
import { CARD_H, CARD_W, clip, escapeXml, textWidth } from '../developments/share/shareCardLayout';

export { CARD_H, CARD_W };

const FONT = 'DejaVu Sans, Arial, Helvetica, sans-serif';
const BLUE = '#0252CD';

export type CardMode = 'cover' | 'logo' | 'plain';

export interface BusinessCardInput {
  name: string;
  /** "Construction", or the owner's own words for "other". */
  category: string;
  place: string;
  hasCover: boolean;
  hasLogo: boolean;
  isVerified?: boolean;
}

export interface LogoBox {
  left: number;
  top: number;
  size: number;
}

export interface BusinessCardLayout {
  mode: CardMode;
  svg: string;
  /** Where to place the logo image (already inside its white tile), when there is one. */
  logo: LogoBox | null;
}

export const cardMode = (i: Pick<BusinessCardInput, 'hasCover' | 'hasLogo'>): CardMode =>
  i.hasCover ? 'cover' : i.hasLogo ? 'logo' : 'plain';

/** "real_estate_law" → "Real estate law"; the owner's text for "other". */
export const categoryText = (category: string, custom?: string): string =>
  category === 'other' && custom?.trim() ? custom.trim() : (category.charAt(0).toUpperCase() + category.slice(1)).replace(/_/g, ' ');

/** Cut `text` so it fits `maxWidth` px at `size`, with an ellipsis. */
export function fitWidth(text: string, size: number, maxWidth: number, bold = false): string {
  if (textWidth(text, size, bold) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && textWidth(`${cut}…`, size, bold) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/** Up to two lines of `text` within `maxWidth`, breaking between words. */
export function wrapTwoLines(text: string, size: number, maxWidth: number, bold = false): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (textWidth(next, size, bold) <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= 2) return lines.map((l) => fitWidth(l, size, maxWidth, bold));
  return [fitWidth(lines[0], size, maxWidth, bold), fitWidth(lines.slice(1).join(' '), size, maxWidth, bold)];
}

/** The site's name, as on the generic share image. */
const BRAND = 'BalkanEstateAI';
const PILL_W = 264;

const brandPill = (x: number, y: number) =>
  `<rect x="${x}" y="${y}" width="${PILL_W}" height="52" rx="26" fill="#ffffff" fill-opacity="0.95"/>`
  + `<rect x="${x + 18}" y="${y + 15}" width="22" height="22" rx="6" fill="${BLUE}"/>`
  + `<text x="${x + 50}" y="${y + 34}" font-family="${FONT}" font-size="23" font-weight="700" fill="#0f172a">${BRAND}</text>`;

const verifiedBadge = (cx: number, cy: number) =>
  `<circle cx="${cx}" cy="${cy}" r="17" fill="${BLUE}" stroke="#ffffff" stroke-width="3"/>`
  + `<path d="M${cx - 7} ${cy} l5 5 l9 -10" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;

const svgDoc = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">${body}</svg>`;

/** Cover photo underneath: dark fade at the bottom, logo tile and text over it. */
function coverLayout(i: BusinessCardInput): BusinessCardLayout {
  const tile = { x: 56, y: 414, size: 160 };
  const textX = i.hasLogo ? tile.x + tile.size + 32 : 56;
  const maxW = CARD_W - textX - 56;
  const name = fitWidth(i.name, 52, maxW - (i.isVerified ? 48 : 0), true);
  const sub = fitWidth([i.category, i.place].filter(Boolean).join(' · '), 27, maxW);
  const nameEnd = textX + textWidth(name, 52, true);
  const body = `<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">`
    + `<stop offset="0" stop-color="#020617" stop-opacity="0"/><stop offset="1" stop-color="#020617" stop-opacity="0.88"/></linearGradient></defs>`
    + `<rect x="0" y="250" width="${CARD_W}" height="${CARD_H - 250}" fill="url(#fade)"/>`
    + brandPill(32, 32)
    + (i.hasLogo ? `<rect x="${tile.x}" y="${tile.y}" width="${tile.size}" height="${tile.size}" rx="34" fill="#ffffff"/>` : '')
    + `<text x="${textX}" y="${i.hasLogo ? 500 : 528}" font-family="${FONT}" font-size="52" font-weight="700" fill="#ffffff">${escapeXml(name)}</text>`
    + (i.isVerified ? verifiedBadge(Math.min(nameEnd + 42, CARD_W - 40), i.hasLogo ? 482 : 510) : '')
    + `<text x="${textX}" y="${i.hasLogo ? 548 : 576}" font-family="${FONT}" font-size="27" fill="#e2e8f0">${escapeXml(sub)}</text>`;
  return {
    mode: 'cover',
    svg: svgDoc(body),
    logo: i.hasLogo ? { left: tile.x + 12, top: tile.y + 12, size: tile.size - 24 } : null,
  };
}

/** No cover: a branded card, their logo (or initial) large on the left, name and trade on the right. */
function brandedLayout(i: BusinessCardInput, mode: 'logo' | 'plain'): BusinessCardLayout {
  const tile = { x: 80, y: 135, size: 360 };
  const textX = tile.x + tile.size + 64;
  const maxW = CARD_W - textX - 64;
  const lines = wrapTwoLines(i.name, 56, maxW, true);
  const firstY = lines.length > 1 ? 262 : 300;
  const sub = fitWidth(i.category, 30, maxW);
  const place = fitWidth(i.place, 26, maxW);
  const after = firstY + (lines.length - 1) * 66;
  const initial = escapeXml(i.name.trim().charAt(0).toUpperCase() || 'B');
  const body = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="#003A96"/><stop offset="1" stop-color="#0A84FF"/></linearGradient></defs>`
    + `<rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)"/>`
    + `<circle cx="1080" cy="80" r="240" fill="#ffffff" fill-opacity="0.07"/><circle cx="980" cy="640" r="180" fill="#ffffff" fill-opacity="0.05"/>`
    + `<rect x="${tile.x}" y="${tile.y}" width="${tile.size}" height="${tile.size}" rx="64" fill="#ffffff"/>`
    + (mode === 'plain'
      ? `<text x="${tile.x + tile.size / 2}" y="${tile.y + tile.size / 2 + 66}" text-anchor="middle" font-family="${FONT}" font-size="190" font-weight="700" fill="${BLUE}">${initial}</text>`
      : '')
    + lines.map((l, n) => `<text x="${textX}" y="${firstY + n * 66}" font-family="${FONT}" font-size="56" font-weight="700" fill="#ffffff">${escapeXml(l)}</text>`).join('')
    + `<text x="${textX}" y="${after + 56}" font-family="${FONT}" font-size="30" font-weight="700" fill="#bfdbfe">${escapeXml(sub)}</text>`
    + (place ? `<text x="${textX}" y="${after + 100}" font-family="${FONT}" font-size="26" fill="#dbeafe">${escapeXml(place)}</text>` : '')
    + (i.isVerified ? verifiedBadge(tile.x + tile.size - 8, tile.y + 8) : '')
    + brandPill(CARD_W - PILL_W - 40, CARD_H - 52 - 36);
  return {
    mode,
    svg: svgDoc(body),
    logo: mode === 'logo' ? { left: tile.x + 30, top: tile.y + 30, size: tile.size - 60 } : null,
  };
}

/** The card's overlay and logo position for this business. */
export function buildBusinessCard(input: BusinessCardInput): BusinessCardLayout {
  const i = { ...input, name: clip(input.name.trim() || 'Business', 80) };
  const mode = cardMode(i);
  return mode === 'cover' ? coverLayout(i) : brandedLayout(i, mode);
}
