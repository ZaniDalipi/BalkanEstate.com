/**
 * Map Tile Styles Configuration for Real Estate App
 *
 * Optimized map styles that:
 * - Use soft, muted colors so property markers stand out
 * - Show clear road networks for navigation
 * - Highlight green spaces (parks important for buyers)
 * - Have clean labels that don't compete with markers
 */

export interface MapTileLayer {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  maxNativeZoom: number;
  description: string;
}

// =============================================================================
// API keys and keyless fallbacks
// =============================================================================

/**
 * CARTO and Stadia both moved their basemaps behind an API key. Requested
 * without one they still return tiles — stamped "API KEY REQUIRED" across every
 * single one. So a keyed provider is used only when a key exists, and otherwise
 * a keyless equivalent is substituted.
 *
 * To use the nicer CARTO/Stadia styles, set `VITE_CARTO_API_KEY` /
 * `VITE_STADIA_API_KEY` at build time. With no keys, the maps still work.
 *
 * `VITE_MAP_KEYLESS_PROVIDER` picks which keyless basemap stands in:
 *   - `esri` (default) — Esri light/dark grey canvas, closest to the CARTO look
 *   - `osm`            — OpenStreetMap standard: busier, but the most certain
 *                        to be available anywhere
 *
 * Any host named here must also be allowed by the backend CSP (`imgSrc` in
 * `backend/src/middleware/security.ts`).
 */
type KeyedProvider = 'carto' | 'stadia';

/** Which keyless family stands in for a keyed style. */
type TileRole = 'light' | 'dark';

const readEnv = (name: string): string => {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return typeof value === 'string' ? value.trim() : '';
};

const API_KEYS: Record<KeyedProvider, string> = {
  carto: readEnv('VITE_CARTO_API_KEY'),
  stadia: readEnv('VITE_STADIA_API_KEY'),
};

export const hasMapProviderKey = (provider: KeyedProvider): boolean =>
  API_KEYS[provider].length > 0;

const KEYLESS_PROVIDER: 'esri' | 'osm' =
  readEnv('VITE_MAP_KEYLESS_PROVIDER') === 'osm' ? 'osm' : 'esri';

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ESRI_ATTRIBUTION =
  '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors';

const OSM_KEYLESS = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: OSM_ATTRIBUTION,
  maxNativeZoom: 19,
};

const KEYLESS_TILES: Record<TileRole, Record<'esri' | 'osm', {
  url: string;
  attribution: string;
  maxNativeZoom: number;
}>> = {
  light: {
    esri: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: ESRI_ATTRIBUTION,
      maxNativeZoom: 16,
    },
    osm: OSM_KEYLESS,
  },
  dark: {
    esri: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: ESRI_ATTRIBUTION,
      maxNativeZoom: 16,
    },
    osm: OSM_KEYLESS,
  },
};

/**
 * Resolve one tile layer: the keyed URL when a key exists, the keyless
 * equivalent otherwise. Applied at module load, so every existing consumer of
 * `MAP_TILE_LAYERS` gets working tiles without changing how it reads them.
 */
function resolveKeyedLayer(
  layer: MapTileLayer,
  spec: { provider: KeyedProvider; role: TileRole },
): MapTileLayer {
  const key = API_KEYS[spec.provider];
  if (key) {
    const separator = layer.url.includes('?') ? '&' : '?';
    return { ...layer, url: `${layer.url}${separator}api_key=${encodeURIComponent(key)}` };
  }

  const fallback = KEYLESS_TILES[spec.role][KEYLESS_PROVIDER];
  return {
    ...layer,
    url: fallback.url,
    attribution: fallback.attribution,
    maxNativeZoom: Math.min(layer.maxNativeZoom, fallback.maxNativeZoom),
  };
}

/**
 * Available map tile styles
 *
 * Organized by category:
 * - Clean/Minimal: Best for property searches (properties stand out)
 * - Standard: Good for general navigation
 * - Satellite: Best for land/plot viewing
 */
export const MAP_TILE_LAYERS: Record<string, MapTileLayer> = {
  // === CLEAN/MINIMAL STYLES (Real Estate Optimized) ===

  // Carto Positron - Very clean, light gray with subtle features
  // BEST FOR: Property search, markers really pop on this
  positron: resolveKeyedLayer({
    name: 'Clean Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    description: 'Clean, minimal style - properties stand out',
  }, { provider: 'carto', role: 'light' }),

  // Carto Voyager - Colorful but soft, shows POIs nicely
  // BEST FOR: Neighborhood exploration, shows amenities
  voyager: resolveKeyedLayer({
    name: 'Neighborhood',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    description: 'Shows neighborhoods, parks, and amenities clearly',
  }, { provider: 'carto', role: 'light' }),

  // Label-free light base — for choropleths, where polygon labels are the map
  choropleth: resolveKeyedLayer({
    name: 'Choropleth Base',
    url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    description: 'Muted, label-free base for coloured district overlays',
  }, { provider: 'carto', role: 'light' }),

  // Stadia Alidade Smooth - Modern, subtle coloring
  // BEST FOR: Premium/luxury property viewing
  smooth: resolveKeyedLayer({
    name: 'Modern',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    description: 'Modern, smooth appearance',
  }, { provider: 'stadia', role: 'light' }),

  // === STANDARD STYLES ===

  // Google Maps Street - familiar look
  street: {
    name: 'Street',
    url: 'https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 21,
    maxNativeZoom: 21,
    description: 'Standard Google Maps view',
  },

  // OpenStreetMap Standard
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    maxNativeZoom: 19,
    description: 'Community-maintained map data',
  },

  // === SATELLITE STYLES ===

  // Google Satellite - High quality aerial
  satellite: {
    name: 'Satellite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 21,
    maxNativeZoom: 21,
    description: 'Aerial/satellite imagery',
  },

  // Google Hybrid - Satellite with labels
  hybrid: {
    name: 'Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 21,
    maxNativeZoom: 21,
    description: 'Satellite with street labels',
  },

  // === DARK STYLES (for evening viewing) ===

  // Carto Dark Matter - Dark theme
  dark: resolveKeyedLayer({
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    description: 'Dark theme for night viewing',
  }, { provider: 'carto', role: 'dark' }),

  // Stadia Alidade Smooth Dark
  smoothDark: resolveKeyedLayer({
    name: 'Dark Modern',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    description: 'Modern dark theme',
  }, { provider: 'stadia', role: 'dark' }),
};

/**
 * Default map style for real estate - Google Maps street view (Zillow-style)
 */
export const DEFAULT_MAP_STYLE = 'street';

/**
 * Map style categories for UI grouping
 */
export const MAP_STYLE_CATEGORIES = {
  recommended: ['positron', 'voyager'],
  standard: ['street', 'osm'],
  satellite: ['satellite', 'hybrid'],
  dark: ['dark', 'smoothDark'],
};

/**
 * Quick toggle options (shown in main UI)
 */
export const QUICK_TOGGLE_STYLES = ['positron', 'street', 'satellite'];

/**
 * Get tile layer config by key
 */
export function getTileLayer(key: string): MapTileLayer {
  return MAP_TILE_LAYERS[key] || MAP_TILE_LAYERS[DEFAULT_MAP_STYLE];
}

export default MAP_TILE_LAYERS;
