// SunArcAnimation Component
// Displays an animated sun/moon following natural astronomical path across the map
// Path varies by season - higher arc in summer, lower in winter

import React, { useMemo, useEffect, useState } from 'react';

interface SunArcAnimationProps {
  hour: number;
  enabled: boolean;
  isNightMode: boolean;
  longitude?: number;
  latitude?: number;
  useRealTime?: boolean;
}

/**
 * Calculate the day of year (1-365/366)
 */
const getDayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

/**
 * Calculate solar declination angle in degrees
 * Ranges from -23.45° (winter solstice) to +23.45° (summer solstice)
 */
const getSolarDeclination = (dayOfYear: number): number => {
  return 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
};

/**
 * Calculate sunrise and sunset hours based on latitude and day of year
 */
const calculateSunriseSunset = (latitude: number, dayOfYear: number): { sunrise: number; sunset: number } => {
  const declination = getSolarDeclination(dayOfYear);
  const latRad = latitude * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);

  const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);

  if (cosHourAngle < -1) return { sunrise: 0, sunset: 24 };
  if (cosHourAngle > 1) return { sunrise: 12, sunset: 12 };

  const hourAngle = Math.acos(cosHourAngle) * (180 / Math.PI);
  const daylightHours = (2 * hourAngle) / 15;

  return {
    sunrise: 12 - (daylightHours / 2),
    sunset: 12 + (daylightHours / 2)
  };
};

/**
 * Calculate the maximum sun altitude for the day based on latitude and declination
 */
const getMaxSunAltitude = (latitude: number, dayOfYear: number): number => {
  const declination = getSolarDeclination(dayOfYear);
  // Maximum altitude = 90 - |latitude - declination|
  return 90 - Math.abs(latitude - declination);
};

/**
 * Calculate local solar time based on longitude
 */
const calculateLocalSolarTime = (longitude: number): number => {
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const solarOffset = longitude / 15;

  let localSolarTime = utcHours + solarOffset;
  while (localSolarTime < 0) localSolarTime += 24;
  while (localSolarTime >= 24) localSolarTime -= 24;

  return localSolarTime;
};

/**
 * Get sun color based on altitude (atmospheric effects)
 */
const getSunColor = (altitude: number): { body: string; glow: string; rays: string } => {
  if (altitude < 5) {
    // Very low - deep orange/red (sunrise/sunset)
    return { body: '#FF5722', glow: 'rgba(255,87,34,0.6)', rays: 'rgba(255,100,50,0.8)' };
  } else if (altitude < 15) {
    // Low - orange (golden hour)
    return { body: '#FF9800', glow: 'rgba(255,152,0,0.5)', rays: 'rgba(255,180,50,0.7)' };
  } else if (altitude < 30) {
    // Medium - yellow-orange
    return { body: '#FFC107', glow: 'rgba(255,193,7,0.4)', rays: 'rgba(255,210,80,0.6)' };
  } else {
    // High - bright yellow
    return { body: '#FFEB3B', glow: 'rgba(255,235,59,0.35)', rays: 'rgba(255,245,120,0.5)' };
  }
};

/**
 * SunArcAnimation Component
 *
 * Natural sun path across the sky:
 * - Rises from the RIGHT (East)
 * - Arcs across the TOP of the map
 * - Sets on the LEFT (West)
 * - Arc height varies by season (higher in summer, lower in winter)
 */
const SunArcAnimation: React.FC<SunArcAnimationProps> = ({
  hour,
  enabled,
  isNightMode,
  longitude = 23,
  latitude = 40,
  useRealTime = true,
}) => {
  const [realTimeHour, setRealTimeHour] = useState<number>(() =>
    calculateLocalSolarTime(longitude)
  );
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Update time - every 5 seconds for smooth movement
  useEffect(() => {
    if (!useRealTime || !enabled) return;

    const updateTime = () => {
      setRealTimeHour(calculateLocalSolarTime(longitude));
      setCurrentDate(new Date());
    };

    updateTime();
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, [longitude, useRealTime, enabled]);

  const effectiveHour = useRealTime ? realTimeHour : hour;
  const dayOfYear = getDayOfYear(currentDate);

  // Calculate sun/moon position with natural arc
  const celestialBody = useMemo(() => {
    const { sunrise, sunset } = calculateSunriseSunset(latitude, dayOfYear);
    const maxAltitude = getMaxSunAltitude(latitude, dayOfYear);
    const daylightHours = sunset - sunrise;
    const nightHours = 24 - daylightHours;

    const isDay = effectiveHour >= sunrise && effectiveHour < sunset;

    if (isDay) {
      // Daytime sun position
      const dayProgress = (effectiveHour - sunrise) / daylightHours;

      // X position: 95% (East/right edge) at sunrise → 5% (West/left edge) at sunset
      // Using 95% to 5% so the sun is fully visible at the edges
      const x = 95 - (dayProgress * 90);

      // Y position: Use sine curve for natural arc centered in middle of screen
      // The arc height depends on the season (maxAltitude)
      const arcHeight = (maxAltitude / 90) * 40; // Map altitude to arc height (max 40% of screen)
      const altitudeProgress = Math.sin(dayProgress * Math.PI);

      // Y: 50% is center, arc goes from bottom-center to top-center and back
      // At sunrise/sunset: y = 50% (center), at noon: y = 50% - arcHeight (higher)
      const y = 50 - (altitudeProgress * arcHeight) + 10; // +10 to shift slightly down

      // Current altitude for color calculation
      const currentAltitude = altitudeProgress * maxAltitude;
      const colors = getSunColor(currentAltitude);

      // Sun appears larger near horizon
      const scale = currentAltitude < 15 ? 1.2 : 1.0;

      return {
        x,
        y,
        isSun: true,
        altitude: currentAltitude,
        colors,
        scale,
        isGoldenHour: currentAltitude < 15,
        dayProgress,
      };
    } else {
      // Nighttime moon position
      let nightProgress: number;
      if (effectiveHour >= sunset) {
        nightProgress = (effectiveHour - sunset) / nightHours;
      } else {
        nightProgress = (effectiveHour + (24 - sunset)) / nightHours;
      }

      // Moon also goes East to West edge to edge, but lower arc
      const x = 95 - (nightProgress * 90);
      const arcHeight = 25; // Moon has gentler arc
      // Moon arc centered but lower than sun
      const y = 55 - (Math.sin(nightProgress * Math.PI) * arcHeight);

      return {
        x,
        y,
        isSun: false,
        altitude: 20,
        colors: null,
        scale: 0.9,
        isGoldenHour: false,
        dayProgress: 0,
      };
    }
  }, [effectiveHour, latitude, dayOfYear]);

  // Early return AFTER all hooks
  if (!enabled) return null;

  return (
    <>
      {/* Sun/Moon */}
      <div
        className="absolute pointer-events-none z-[401]"
        style={{
          left: `${celestialBody.x}%`,
          top: `${celestialBody.y}%`,
          transform: `translate(-50%, -50%) scale(${celestialBody.scale})`,
          transition: 'left 2s ease-out, top 2s ease-out, transform 1s ease-out',
        }}
      >
        {celestialBody.isSun && celestialBody.colors ? (
          // Sun
          <div className="relative">
            {/* Outer glow */}
            <div
              className="absolute rounded-full animate-pulse"
              style={{
                width: celestialBody.isGoldenHour ? '100px' : '80px',
                height: celestialBody.isGoldenHour ? '100px' : '80px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${celestialBody.colors.glow} 0%, transparent 70%)`,
              }}
            />

            {/* Rotating rays */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '60s' }}>
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    width: '3px',
                    height: celestialBody.isGoldenHour ? '30px' : '22px',
                    left: '50%',
                    top: '50%',
                    background: `linear-gradient(to top, ${celestialBody.colors?.rays} 0%, transparent 100%)`,
                    transform: `translate(-50%, -100%) rotate(${i * 30}deg)`,
                    transformOrigin: 'center bottom',
                  }}
                />
              ))}
            </div>

            {/* Sun body */}
            <div
              className="relative rounded-full"
              style={{
                width: '44px',
                height: '44px',
                background: `radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${celestialBody.colors.body} 40%, ${celestialBody.colors.body}cc 100%)`,
                boxShadow: `
                  0 0 30px ${celestialBody.colors.glow},
                  0 0 60px ${celestialBody.colors.glow},
                  inset 0 0 15px rgba(255,255,255,0.4)
                `,
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
          // Moon
          <div className="relative">
            {/* Moon glow */}
            <div
              className="absolute rounded-full animate-pulse"
              style={{
                width: '60px',
                height: '60px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(200,220,255,0.35) 0%, transparent 70%)',
                animationDuration: '4s',
              }}
            />

            {/* Moon body */}
            <div
              className="relative rounded-full"
              style={{
                width: '32px',
                height: '32px',
                background: 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F0F4FF 35%, #E2E8F0 65%, #CBD5E1 100%)',
                boxShadow: '0 0 20px rgba(200,220,255,0.5), inset -4px -4px 10px rgba(100,120,150,0.2)',
              }}
            >
              {/* Craters */}
              <div className="absolute rounded-full opacity-25" style={{ width: '7px', height: '7px', background: '#94A3B8', top: '6px', left: '6px' }} />
              <div className="absolute rounded-full opacity-20" style={{ width: '5px', height: '5px', background: '#94A3B8', top: '16px', left: '14px' }} />
              <div className="absolute rounded-full opacity-15" style={{ width: '4px', height: '4px', background: '#94A3B8', top: '10px', left: '20px' }} />
            </div>
          </div>
        )}
      </div>

      {/* Light beam from sun */}
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
            transition: 'left 2s ease-out, top 2s ease-out',
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

export default SunArcAnimation;
