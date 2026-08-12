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
  const [r1, r2] = strong ? [6, 13] : [5, 11];
  const [a1, a2] = strong ? [0.5, 0.28] : [0.42, 0.22];
  return `drop-shadow(0 0 ${r1}px rgba(${pal.glow},${a1})) drop-shadow(0 0 ${r2}px rgba(${pal.glow},${a2})) drop-shadow(0 2px 4px rgba(0,0,0,0.35))`;
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

/**
 * Inject the emerald-beacon halo + body-sheen keyframes once. Both map engines
 * reference the `villa-g-halo` / `villa-g-sheen` classes used by the SVG below.
 */
export const injectVillaMarkerStyles = (): void => {
  if (typeof document === 'undefined') return;
  const id = 'villa-marker-styles';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    @keyframes villaEmeraldPulseG { 0%,100% { opacity:0.55; transform:scale(0.92);} 50% { opacity:1; transform:scale(1.18);} }
    .villa-g-halo { transform-box: fill-box; transform-origin: center; animation: villaEmeraldPulseG 2.2s ease-in-out infinite; }
    @keyframes villaSheenG { 0% { opacity:0; transform:translateX(-60%);} 45% { opacity:0.55;} 100% { opacity:0; transform:translateX(60%);} }
    .villa-g-sheen { transform-box: fill-box; transform-origin: center; animation: villaSheenG 4.5s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
};

/**
 * Gilded villa marker as an SVG string (dynamic width) for an AdvancedMarker /
 * divIcon. Body + roof + trim + price text come from `pal` (gold for rent,
 * sapphire for sale); crowned with the emerald beacon on a pin tip.
 */
export const buildLuxuryVillaSVG = (price: string, uid: string, pal: VillaMarkerPalette): string => {
  // Clean, professional price pill with a small sparkle + a downward pointer.
  const padL = 22;               // room for the leading sparkle
  const padR = 12;
  const W = Math.max(58, price.length * 7 + padL + padR);
  const H = 40;
  const cx = W / 2;
  const scale = 0.85;
  const gid = `lvG_${uid}`;
  const gloss = `lvGl_${uid}`;
  const starCx = 13;
  const starCy = 16;
  return `<svg width="${Math.round(W * scale)}" height="${Math.round(H * scale)}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:${villaGlowFilter(pal)};display:block;">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${pal.light}"/><stop offset="55%" stop-color="${pal.mid}"/><stop offset="100%" stop-color="${pal.deep}"/></linearGradient>
      <linearGradient id="${gloss}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="55%" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
    </defs>
    <!-- Pointer -->
    <path d="M${cx - 6} 26 L${cx} 34 L${cx + 6} 26 Z" fill="${pal.deep}"/>
    <!-- Pill body -->
    <rect x="1.5" y="4" width="${W - 3}" height="22" rx="11" fill="url(#${gid})" stroke="${pal.edge}" stroke-width="1"/>
    <!-- Top gloss -->
    <rect x="3" y="5.5" width="${W - 6}" height="9" rx="4.5" fill="url(#${gloss})"/>
    <!-- Sparkle accent -->
    <path d="M${starCx} ${starCy - 4.5} Q${starCx + 0.6} ${starCy - 0.6} ${starCx + 4.5} ${starCy} Q${starCx + 0.6} ${starCy + 0.6} ${starCx} ${starCy + 4.5} Q${starCx - 0.6} ${starCy + 0.6} ${starCx - 4.5} ${starCy} Q${starCx - 0.6} ${starCy - 0.6} ${starCx} ${starCy - 4.5} Z" fill="${pal.ink}" opacity="0.9"/>
    <!-- Price -->
    <text x="${(starCx + 4.5 + (W - padR) ) / 2 + 1}" y="16.5" font-family="Inter,-apple-system,sans-serif" font-size="11" font-weight="700" fill="${pal.ink}" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.02em">${price}</text>
  </svg>`;
};
