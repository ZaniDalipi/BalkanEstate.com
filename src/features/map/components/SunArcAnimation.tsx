// SunArcAnimation Component
// Displays an animated sun/moon following natural astronomical path across the map
// Optimized for performance with memoization and GPU-accelerated animations

import React, { useMemo, useEffect, useState, memo } from 'react';

interface SunArcAnimationProps {
  hour: number;
  enabled: boolean;
  isNightMode: boolean;
  longitude?: number;
  latitude?: number;
  useRealTime?: boolean;
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
 * Calculate solar declination angle in degrees
 */
const getSolarDeclination = (dayOfYear: number): number => {
  return 23.45 * Math.sin(SOLAR_DECLINATION_FACTOR * (dayOfYear - 81));
};

/**
 * Calculate sunrise and sunset hours based on latitude and day of year
 */
const calculateSunriseSunset = (latitude: number, dayOfYear: number): { sunrise: number; sunset: number } => {
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

// Color stops for smooth gradient transitions at different altitudes
// Format: [altitude, r, g, b, glowOpacity, raysOpacity]
const COLOR_STOPS: [number, number, number, number, number, number][] = [
  [0, 255, 87, 34, 0.6, 0.8],    // Horizon - deep orange/red
  [5, 255, 120, 40, 0.55, 0.75], // Very low
  [10, 255, 152, 0, 0.5, 0.7],   // Low - orange
  [15, 255, 180, 30, 0.45, 0.65],// Golden hour end
  [20, 255, 193, 7, 0.42, 0.6],  // Medium-low
  [25, 255, 210, 50, 0.4, 0.55], // Medium
  [30, 255, 225, 80, 0.38, 0.52],// Medium-high
  [40, 255, 235, 59, 0.36, 0.5], // High
  [90, 255, 245, 120, 0.35, 0.5],// Zenith - bright yellow
];

/**
 * Linearly interpolate between two values
 */
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Get smoothly interpolated sun color based on altitude
 * Creates seamless transitions between color stops
 */
const getSunColor = (altitude: number): { body: string; glow: string; rays: string } => {
  // Clamp altitude to valid range
  const alt = Math.max(0, Math.min(90, altitude));

  // Find the two color stops to interpolate between
  let lowerIdx = 0;
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (COLOR_STOPS[i + 1][0] > alt) {
      lowerIdx = i;
      break;
    }
    lowerIdx = i;
  }

  const upperIdx = Math.min(lowerIdx + 1, COLOR_STOPS.length - 1);
  const lower = COLOR_STOPS[lowerIdx];
  const upper = COLOR_STOPS[upperIdx];

  // Calculate interpolation factor (0-1) between the two stops
  const range = upper[0] - lower[0];
  const t = range > 0 ? (alt - lower[0]) / range : 0;

  // Interpolate RGB values
  const r = Math.round(lerp(lower[1], upper[1], t));
  const g = Math.round(lerp(lower[2], upper[2], t));
  const b = Math.round(lerp(lower[3], upper[3], t));
  const glowOpacity = lerp(lower[4], upper[4], t);
  const raysOpacity = lerp(lower[5], upper[5], t);

  return {
    body: `rgb(${r},${g},${b})`,
    glow: `rgba(${r},${g},${b},${glowOpacity.toFixed(2)})`,
    rays: `rgba(${r},${Math.min(255, g + 30)},${Math.min(255, b + 20)},${raysOpacity.toFixed(2)})`,
  };
};

// Type for interpolated colors
type SunColorType = ReturnType<typeof getSunColor>;

/**
 * Sun rays component - memoized to prevent re-renders
 * Includes smooth color transitions for seamless shade changes
 */
const SunRays = memo(({ colors, isGoldenHour }: { colors: SunColorType; isGoldenHour: boolean }) => (
  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '60s' }}>
    {SUN_RAY_ANGLES.map((angle) => (
      <div
        key={angle}
        className="absolute"
        style={{
          width: '3px',
          height: isGoldenHour ? '30px' : '22px',
          left: '50%',
          top: '50%',
          background: `linear-gradient(to top, ${colors.rays} 0%, transparent 100%)`,
          transform: `translate(-50%, -100%) rotate(${angle}deg)`,
          transformOrigin: 'center bottom',
          transition: 'background 2s ease-out, height 1s ease-out',
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
}) => {
  const [simulatedHour, setSimulatedHour] = useState<number>(() =>
    calculateLocalSolarTime(longitude)
  );
  const [dayOfYear, setDayOfYear] = useState<number>(() => getDayOfYear(new Date()));

  // Animation effect - updates position periodically
  useEffect(() => {
    if (!enabled) return;

    setSimulatedHour(calculateLocalSolarTime(longitude));
    setDayOfYear(getDayOfYear(new Date()));

    const interval = setInterval(() => {
      setSimulatedHour(prev => {
        const next = prev + 0.001;
        return next >= 24 ? next - 24 : next;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [longitude, enabled]);

  const effectiveHour = useRealTime ? simulatedHour : hour;

  // Calculate celestial body position - memoized
  const celestialBody = useMemo(() => {
    const { sunrise, sunset } = calculateSunriseSunset(latitude, dayOfYear);
    const maxAltitude = getMaxSunAltitude(latitude, dayOfYear);
    const daylightHours = sunset - sunrise;
    const isDay = effectiveHour >= sunrise && effectiveHour < sunset;

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
          transition: 'left 5s linear, top 5s linear, transform 0.5s ease-out',
          willChange: 'left, top',
        }}
      >
        {celestialBody.isSun && celestialBody.colors ? (
          <div className="relative">
            {/* Outer glow - smooth color transition */}
            <div
              className="absolute rounded-full"
              style={{
                width: celestialBody.isGoldenHour ? '100px' : '80px',
                height: celestialBody.isGoldenHour ? '100px' : '80px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${celestialBody.colors.glow} 0%, transparent 70%)`,
                animation: 'pulse 3s ease-in-out infinite',
                transition: 'background 2s ease-out, width 1s ease-out, height 1s ease-out',
              }}
            />

            {/* Rotating rays - colors transition smoothly */}
            <SunRays colors={celestialBody.colors} isGoldenHour={celestialBody.isGoldenHour} />

            {/* Sun body - smooth color gradient transition */}
            <div
              className="relative rounded-full"
              style={{
                width: '44px',
                height: '44px',
                background: `radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${celestialBody.colors.body} 40%, ${celestialBody.colors.body}cc 100%)`,
                boxShadow: `0 0 30px ${celestialBody.colors.glow}, 0 0 60px ${celestialBody.colors.glow}`,
                transition: 'background 2s ease-out, box-shadow 2s ease-out',
              }}
            />

            {/* Lens flare during golden hour */}
            {celestialBody.isGoldenHour && (
              <div
                className="absolute"
                style={{
                  width: '150px',
                  height: '4px',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%) rotate(-20deg)',
                  background: `linear-gradient(90deg, transparent 0%, ${celestialBody.colors.rays} 20%, transparent 40%, ${celestialBody.colors.rays} 60%, transparent 80%, ${celestialBody.colors.rays} 100%)`,
                  opacity: 0.6,
                  transition: 'background 2s ease-out, opacity 1s ease-out',
                }}
              />
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Moon glow */}
            <div
              className="absolute rounded-full"
              style={{
                width: '60px',
                height: '60px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(200,220,255,0.35) 0%, transparent 70%)',
                animation: 'pulse 4s ease-in-out infinite',
              }}
            />

            {/* Moon body */}
            <div
              className="relative rounded-full"
              style={{
                width: '32px',
                height: '32px',
                background: 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F0F4FF 35%, #E2E8F0 65%, #CBD5E1 100%)',
                boxShadow: '0 0 20px rgba(200,220,255,0.5)',
              }}
            >
              <MoonCraters />
            </div>
          </div>
        )}
      </div>

      {/* Light beam from sun - only render when visible */}
      {celestialBody.isSun && !isNightMode && celestialBody.colors && (
        <div
          className="absolute pointer-events-none z-[397]"
          style={{
            left: `${celestialBody.x}%`,
            top: `${celestialBody.y}%`,
            width: celestialBody.isGoldenHour ? '250px' : '150px',
            height: '400px',
            transform: 'translate(-50%, 0)',
            background: `linear-gradient(to bottom, ${celestialBody.colors.glow} 0%, transparent 100%)`,
            opacity: 0.3,
            transition: 'left 5s linear, top 5s linear, background 2s ease-out, width 1s ease-out',
            willChange: 'left, top',
          }}
        />
      )}

      {/* Horizon glow during golden hour */}
      {celestialBody.isSun && celestialBody.isGoldenHour && !isNightMode && celestialBody.colors && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-[396]"
          style={{
            height: '25%',
            background: `linear-gradient(to top, ${celestialBody.colors.glow.replace('0.', '0.2')} 0%, transparent 100%)`,
            transition: 'background 2s ease-out',
          }}
        />
      )}
    </>
  );
};

export default memo(SunArcAnimation);
