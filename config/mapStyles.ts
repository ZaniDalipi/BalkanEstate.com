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
  positron: {
    name: 'Clean Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    description: 'Clean, minimal style - properties stand out',
  },

  // Carto Voyager - Colorful but soft, shows POIs nicely
  // BEST FOR: Neighborhood exploration, shows amenities
  voyager: {
    name: 'Neighborhood',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    description: 'Shows neighborhoods, parks, and amenities clearly',
  },

  // Stadia Alidade Smooth - Modern, subtle coloring
  // BEST FOR: Premium/luxury property viewing
  smooth: {
    name: 'Modern',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    description: 'Modern, smooth appearance',
  },

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
  dark: {
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    description: 'Dark theme for night viewing',
  },

  // Stadia Alidade Smooth Dark
  smoothDark: {
    name: 'Dark Modern',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 20,
    maxNativeZoom: 20,
    description: 'Modern dark theme',
  },
};

/**
 * Default map style for real estate - clean and minimal
 */
export const DEFAULT_MAP_STYLE = 'voyager';

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
