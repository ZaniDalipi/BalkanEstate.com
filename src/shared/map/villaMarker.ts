/**
 * Shared luxury-villa marker design tokens and SVG builders.
 *
 * Both map engines render the same villa marker language:
 *  - Leaflet: src/components/map/MapPropertyMarker.tsx
 *  - Google:  src/features/map/hooks/useMapMarkers.ts
 *
 * Keeping the palette and the emerald-beacon geometry here (instead of
 * duplicated in each file) means a design tweak lands in one place.
 *
 * These are framework-agnostic string builders — no React/Leaflet/Google
 * imports — so either engine can drop the fragment into its own SVG.
 */

/**
 * Gilded villa palette. The marker body is metallic gold (the luxury signal);
 * `ink` is the dark engraving colour used for the price text on that gold.
 * VILLA_ONYX is kept for the optional dark-card variant but the default
 * markers render fully gold.
 */
export const VILLA_ONYX = { light: '#332C22', dark: '#141009' } as const;
/** For-rent villas: metallic gold body, dark engraved price text. `glow` is the
 *  "r,g,b" triplet used for the marker's drop-shadow halo (so the glow tracks
 *  the body colour instead of being hardcoded). */
export const VILLA_GOLD = { light: '#FFEFB0', mid: '#E8B820', deep: '#B8860B', edge: '#6E5716', ink: '#2C1A00', glow: '232,184,32' } as const;
/** For-sale villas: sapphire-blue body, white price text — a clear second colour. */
export const VILLA_SAPPHIRE = { light: '#7FB4FF', mid: '#2563EB', deep: '#1E40AF', edge: '#16307E', ink: '#FFFFFF', glow: '37,99,235' } as const;
export const VILLA_EMERALD = { light: '#6EE7B7', mid: '#10B981', deep: '#047857', edge: '#065F46' } as const;

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
 * (not hardcoded gold). `strong` gives the larger halo used by the detailed marker.
 */
export const villaGlowFilter = (pal: VillaMarkerPalette, strong = false): string => {
  const [r1, r2] = strong ? [10, 20] : [8, 16];
  const [a1, a2] = strong ? [0.9, 0.55] : [0.85, 0.5];
  return `drop-shadow(0 0 ${r1}px rgba(${pal.glow},${a1})) drop-shadow(0 0 ${r2}px rgba(${pal.glow},${a2})) drop-shadow(0 2px 5px rgba(0,0,0,0.45))`;
};

const round = (n: number): number => Math.round(n * 100) / 100;

/**
 * Emerald gemstone "special estate" beacon as an SVG fragment with a soft
 * radial glow. The halo pulses via `haloClass` (each engine injects its own
 * keyframes under that class name); the facets are static.
 *
 * @param cx        centre-x in viewBox units
 * @param cy        centre-y in viewBox units
 * @param size      gem half-height (also drives halo radius + facet width)
 * @param uid       marker-unique suffix so gradient ids never collide
 * @param haloClass CSS class carrying the pulse animation
 */
export const buildEmeraldBeacon = (
  cx: number,
  cy: number,
  size: number,
  uid: string,
  haloClass: string,
): string => {
  const gid = `emG_${uid}`;
  const hid = `emH_${uid}`;
  const w = size * 0.82;
  return `
    <radialGradient id="${hid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${VILLA_EMERALD.light}" stop-opacity="0.7"/>
      <stop offset="45%" stop-color="${VILLA_EMERALD.mid}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${VILLA_EMERALD.mid}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${VILLA_EMERALD.light}"/>
      <stop offset="55%" stop-color="${VILLA_EMERALD.mid}"/>
      <stop offset="100%" stop-color="${VILLA_EMERALD.deep}"/>
    </linearGradient>
    <circle class="${haloClass}" cx="${round(cx)}" cy="${round(cy)}" r="${round(size * 1.8)}" fill="url(#${hid})"/>
    <path d="M${round(cx)} ${round(cy - size)} L${round(cx + w)} ${round(cy)} L${round(cx)} ${round(cy + size)} L${round(cx - w)} ${round(cy)} Z" fill="url(#${gid})" stroke="${VILLA_EMERALD.edge}" stroke-width="0.7"/>
    <path d="M${round(cx)} ${round(cy - size)} L${round(cx + w)} ${round(cy)} L${round(cx)} ${round(cy)} Z" fill="#A7F3D0" opacity="0.75"/>
    <circle cx="${round(cx - w * 0.32)}" cy="${round(cy - size * 0.32)}" r="${round(size * 0.2)}" fill="#ffffff" opacity="0.92"/>
  `;
};
