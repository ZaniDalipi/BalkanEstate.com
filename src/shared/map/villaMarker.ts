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
 * Gilded villa palette. The marker body is metallic gold (the luxury signal);
 * `ink` is the dark engraving colour used for the price text on that gold.
 */
/** For-rent villas: metallic gold body, dark engraved price text. `glow` is the
 *  "r,g,b" triplet used for the marker's drop-shadow halo (so the glow tracks
 *  the body colour instead of being hardcoded). */
export const VILLA_GOLD = { light: '#FFEFB0', mid: '#E8B820', deep: '#B8860B', edge: '#6E5716', ink: '#2C1A00', glow: '232,184,32' } as const;
/** For-sale villas: sapphire-blue body, white price text — a clear second colour. */
export const VILLA_SAPPHIRE = { light: '#7FB4FF', mid: '#2563EB', deep: '#1E40AF', edge: '#16307E', ink: '#FFFFFF', glow: '37,99,235' } as const;

/** Marker body palette by market: gold for rent, sapphire for sale. */
export interface VillaMarkerPalette {
  light: string;
  mid: string;
  deep: string;
  edge: string;
  ink: string;
  /** "r,g,b" triplet for the drop-shadow glow. */
  glow: string;
}
export const getVillaMarkerPalette = (listingType?: string): VillaMarkerPalette =>
  listingType === 'sale' ? VILLA_SAPPHIRE : VILLA_GOLD;

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
    <path d="${VILLA_PIN_OUTLINE}" fill="#101B2D" stroke="url(#${gid})" stroke-width="5" stroke-linejoin="round"/>
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
  return `<div style="display:flex;flex-direction:column;align-items:center;filter:${villaGlowFilter(pal)};">
    <div style="padding:2px 7px;border-radius:999px;background:linear-gradient(135deg,${pal.light},${pal.mid} 55%,${pal.deep});color:${pal.ink};border:1px solid ${pal.edge};font-family:Inter,-apple-system,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:-0.01em;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.3);margin-bottom:-2.5px;">${price}</div>
    ${pin}
  </div>`;
};
