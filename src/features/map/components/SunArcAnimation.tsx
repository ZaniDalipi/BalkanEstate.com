// SunArcAnimation Component
// Displays an animated sun/moon following natural astronomical path across the map
// Optimized for performance with memoization and GPU-accelerated animations

import React, { useMemo, useEffect, useState, memo } from 'react';

// Season types
export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'current';

// Map seasons to representative day of year
const SEASON_DAY_OF_YEAR: Record<Exclude<Season, 'current'>, number> = {
  spring: 80,   // March 21 - Spring equinox
  summer: 172,  // June 21 - Summer solstice (longest day)
  autumn: 266,  // September 23 - Autumn equinox
  winter: 355,  // December 21 - Winter solstice (shortest day)
};

// Export sunrise/sunset info type
export interface SunriseSunsetInfo {
  sunrise: number;
  sunset: number;
  isDay: boolean;
  dayOfYear: number;
}

interface SunArcAnimationProps {
  hour: number;
  enabled: boolean;
  isNightMode: boolean;
  longitude?: number;
  latitude?: number;
  useRealTime?: boolean;
  season?: Season;
  onDayNightChange?: (isDay: boolean, sunInfo: SunriseSunsetInfo) => void;
}

// Pre-calculated constants for performance
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const SOLAR_DECLINATION_FACTOR = 2 * Math.PI / 365;
const MS_PER_DAY = 86400000;

// Static ray angles - calculated once
const SUN_RAY_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

/**
 * Calculate the day of year (1-365/366)
 */
const getDayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / MS_PER_DAY);
};

/**
 * Get day of year for a season
 */
export const getSeasonDayOfYear = (season: Season): number => {
  if (season === 'current') {
    return getDayOfYear(new Date());
  }
  return SEASON_DAY_OF_YEAR[season];
};

/**
 * Calculate solar declination angle in degrees
 */
const getSolarDeclination = (dayOfYear: number): number => {
  return 23.45 * Math.sin(SOLAR_DECLINATION_FACTOR * (dayOfYear - 81));
};

/**
 * Calculate sunrise and sunset hours based on latitude and day of year
 * Exported for use in other components
 */
export const calculateSunriseSunset = (latitude: number, dayOfYear: number): { sunrise: number; sunset: number } => {
  const declination = getSolarDeclination(dayOfYear);
  const latRad = latitude * DEG_TO_RAD;
  const decRad = declination * DEG_TO_RAD;
  const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);

  // Handle polar day/night
  if (cosHourAngle < -1) return { sunrise: 0, sunset: 24 };
  if (cosHourAngle > 1) return { sunrise: 12, sunset: 12 };

  const daylightHours = (2 * Math.acos(cosHourAngle) * RAD_TO_DEG) / 15;
  return {
    sunrise: 12 - (daylightHours / 2),
    sunset: 12 + (daylightHours / 2)
  };
};

/**
 * Calculate the maximum sun altitude for the day
 */
const getMaxSunAltitude = (latitude: number, dayOfYear: number): number => {
  return 90 - Math.abs(latitude - getSolarDeclination(dayOfYear));
};

/**
 * Calculate local solar time based on longitude
 */
const calculateLocalSolarTime = (longitude: number): number => {
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  let localSolarTime = utcHours + (longitude / 15);

  // Normalize to 0-24 range
  return ((localSolarTime % 24) + 24) % 24;
};

// Simple color presets for sun at different altitudes
const SUN_COLORS = {
  veryLow: { body: '#FF5722', glow: 'rgba(255,87,34,0.6)', rays: 'rgba(255,100,50,0.8)' },
  low: { body: '#FF9800', glow: 'rgba(255,152,0,0.5)', rays: 'rgba(255,180,50,0.7)' },
  medium: { body: '#FFC107', glow: 'rgba(255,193,7,0.4)', rays: 'rgba(255,210,80,0.6)' },
  high: { body: '#FFEB3B', glow: 'rgba(255,235,59,0.35)', rays: 'rgba(255,245,120,0.5)' },
};

// Type for sun colors - flexible to accept any color preset
type SunColorType = { body: string; glow: string; rays: string };

/**
 * Get sun color based on altitude - simple discrete buckets
 */
const getSunColor = (altitude: number): SunColorType => {
  if (altitude < 5) return SUN_COLORS.veryLow;
  if (altitude < 15) return SUN_COLORS.low;
  if (altitude < 30) return SUN_COLORS.medium;
  return SUN_COLORS.high;
};

/**
 * Sun rays component - memoized to prevent re-renders
 */
const SunRays = memo(({ colors, isGoldenHour }: { colors: SunColorType; isGoldenHour: boolean }) => (
  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '60s' }}>
    {SUN_RAY_ANGLES.map((angle) => (
      <div
        key={angle}
        className="absolute"
        style={{
          width: '2px',
          height: isGoldenHour ? '18px' : '14px',
          left: '50%',
          top: '50%',
          background: `linear-gradient(to top, ${colors.rays} 0%, transparent 100%)`,
          transform: `translate(-50%, -100%) rotate(${angle}deg)`,
          transformOrigin: 'center bottom',
        }}
      />
    ))}
  </div>
));
SunRays.displayName = 'SunRays';

/**
 * Moon craters - static component
 */
const MoonCraters = memo(() => (
  <>
    <div className="absolute rounded-full opacity-25" style={{ width: '7px', height: '7px', background: '#94A3B8', top: '6px', left: '6px' }} />
    <div className="absolute rounded-full opacity-20" style={{ width: '5px', height: '5px', background: '#94A3B8', top: '16px', left: '14px' }} />
    <div className="absolute rounded-full opacity-15" style={{ width: '4px', height: '4px', background: '#94A3B8', top: '10px', left: '20px' }} />
  </>
));
MoonCraters.displayName = 'MoonCraters';

/**
 * SunArcAnimation Component
 *
 * Optimized for performance:
 * - Uses GPU-accelerated transforms via will-change
 * - Memoizes calculations and sub-components
 * - Minimal re-renders through careful state management
 */
const SunArcAnimation: React.FC<SunArcAnimationProps> = ({
  hour,
  enabled,
  isNightMode,
  longitude = 23,
  latitude = 40,
  useRealTime = true,
  season = 'current',
  onDayNightChange,
}) => {
  const [simulatedHour, setSimulatedHour] = useState<number>(() =>
    calculateLocalSolarTime(longitude)
  );

  // Get day of year based on season selection
  const dayOfYear = useMemo(() => {
    if (season === 'current') {
      return getDayOfYear(new Date());
    }
    return SEASON_DAY_OF_YEAR[season];
  }, [season]);

  // Animation effect - updates position periodically
  useEffect(() => {
    if (!enabled) return;

    setSimulatedHour(calculateLocalSolarTime(longitude));

    const interval = setInterval(() => {
      setSimulatedHour(prev => {
        const next = prev + 0.001;
        return next >= 24 ? next - 24 : next;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [longitude, enabled]);

  const effectiveHour = useRealTime ? simulatedHour : hour;

  // Calculate sunrise/sunset for current season
  const sunInfo = useMemo(() => {
    const { sunrise, sunset } = calculateSunriseSunset(latitude, dayOfYear);
    const isDay = effectiveHour >= sunrise && effectiveHour < sunset;
    return { sunrise, sunset, isDay, dayOfYear };
  }, [latitude, dayOfYear, effectiveHour]);

  // Notify parent of day/night changes
  useEffect(() => {
    if (onDayNightChange && enabled) {
      onDayNightChange(sunInfo.isDay, sunInfo);
    }
  }, [sunInfo.isDay, sunInfo, onDayNightChange, enabled]);

  // Calculate celestial body position - memoized
  const celestialBody = useMemo(() => {
    const { sunrise, sunset, isDay } = sunInfo;
    const maxAltitude = getMaxSunAltitude(latitude, dayOfYear);
    const daylightHours = sunset - sunrise;

    if (isDay) {
      const dayProgress = (effectiveHour - sunrise) / daylightHours;
      const x = 100 - (dayProgress * 100);
      const arcHeight = (maxAltitude / 90) * 40;
      const altitudeProgress = Math.sin(dayProgress * Math.PI);
      const y = 50 - (altitudeProgress * arcHeight) + 10;
      const currentAltitude = altitudeProgress * maxAltitude;

      return {
        x,
        y,
        isSun: true,
        colors: getSunColor(currentAltitude),
        scale: currentAltitude < 15 ? 1.2 : 1.0,
        isGoldenHour: currentAltitude < 15,
      };
    }

    // Nighttime moon
    const nightHours = 24 - daylightHours;
    const nightProgress = effectiveHour >= sunset
      ? (effectiveHour - sunset) / nightHours
      : (effectiveHour + (24 - sunset)) / nightHours;

    return {
      x: 95 - (nightProgress * 90),
      y: 55 - (Math.sin(nightProgress * Math.PI) * 25),
      isSun: false,
      colors: null,
      scale: 0.9,
      isGoldenHour: false,
    };
  }, [effectiveHour, latitude, dayOfYear]);

  if (!enabled) return null;

  return (
    <>
      {/* Celestial body container */}
      <div
        className="absolute pointer-events-none z-[401]"
        style={{
          left: `${celestialBody.x}%`,
          top: `${celestialBody.y}%`,
          transform: `translate(-50%, -50%) scale(${celestialBody.scale})`,
          transition: 'left 1s ease-out, top 1s ease-out, transform 0.3s ease-out',
          willChange: 'left, top',
        }}
      >
        {celestialBody.isSun && celestialBody.colors ? (
          <div className="relative">
            {/* Rotating rays - smaller */}
            <SunRays colors={celestialBody.colors} isGoldenHour={celestialBody.isGoldenHour} />

            {/* Sun body - reduced glow */}
            <div
              className="relative rounded-full"
              style={{
                width: '36px',
                height: '36px',
                background: `radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${celestialBody.colors.body} 40%, ${celestialBody.colors.body}cc 100%)`,
                boxShadow: `0 0 12px ${celestialBody.colors.glow}`,
              }}
            />
          </div>
        ) : (
          <div className="relative">
            {/* Moon body - reduced glow */}
            <div
              className="relative rounded-full"
              style={{
                width: '28px',
                height: '28px',
                background: 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F0F4FF 35%, #E2E8F0 65%, #CBD5E1 100%)',
                boxShadow: '0 0 8px rgba(200,220,255,0.4)',
              }}
            >
              <MoonCraters />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default memo(SunArcAnimation);
