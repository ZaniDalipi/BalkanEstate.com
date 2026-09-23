// Map3DBuildings Constants and Utilities
// Extracted from Map3DBuildings.tsx for modularity

import type { TimePeriod } from '../hooks/useShadowTimelapse';
import type { MapDestination } from '@/shared/map/mapDestination';

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
  /** Fixed pixel/CSS height applied via inline style. Ignored when `heightClassName` is set. */
  height?: string;
  /** Responsive Tailwind height classes (e.g. "h-[420px] sm:h-[520px] lg:h-[650px]"). Takes precedence over `height`. */
  heightClassName?: string;
  enableShadowTimelapse?: boolean;
  onNavigateToMap?: () => void;
  /**
   * Which full map `onNavigateToMap` opens (villas / rentals / buy). Supplied
   * by the caller that owns the navigation, so the button can name and colour
   * the destination it actually leads to. Omitted → neutral "Full Map".
   */
  mapDestination?: MapDestination;
  // Floor highlighting for apartments
  floorNumber?: number;
  totalFloors?: number;
  propertyType?: 'house' | 'apartment' | 'villa' | 'luxury-villa' | 'commercial' | 'parking' | 'land' | 'other';
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
