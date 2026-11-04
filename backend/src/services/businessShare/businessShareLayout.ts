/**
 * The share card of a business — what Facebook, WhatsApp, LinkedIn… show when
 * someone shares its BalkanEstate link. 1200×630, in the liquid-glass style of
 * the site: their cover photo full-bleed (or the brand gradient when they have
 * none), a frosted glass panel — the photo behind it really blurred — with a
 * light-catching rim, holding a letter-spaced label, their name, their
 * services and a facts row with a glass "View business" button; their logo on
 * a glass tile, the brand on top and the domain below.
 *
 * Pure: returns the SVG layers and where the glass panel and logo go; the
 * renderer (businessShareImage) blurs the photo under the panel with sharp.
 */
import { CARD_H, CARD_W, clip, escapeXml, textWidth } from '../developments/share/shareCardLayout';

export { CARD_H, CARD_W };

const FONT = 'DejaVu Sans, Arial, Helvetica, sans-serif';
const BLUE = '#0A84FF';

export type CardMode = 'cover' | 'logo' | 'plain';

export interface BusinessCardInput {
  name: string;
  /** "Construction", or the owner's own words for "other". */
  category: string;
  place: string;
  hasCover: boolean;
  hasLogo: boolean;
  isVerified?: boolean;
  services?: string[];
  /** Short facts for the bottom row: "4 years in business", "$$"… */
  facts?: string[];
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

export interface LogoBox {
  left: number;
  top: number;
  size: number;
}

export interface BusinessCardLayout {
  mode: CardMode;
  /** The background when there is no cover photo (SVG, full card). */
  backgroundSvg: string | null;
  /** Shadows and vignettes, drawn over the background and under the glass. */
  underSvg: string;
  /** Where the frosted glass goes: the renderer blurs the background inside it. */
  glass: Box[];
  /** Rims, text and the logo tile's frame, drawn on top. */
  overSvg: string;
  /** Where to place the logo image (inside its tile), when there is one. */
  logo: LogoBox | null;
}

export const cardMode = (i: Pick<BusinessCardInput, 'hasCover' | 'hasLogo'>): CardMode =>
  i.hasCover ? 'cover' : i.hasLogo ? 'logo' : 'plain';

/** "real_estate_law" → "Real estate law"; the owner's text for "other". */
export const categoryText = (category: string, custom?: string): string =>
  category === 'other' && custom?.trim() ? custom.trim() : (category.charAt(0).toUpperCase() + category.slice(1)).replace(/_/g, ' ');

/** Cut `text` so it fits `maxWidth` px at `size`, with an ellipsis. */
export function fitWidth(text: string, size: number, maxWidth: number, bold = false, spacing = 0): string {
  const width = (t: string) => textWidth(t, size, bold) + spacing * t.length;
  if (width(text) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && width(`${cut}…`) > maxWidth) cut = cut.slice(0, -1);
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

const svgDoc = (defs: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}"><defs>${defs}</defs>${body}</svg>`;

/** The light-catching edge of a glass shape: bright top-left, fading round the sides. */
const RIM_DEF =
  `<linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">`
  + `<stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.4" stop-color="#ffffff" stop-opacity="0.3"/>`
  + `<stop offset="0.7" stop-color="#ffffff" stop-opacity="0.15"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.7"/></linearGradient>`
  + `<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">`
  + `<stop offset="0" stop-color="#ffffff" stop-opacity="0.32"/><stop offset="0.45" stop-color="#ffffff" stop-opacity="0.04"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>`
  + `<filter id="glow" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>`
  + `<filter id="shadow" x="-10%" y="-20%" width="120%" height="160%"><feGaussianBlur stdDeviation="18"/></filter>`;

const rect = (b: Box, attrs: string) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${b.r}" ${attrs}/>`;

/** Sheen, rim and a soft outer glow over a frosted area. */
const glassFrame = (b: Box) =>
  rect(b, 'fill="url(#sheen)"')
  + rect(b, 'fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="6" filter="url(#glow)"')
  + rect(b, 'fill="none" stroke="url(#rim)" stroke-width="2.5"');

const tracked = (x: number, y: number, size: number, spacing: number, fill: string, text: string, anchor = 'start', weight = 600) =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${fill}">${escapeXml(text)}</text>`;

/** The card's layers for this business. */
export function buildBusinessCard(input: BusinessCardInput): BusinessCardLayout {
  const i = { ...input, name: clip(input.name.trim() || 'Business', 80) };
  const mode = cardMode(i);

  const panel: Box = { x: 56, y: 236, w: CARD_W - 112, h: 300, r: 38 };
  const tile: Box = { x: CARD_W - 56 - 132, y: 40, w: 132, h: 132, r: 30 };
  // Wide enough for the tracked capitals (DejaVu bold caps run wider than textWidth estimates).
  const brand: Box = { x: CARD_W / 2 - 180, y: 36, w: 360, h: 54, r: 27 };
  const pad = 44;
  const innerW = panel.w - pad * 2;

  // Panel text.
  const label = fitWidth([i.category, i.place].filter(Boolean).join(' · ').toUpperCase(), 19, innerW, true, 5);
  const name = fitWidth(i.name, 56, innerW - (i.isVerified ? 52 : 0), true);
  const services = fitWidth((i.services ?? []).filter(Boolean).slice(0, 4).join('  ·  '), 26, innerW);
  const cta = { w: 300, h: 60 };
  const ctaBox: Box = { x: panel.x + panel.w - pad - cta.w, y: panel.y + panel.h - 30 - cta.h, w: cta.w, h: cta.h, r: 30 };
  const factsText = fitWidth((i.facts ?? []).filter(Boolean).join('  ·  '), 24, innerW - cta.w - 24 - (i.isVerified ? 36 : 0));
  const nameY = panel.y + 132;
  const nameEnd = panel.x + pad + textWidth(name, 56, true);
  const dividerY = panel.y + 200;
  const factsY = ctaBox.y + 39;

  const backgroundSvg = mode === 'cover'
    ? null
    : svgDoc(
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#001a4d"/><stop offset="0.55" stop-color="#003A96"/><stop offset="1" stop-color="#0A84FF"/></linearGradient>`
        + `<radialGradient id="orb1" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#5ac8fa" stop-opacity="0.55"/><stop offset="1" stop-color="#5ac8fa" stop-opacity="0"/></radialGradient>`
        + `<radialGradient id="orb2" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#bf5af2" stop-opacity="0.45"/><stop offset="1" stop-color="#bf5af2" stop-opacity="0"/></radialGradient>`,
      `<rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)"/>`
        + `<circle cx="980" cy="300" r="330" fill="url(#orb1)"/><circle cx="220" cy="520" r="300" fill="url(#orb2)"/>`
        + `<circle cx="640" cy="120" r="220" fill="url(#orb1)" opacity="0.6"/>`,
    );

  const underSvg = svgDoc(
    `<linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617" stop-opacity="0.45"/><stop offset="1" stop-color="#020617" stop-opacity="0"/></linearGradient>`
      + `<linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020617" stop-opacity="0"/><stop offset="1" stop-color="#020617" stop-opacity="0.6"/></linearGradient>`
      + `<filter id="shadow" x="-10%" y="-20%" width="120%" height="160%"><feGaussianBlur stdDeviation="18"/></filter>`,
    `<rect width="${CARD_W}" height="200" fill="url(#top)"/><rect y="380" width="${CARD_W}" height="250" fill="url(#bottom)"/>`
      + rect({ ...panel, y: panel.y + 16 }, 'fill="#020617" fill-opacity="0.35" filter="url(#shadow)"'),
  );

  const verified = (cx: number, cy: number, r = 15) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${BLUE}" stroke="#ffffff" stroke-width="2.5"/>`
    + `<path d="M${cx - r * 0.42} ${cy} l${r * 0.3} ${r * 0.3} l${r * 0.55} -${r * 0.62}" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;

  const overSvg = svgDoc(
    RIM_DEF
      + `<linearGradient id="cta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2997ff" stop-opacity="0.85"/><stop offset="1" stop-color="#0252CD" stop-opacity="0.85"/></linearGradient>`,
    // Brand, top centre.
    glassFrame(brand)
      + rect({ ...brand, x: brand.x + 22, y: brand.y + 15, w: 24, h: 24, r: 7 }, `fill="${BLUE}"`)
      + tracked(brand.x + 58, brand.y + 35, 21, 3, '#ffffff', 'BALKANESTATEAI', 'start', 700)
      // Logo tile (frosted; the logo itself is composited by the renderer) or initial.
      + (mode === 'plain'
        ? `<text x="${tile.x + tile.w / 2}" y="${tile.y + tile.h / 2 + 30}" text-anchor="middle" font-family="${FONT}" font-size="84" font-weight="700" fill="#ffffff">${escapeXml(i.name.charAt(0).toUpperCase())}</text>`
        : '')
      + glassFrame(tile)
      // The panel.
      + glassFrame(panel)
      + tracked(panel.x + pad, panel.y + 58, 19, 5, '#e2e8f0', label, 'start', 700)
      + `<text x="${panel.x + pad}" y="${nameY}" font-family="${FONT}" font-size="56" font-weight="700" fill="#ffffff">${escapeXml(name)}</text>`
      + (i.isVerified ? verified(Math.min(nameEnd + 36, panel.x + panel.w - pad - 15), nameY - 19, 17) : '')
      + (services ? `<text x="${panel.x + pad}" y="${nameY + 46}" font-family="${FONT}" font-size="26" fill="#f1f5f9">${escapeXml(services)}</text>` : '')
      + `<line x1="${panel.x + pad}" y1="${dividerY}" x2="${panel.x + panel.w - pad}" y2="${dividerY}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.5"/>`
      + (i.isVerified ? verified(panel.x + pad + 14, factsY - 8, 13) : '')
      + (factsText ? `<text x="${panel.x + pad + (i.isVerified ? 38 : 0)}" y="${factsY}" font-family="${FONT}" font-size="24" fill="#f8fafc">${escapeXml(factsText)}</text>` : '')
      // Glass call to action.
      + rect(ctaBox, 'fill="url(#cta)"') + glassFrame(ctaBox)
      + `<text x="${ctaBox.x + ctaBox.w / 2 - 10}" y="${ctaBox.y + 39}" text-anchor="middle" font-family="${FONT}" font-size="25" font-weight="700" fill="#ffffff">View business</text>`
      + `<path d="M${ctaBox.x + ctaBox.w - 46} ${ctaBox.y + 22} l9 8 l-9 8" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`
      // Domain.
      + tracked(CARD_W / 2, CARD_H - 30, 20, 4, '#ffffff', 'balkanestateai.com', 'middle', 600),
  );

  return {
    mode,
    backgroundSvg,
    underSvg,
    glass: [brand, tile, panel],
    overSvg,
    logo: i.hasLogo ? { left: tile.x + 16, top: tile.y + 16, size: tile.w - 32 } : null,
  };
}
