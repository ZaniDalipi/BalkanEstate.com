// Map3DBuildings Constants and Utilities
// Extracted from Map3DBuildings.tsx for modularity

import type { TimePeriod } from '../hooks/useShadowTimelapse';

/**
 * Props for Map3DBuildings component
 */
export interface Map3DBuildingsProps {
  lat: number;
  lng: number;
  address?: string;
  title?: string;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  height?: string;
  enableShadowTimelapse?: boolean;
  onNavigateToMap?: () => void;
  // Floor highlighting for apartments
  floorNumber?: number;
  totalFloors?: number;
  propertyType?: 'house' | 'apartment' | 'villa' | 'luxury-villa' | 'land' | 'other';
  // 360 Virtual Tour
  virtualTour360Url?: string;
  // Building facing direction (user-defined)
  orientation?: string;
}

/**
 * Lighting configuration for a single time period
 */
export interface TimeLighting {
  sunAzimuth: number;
  sunAltitude: number;
  ambientIntensity: number;
  directionalIntensity: number;
  buildingColor: string;
  buildingHighlight: string;
  skyColor: string;
  fogColor: string;
}

/**
 * Lighting configurations for different time periods
 */
export const TIME_LIGHTING: Record<TimePeriod, TimeLighting> = {
  night: {
    sunAzimuth: 0,
    sunAltitude: -30,
    ambientIntensity: 0.3,
    directionalIntensity: 0.1,
    buildingColor: '#1a2030',
    buildingHighlight: '#2a3040',
    skyColor: '#0a0a1a',
    fogColor: '#0a0a1a',
  },
  dawn: {
    sunAzimuth: 90,
    sunAltitude: 5,
    ambientIntensity: 0.5,
    directionalIntensity: 0.6,
    buildingColor: '#8a7a6a',
    buildingHighlight: '#9a8a7a',
    skyColor: '#ffaa77',
    fogColor: '#ffd4aa',
  },
  morning: {
    sunAzimuth: 120,
    sunAltitude: 30,
    ambientIntensity: 0.7,
    directionalIntensity: 0.8,
    buildingColor: '#a0a0a0',
    buildingHighlight: '#b8b8b8',
    skyColor: '#87ceeb',
    fogColor: '#e8f4fc',
  },
  noon: {
    sunAzimuth: 180,
    sunAltitude: 70,
    ambientIntensity: 0.9,
    directionalIntensity: 1.0,
    buildingColor: '#b0b0b0',
    buildingHighlight: '#d0d0d0',
    skyColor: '#4a90d9',
    fogColor: '#e0f0ff',
  },
  afternoon: {
    sunAzimuth: 240,
    sunAltitude: 45,
    ambientIntensity: 0.8,
    directionalIntensity: 0.85,
    buildingColor: '#a8a090',
    buildingHighlight: '#c0b8a8',
    skyColor: '#6ba3d9',
    fogColor: '#f0e8d8',
  },
  sunset: {
    sunAzimuth: 270,
    sunAltitude: 10,
    ambientIntensity: 0.5,
    directionalIntensity: 0.7,
    buildingColor: '#907060',
    buildingHighlight: '#a08070',
    skyColor: '#ff7744',
    fogColor: '#ffccaa',
  },
  dusk: {
    sunAzimuth: 280,
    sunAltitude: -5,
    ambientIntensity: 0.35,
    directionalIntensity: 0.3,
    buildingColor: '#504858',
    buildingHighlight: '#605868',
    skyColor: '#443366',
    fogColor: '#554477',
  },
};

export const PERIOD_ICONS: Record<TimePeriod, string> = {
  night: '\u{1F319}',
  dawn: '\u{1F305}',
  morning: '\u{1F324}\uFE0F',
  noon: '\u2600\uFE0F',
  afternoon: '\u{1F324}\uFE0F',
  sunset: '\u{1F307}',
  dusk: '\u{1F306}',
};

/**
 * Calculate sun position (azimuth and altitude) for a given time, latitude, and day
 * Uses standard astronomical formulas for solar position
 *
 * @param hour - Decimal hour (e.g., 14.5 = 2:30 PM)
 * @param latitude - Location latitude in degrees
 * @param dayOfYear - Day of year (1-365)
 * @returns { azimuth, altitude } in degrees. Azimuth: 0=North, 90=East, 180=South, 270=West
 */
export const calculateSunPosition = (
  hour: number,
  latitude: number,
  dayOfYear: number
): { azimuth: number; altitude: number } => {
  const DEG_TO_RAD = Math.PI / 180;
  const RAD_TO_DEG = 180 / Math.PI;

  // Solar declination (angle of sun relative to equator)
  const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));

  // Hour angle: 15 degrees per hour from solar noon, negative in morning
  const hourAngle = (hour - 12) * 15;

  const latRad = latitude * DEG_TO_RAD;
  const decRad = declination * DEG_TO_RAD;
  const haRad = hourAngle * DEG_TO_RAD;

  // Solar altitude (elevation above horizon)
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) +
                 Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD_TO_DEG;

  // Solar azimuth
  const cosAltRad = Math.cos(altitude * DEG_TO_RAD);
  if (cosAltRad === 0) {
    return { azimuth: 180, altitude };
  }

  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
                (Math.cos(latRad) * cosAltRad);
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD_TO_DEG;

  // Afternoon: sun is in the west (azimuth > 180)
  if (hourAngle > 0) {
    azimuth = 360 - azimuth;
  }

  return { azimuth, altitude };
};

/**
 * Get current day of year
 */
export const getCurrentDayOfYear = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
};

/**
 * Calculate shadow polygon for a building based on sun position
 * @param buildingCoords - The building footprint coordinates [lng, lat][]
 * @param height - Building height in meters
 * @param sunAzimuth - Sun azimuth angle in degrees (0 = North, clockwise)
 * @param sunAltitude - Sun altitude angle in degrees above horizon
 * @param latitude - Location latitude for accurate longitude scaling
 * @returns Shadow polygon coordinates
 */
export const calculateBuildingShadow = (
  buildingCoords: number[][],
  height: number,
  sunAzimuth: number,
  sunAltitude: number,
  latitude: number = 42
): number[][] => {
  // If sun is below horizon, no shadow
  if (sunAltitude <= 0) return [];

  // Convert angles to radians
  const azimuthRad = ((sunAzimuth + 180) * Math.PI) / 180; // Shadow direction is opposite to sun
  const altitudeRad = (sunAltitude * Math.PI) / 180;

  // Calculate shadow length factor based on sun altitude
  const shadowLength = height / Math.tan(altitudeRad);

  // Convert shadow length to degrees with latitude correction
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(latitude * Math.PI / 180);
  const shadowOffsetLat = (shadowLength * Math.cos(azimuthRad)) / metersPerDegreeLat;
  const shadowOffsetLng = (shadowLength * Math.sin(azimuthRad)) / metersPerDegreeLng;

  // Create shadow polygon by extending building footprint in shadow direction
  const shadowPolygon: number[][] = [];

  // Add original building footprint points
  buildingCoords.forEach(coord => {
    shadowPolygon.push([coord[0], coord[1]]);
  });

  // Add shadow-extended points in reverse order to create proper polygon
  for (let i = buildingCoords.length - 1; i >= 0; i--) {
    shadowPolygon.push([
      buildingCoords[i][0] + shadowOffsetLng,
      buildingCoords[i][1] + shadowOffsetLat
    ]);
  }

  return shadowPolygon;
};
