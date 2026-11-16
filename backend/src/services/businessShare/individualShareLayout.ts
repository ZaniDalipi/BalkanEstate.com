/**
 * The link-preview card for an individual (a professional, not a business):
 * their ID badge on a lanyard, the same design as the in-app share card and
 * the directory's lanyard rail, laid out landscape (1200×630) with their
 * name, trade and place beside it. Pure layout: returns SVG strings; the
 * renderer (businessShareImage) adds the portrait photo.
 */
import { escapeXml, textWidth } from '../developments/share/shareCardLayout';
import { CARD_H, CARD_W, fitWidth } from './businessShareLayout';

const FONT = 'DejaVu Sans, Arial, Helvetica, sans-serif';
const INK = '#1A202C';
const MUTED = '#718096';

/**
 * Lanyard / band colours, in the same order as the app's --color-chart-1…5
 * (src/index.css) and CARD_TONES (src/features/business-directory/utils/
 * shareCard/shareCardData.ts). Keep the three in step.
 */
export const BADGE_TONES = ['#0252CD', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'] as const;

/**
 * The listing's colour from its public (encoded) id: the same hash as the
 * app's toneIndex(), so the rail, the share card and this preview agree.
 */
export function toneIndex(publicId: string): number {
  let h = 0;
  for (let i = 0; i < publicId.length; i++) h = (h * 31 + publicId.charCodeAt(i)) >>> 0;
  return h % BADGE_TONES.length;
}

/** Up to two initials, for a badge without a photo. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  const picked = words.length > 1 ? [words[0], words[words.length - 1]] : words.slice(0, 1);
  return picked.map((w) => Array.from(w ?? '')[0] ?? '').join('').toUpperCase() || '?';
}

export interface IndividualCardInput {
  name: string;
  category: string;
  place: string;
  tone: string;
  hasPhoto: boolean;
  /** Short chips: "Verified", "Est. 2019", "$$"… (at most three are drawn). */
  facts: string[];
  /** The QR code's modules as an SVG <path d>, drawn in a 0..size box. */
  qr: { path: string; size: number };
  /** Site host printed in the footer, e.g. "balkanestateai.com". */
  site: string;
}

export interface IndividualCardLayout {
  svg: string;
  /** Where the round portrait goes (top-left corner and diameter), when there is a photo. */
  photo: { left: number; top: number; size: number };
}

// The badge: portrait card left of centre, hanging from a lanyard at the top edge.
const BADGE = { x: 120, y: 92, w: 340, h: 500, r: 28 };
const BAND_H = 150;
/** Diameter of the round portrait on the badge. */
export const PORTRAIT_SIZE = 132;
const PHOTO = PORTRAIT_SIZE;

const text = (x: number, y: number, s: string, size: number, weight: number, fill: string, anchor = 'start', spacing = 0) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${fill}">${escapeXml(s)}</text>`;

/** Largest size from `max` down to `min` at which the text fits; past that it is cut with an ellipsis. */
export function fitSize(s: string, max: number, min: number, maxWidth: number, bold = true): { text: string; size: number } {
  for (let size = max; size >= min; size -= 2) if (textWidth(s, size, bold) <= maxWidth) return { text: s, size };
  return { text: fitWidth(s, min, maxWidth, bold), size: min };
}

/** Letters pressed into the band: a dark edge above, light letters on top (as in the app's badges). */
const engraved = (x: number, y: number, s: string) =>
  `<text x="${x}" y="${y - 1}" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="800" letter-spacing="4" fill="#000000" fill-opacity="0.28">${escapeXml(s)}</text>`
  + `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="800" letter-spacing="4" fill="#ffffff" fill-opacity="0.92">${escapeXml(s)}</text>`;

function chips(facts: string[], x: number, y: number): string {
  let cx = x;
  let out = '';
  for (const f of facts.slice(0, 3)) {
    const label = fitWidth(f, 24, 260);
    const w = Math.round(label.length * 13.5 + 40);
    out += `<rect x="${cx}" y="${y}" width="${w}" height="46" rx="23" fill="#ffffff" stroke="#E2E8F0" stroke-width="2"/>`
      + text(cx + w / 2, y + 31, label, 24, 600, '#4A5568', 'middle');
    cx += w + 12;
  }
  return out;
}

export function buildIndividualCard(i: IndividualCardInput): IndividualCardLayout {
  const cx = BADGE.x + BADGE.w / 2;
  const photo = { left: Math.round(cx - PHOTO / 2), top: BADGE.y + BAND_H - PHOTO / 2, size: PHOTO };
  const qrBox = 128;
  const qrScale = qrBox / i.qr.size;
  const qrTop = BADGE.y + BADGE.h - qrBox - 34;
  const right = 540;
  const name = fitSize(i.name, 64, 40, CARD_W - right - 60);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}">`
    + '<defs>'
    + '<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EEF2FF"/><stop offset="1" stop-color="#F2F2F7"/></linearGradient>'
    + '<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#1A202C" fill-opacity="0.07"/></pattern>'
    + `<pattern id="stripes" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="22" fill="#ffffff" fill-opacity="0.13"/></pattern>`
    + `<clipPath id="badge"><rect x="${BADGE.x}" y="${BADGE.y}" width="${BADGE.w}" height="${BADGE.h}" rx="${BADGE.r}"/></clipPath>`
    + '<filter id="lift" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0F172A" flood-opacity="0.22"/></filter>'
    + '</defs>'
    + `<rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)"/><rect width="${CARD_W}" height="${CARD_H}" fill="url(#dots)"/>`
    // Lanyard strap and clip.
    + `<rect x="${cx - 17}" y="0" width="34" height="${BADGE.y - 4}" fill="${i.tone}"/>`
    + `<rect x="${cx - 11}" y="0" width="22" height="${BADGE.y - 4}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-dasharray="6 6" stroke-width="2"/>`
    + `<rect x="${cx - 38}" y="${BADGE.y - 22}" width="76" height="34" rx="9" fill="#A0AEC0"/>`
    // Badge: card, band with stripes, clip slot, engraved category.
    + `<rect x="${BADGE.x}" y="${BADGE.y}" width="${BADGE.w}" height="${BADGE.h}" rx="${BADGE.r}" fill="#ffffff" filter="url(#lift)"/>`
    + `<g clip-path="url(#badge)"><rect x="${BADGE.x}" y="${BADGE.y}" width="${BADGE.w}" height="${BAND_H}" fill="${i.tone}"/><rect x="${BADGE.x}" y="${BADGE.y}" width="${BADGE.w}" height="${BAND_H}" fill="url(#stripes)"/></g>`
    + `<rect x="${cx - 52}" y="${BADGE.y + 22}" width="104" height="20" rx="10" fill="#F2F2F7"/>`
    + engraved(cx, BADGE.y + 64, fitWidth(i.category.toUpperCase(), 17, BADGE.w - 60, true, 4))
    // Portrait ring (and initials when there is no photo).
    + `<circle cx="${cx}" cy="${photo.top + PHOTO / 2}" r="${PHOTO / 2 + 8}" fill="#ffffff"/>`
    + (i.hasPhoto ? '' : `<circle cx="${cx}" cy="${photo.top + PHOTO / 2}" r="${PHOTO / 2}" fill="${i.tone}"/>`
      + text(cx, photo.top + PHOTO / 2 + 18, initials(i.name), 52, 700, '#ffffff', 'middle'))
    + text(cx, photo.top + PHOTO + 52, fitWidth(i.name, 30, BADGE.w - 40, true), 30, 700, INK, 'middle')
    + text(cx, photo.top + PHOTO + 84, fitWidth(i.place.toUpperCase(), 15, BADGE.w - 40, false, 2), 15, 600, MUTED, 'middle', 2)
    // QR code to the profile.
    + `<line x1="${BADGE.x + 30}" y1="${qrTop - 18}" x2="${BADGE.x + BADGE.w - 30}" y2="${qrTop - 18}" stroke="#E2E8F0" stroke-width="2" stroke-dasharray="8 8"/>`
    + `<g transform="translate(${cx - qrBox / 2} ${qrTop}) scale(${qrScale})"><path d="${i.qr.path}" fill="${INK}"/></g>`
    // Right side: who, what, where.
    + text(right, 196, 'FEATURED PROFESSIONAL', 22, 700, MUTED, 'start', 6)
    + text(right, 276, name.text, name.size, 800, INK)
    + text(right, 330, fitWidth(i.category, 38, CARD_W - right - 60, true), 38, 700, i.tone)
    + text(right, 376, fitWidth(i.place, 28, CARD_W - right - 60), 28, 500, MUTED)
    + chips(i.facts, right, 414)
    + text(right, 548, `Scan or tap to view on ${i.site}`, 24, 600, MUTED)
    + '</svg>';

  return { svg, photo };
}
