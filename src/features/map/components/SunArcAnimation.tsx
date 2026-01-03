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

// Color presets for different sun altitudes - cached objects
const SUN_COLORS = {
  veryLow: { body: '#FF5722', glow: 'rgba(255,87,34,0.6)', rays: 'rgba(255,100,50,0.8)' },
  low: { body: '#FF9800', glow: 'rgba(255,152,0,0.5)', rays: 'rgba(255,180,50,0.7)' },
  medium: { body: '#FFC107', glow: 'rgba(255,193,7,0.4)', rays: 'rgba(255,210,80,0.6)' },
  high: { body: '#FFEB3B', glow: 'rgba(255,235,59,0.35)', rays: 'rgba(255,245,120,0.5)' },
} as const;

/**
 * Get sun color based on altitude
 */
const getSunColor = (altitude: number) => {
  if (altitude < 5) return SUN_COLORS.veryLow;
  if (altitude < 15) return SUN_COLORS.low;
  if (altitude < 30) return SUN_COLORS.medium;
  return SUN_COLORS.high;
};

/**
 * Sun rays component - memoized to prevent re-renders
 */
const SunRays = memo(({ colors, isGoldenHour }: { colors: typeof SUN_COLORS.high; isGoldenHour: boolean }) => (
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
            {/* Outer glow */}
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
              }}
            />

            {/* Rotating rays */}
            <SunRays colors={celestialBody.colors} isGoldenHour={celestialBody.isGoldenHour} />

            {/* Sun body */}
            <div
              className="relative rounded-full"
              style={{
                width: '44px',
                height: '44px',
                background: `radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${celestialBody.colors.body} 40%, ${celestialBody.colors.body}cc 100%)`,
                boxShadow: `0 0 30px ${celestialBody.colors.glow}, 0 0 60px ${celestialBody.colors.glow}`,
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
            transition: 'left 5s linear, top 5s linear',
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
          }}
        />
      )}
    </>
  );
};

export default memo(SunArcAnimation);
