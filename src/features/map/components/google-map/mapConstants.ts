/**
 * Google Map Constants
 * Shared configuration values for the map component
 */

// Property type colors for markers
export const PROPERTY_TYPE_COLORS: Record<string, string> = {
  house: '#0252CD',
  apartment: '#28a745',
  villa: '#6f42c1',
  land: '#8B4513',
  other: '#6c757d',
};

// Promotion tier colors
export const PROMOTION_TIER_COLORS: Record<string, string> = {
  premium: '#FFB800',
  highlight: '#0EA5E9',
  featured: '#7C3AED',
  standard: '#9ca3af',
};

// Balkan region bounds
export const BALKAN_BOUNDS = {
  north: 49,
  south: 34,
  east: 31,
  west: 13,
};

// Default center (Balkans)
export const DEFAULT_CENTER = { lat: 41.5, lng: 22 };
export const DEFAULT_ZOOM = 7;

// Map style types
export type MapStyleType = 'clean' | 'color' | 'street' | 'satellite' | 'hybrid';

// Climate risk types
export type ClimateRiskType = 'none' | 'flood' | 'fire' | 'wind' | 'air' | 'heat';

// Map container styles
export const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Map styles for clean look (properties stand out)
export const cleanMapStyles: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9d7e8' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
];

// Color/Voyager style (shows neighborhoods)
export const colorMapStyles: google.maps.MapTypeStyle[] = [
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#c8e6c9' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b3d9ff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#ffeb99' }] },
];

/**
 * Format price for marker display (short format)
 */
export const formatMarkerPrice = (price: number): string => {
  if (price >= 1000000) {
    const millions = price / 1000000;
    if (millions >= 10) {
      return `€${Math.round(millions)}M`;
    }
    return `€${millions.toFixed(1).replace('.0', '')}M`;
  }
  if (price >= 1000) {
    return `€${Math.round(price / 1000)}K`;
  }
  return `€${price}`;
};

/**
 * Convert lat/lng to Web Mercator (EPSG:3857) for WMS requests
 */
export const latLngToWebMercator = (lat: number, lng: number): { x: number; y: number } => {
  const earthRadius = 6378137; // Earth's radius in meters
  const x = lng * (Math.PI / 180) * earthRadius;
  const y = Math.log(Math.tan((90 + lat) * (Math.PI / 360))) * earthRadius;
  return { x, y };
};
