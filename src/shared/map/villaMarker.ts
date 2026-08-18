/**
 * Shared luxury-villa marker design tokens and SVG builders.
 *
 * Both map engines render the same villa marker language:
 *  - Leaflet: src/components/map/MapPropertyMarker.tsx
 *  - Google:  src/features/map/hooks/useGoogleMap.ts
 *
 * Keeping the palette and the pin geometry here (instead of duplicated in each
 * file) means a design tweak lands in one place.
 *
 * These are framework-agnostic string builders — no React/Leaflet/Google
 * imports — so either engine can drop the fragment into its own SVG.
 */

/**
 * Deep navy shared by the teardrop pin body and the price pill above it. One
 * dark ground for both is what lets the price be plain white at full contrast
 * (~16:1) instead of dark ink on a pale gold fill, and it reads as a single
 * object rather than a gold chip floating above a navy pin.
 */
export const VILLA_PIN_BODY = '#101B2D';

/**
 * Villa marker palette. `light`/`mid`/`deep` drive the pin's gradient rim and
 * the glyph line-art; `mid` doubles as the price pill's hairline. `ink` is the
 * price text — white on both markets, against VILLA_PIN_BODY. `glow` is the
 * "r,g,b" triplet for the drop-shadow halo, so the glow tracks the body colour.
 */
/** For-rent villas: gold rim and glyph. */
export const VILLA_GOLD = { light: '#FFEFB0', mid: '#E8B820', deep: '#B8860B', ink: '#FFFFFF', glow: '232,184,32' } as const;
/**
 * For-sale villas: emerald rim and glyph — a clear second colour. Green holds
 * up against the gold on a busy map better than the previous sapphire, which
 * competed with the water and the standard blue property pins.
 */
export const VILLA_EMERALD = { light: '#6EE7B7', mid: '#10B981', deep: '#047857', ink: '#FFFFFF', glow: '16,185,129' } as const;

/** Marker body palette by market: gold for rent, emerald for sale. */
export interface VillaMarkerPalette {
  light: string;
  mid: string;
  deep: string;
  ink: string;
  /** "r,g,b" triplet for the drop-shadow glow. */
  glow: string;
}
export const getVillaMarkerPalette = (listingType?: string): VillaMarkerPalette =>
  listingType === 'sale' ? VILLA_EMERALD : VILLA_GOLD;

/**
 * Drop-shadow filter for a villa marker, tinted to the palette's glow colour
 * (not hardcoded gold).
 */
export const villaGlowFilter = (pal: VillaMarkerPalette): string =>
  `drop-shadow(0 0 5px rgba(${pal.glow},0.42)) drop-shadow(0 0 11px rgba(${pal.glow},0.22)) drop-shadow(0 2px 4px rgba(0,0,0,0.35))`;

/**
 * ── Branded villa pin icons ──────────────────────────────────────────────
 * Ported from the designer-supplied public/icons/luxury_*.svg set (teardrop
 * pin, navy body, gold/blue gradient rim + glow, line-art glyph). Used as the
 * actual map marker glyph so the map matches the card badges 1:1.
 */
export type VillaPinGlyph = 'crown' | 'star' | 'diamond' | 'palm';

const VILLA_PIN_OUTLINE = 'M50 4C25 4 8 22 8 46c0 28 26 48 42 66 16-18 42-38 42-66C92 22 75 4 50 4Z';

// Shared "house" line-art (crown + star both sit above this roofline).
const VILLA_PIN_HOUSE = [
  'M27 53l23-19 23 19',
  'M32 50v19h36V50',
  'M45 69V57h10v12',
  'M38 48v-7h8v5',
];

const VILLA_PIN_GLYPHS: Record<VillaPinGlyph, { sw: number; d: string[] }[]> = {
  crown: [
    { sw: 3.2, d: ['M30 49l-4-17 12 9 12-16 12 16 12-9-4 17Z', 'M31 56h38', 'M34 62h32'] },
    { sw: 3.1, d: VILLA_PIN_HOUSE },
  ],
  star: [
    { sw: 3.2, d: ['M50 28l6 13 14 2-10 10 3 14-13-7-13 7 3-14-10-10 14-2Z'] },
    { sw: 3.1, d: VILLA_PIN_HOUSE },
  ],
  diamond: [
    { sw: 3.3, d: ['M27 39l8-9h30l8 9-23 29Z', 'M27 39h46', 'M35 30l8 9 7-9 7 9 8-9', 'M43 39l7 29 7-29'] },
  ],
  palm: [
    { sw: 3.1, d: [
      'M50 67V45', 'M50 47c-8-9-17-8-21-8 7 7 13 10 21 8Z', 'M51 46c8-9 17-8 21-8-7 7-13 10-21 8Z',
      'M50 45c-2-11 2-17 5-20 3 8 2 15-5 20Z', 'M29 70h42', 'M36 70v-7h28v7',
    ] },
  ],
};

/**
 * The branded teardrop pin (glow + gradient rim, navy body, glyph line-art)
 * as a standalone SVG string. `uid` namespaces the gradient/filter ids so
 * multiple pins on the same map never collide.
 */
export const buildVillaPinSVG = (glyph: VillaPinGlyph, uid: string, pal: VillaMarkerPalette, displaySize = 24): string => {
  const gid = `lvPin_${uid}`;
  const groups = VILLA_PIN_GLYPHS[glyph]
    .map(({ sw, d }) => `<g fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" color="${pal.mid}">${d.map(p => `<path d="${p}"/>`).join('')}</g>`)
    .join('');
  const h = Math.round(displaySize * 1.2);
  // Solid navy teardrop with the gradient rim (the designer's look), on a fully
  // transparent canvas. No SVG filter here on purpose: feGaussianBlur renders
  // over the filter region and left a faint rectangular box behind each pin.
  // The soft halo comes from villaGlowFilter() (CSS drop-shadow) on the wrapper,
  // which follows the pin's silhouette instead of a box.
  return `<svg width="${displaySize}" height="${h}" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" role="presentation" aria-hidden="true" focusable="false" style="display:block;background:transparent;overflow:visible;">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${pal.light}"/><stop offset="45%" stop-color="${pal.mid}"/><stop offset="100%" stop-color="${pal.deep}"/></linearGradient>
    </defs>
    <path d="${VILLA_PIN_OUTLINE}" fill="${VILLA_PIN_BODY}" stroke="url(#${gid})" stroke-width="5" stroke-linejoin="round"/>
    ${groups}
  </svg>`;
};

/**
 * Full map marker: price label pill stacked above the branded pin icon, tip
 * pointing at the exact coordinate. This is what both map engines render for
 * luxury villas — `glyph` defaults to 'crown' (signature) but callers pass
 * 'star' for actively-promoted listings, mirroring the card badge logic.
 */
export const buildLuxuryVillaMarkerHTML = (
  price: string,
  uid: string,
  pal: VillaMarkerPalette,
  glyph: VillaPinGlyph = 'crown',
  pinSize = 24,
): string => {
  const pin = buildVillaPinSVG(glyph, uid, pal, pinSize);
  // The pill is the pin's navy body with the market colour kept as a hairline
  // rim, so the price is white at full contrast and the two parts read as one
  // marker. A gradient fill behind small text is what made the old dark-ink
  // version hard to scan at a glance.
  const pill = [
    'padding:2.5px 8px',
    'border-radius:999px',
    `background:${VILLA_PIN_BODY}`,
    `color:${pal.ink}`,
    `border:1px solid ${pal.mid}`,
    'font-family:Inter,-apple-system,sans-serif',
    'font-size:10.5px',
    'font-weight:700',
    'letter-spacing:-0.01em',
    'white-space:nowrap',
    `box-shadow:0 1px 3px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.08)`,
    'margin-bottom:-2.5px',
  ].join(';');
  return `<div style="display:flex;flex-direction:column;align-items:center;filter:${villaGlowFilter(pal)};">
    <div style="${pill};">${price}</div>
    ${pin}
  </div>`;
};
