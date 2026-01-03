// SunArcAnimation Component
// Displays an animated sun/moon that moves across the map based on time of day
// Uses accurate astronomical calculations for realistic sun position

import React, { useMemo, useEffect, useState } from 'react';

interface SunArcAnimationProps {
  hour: number; // 0-23 (can be overridden by manual control)
  enabled: boolean;
  isNightMode: boolean;
  longitude?: number; // Map center longitude for local solar time calculation
  latitude?: number; // Map center latitude for seasonal calculations
  useRealTime?: boolean; // If true, use current real time adjusted for location
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
 * This determines how high the sun can get in the sky
 * Ranges from -23.45° (winter solstice) to +23.45° (summer solstice)
 */
const getSolarDeclination = (dayOfYear: number): number => {
  // Solar declination formula (approximation)
  return 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
};

/**
 * Calculate sunrise and sunset hours based on latitude and day of year
 * Returns hours in decimal (e.g., 6.5 = 6:30 AM)
 */
const calculateSunriseSunset = (latitude: number, dayOfYear: number): { sunrise: number; sunset: number } => {
  const declination = getSolarDeclination(dayOfYear);
  const latRad = latitude * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);

  // Hour angle at sunrise/sunset
  const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);

  // Handle polar day/night
  if (cosHourAngle < -1) {
    // Midnight sun - sun never sets
    return { sunrise: 0, sunset: 24 };
  } else if (cosHourAngle > 1) {
    // Polar night - sun never rises
    return { sunrise: 12, sunset: 12 };
  }

  const hourAngle = Math.acos(cosHourAngle) * (180 / Math.PI);
  const daylightHours = (2 * hourAngle) / 15;

  // Solar noon is at 12:00 local solar time
  const sunrise = 12 - (daylightHours / 2);
  const sunset = 12 + (daylightHours / 2);

  return { sunrise, sunset };
};

/**
 * Calculate the sun's altitude angle (height in sky) at a given time
 * Returns 0 at sunrise/sunset, maximum at solar noon
 */
const getSunAltitude = (hour: number, latitude: number, dayOfYear: number): number => {
  const declination = getSolarDeclination(dayOfYear);
  const latRad = latitude * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);

  // Hour angle (15° per hour from solar noon)
  const hourAngle = (hour - 12) * 15 * (Math.PI / 180);

  // Solar altitude formula
  const sinAltitude = Math.sin(latRad) * Math.sin(decRad) +
                      Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourAngle);

  return Math.asin(Math.max(-1, Math.min(1, sinAltitude))) * (180 / Math.PI);
};

/**
 * Calculate local solar time based on longitude
 * Solar noon occurs when the sun is at its highest point
 */
const calculateLocalSolarTime = (longitude: number): number => {
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

  // Solar time offset: longitude / 15 gives hours offset from UTC
  const solarOffset = longitude / 15;

  let localSolarTime = utcHours + solarOffset;

  // Normalize to 0-24 range
  while (localSolarTime < 0) localSolarTime += 24;
  while (localSolarTime >= 24) localSolarTime -= 24;

  return localSolarTime;
};

/**
 * Calculate sun color based on altitude (atmospheric effects)
 * Lower sun = more orange/red, higher sun = more yellow/white
 */
const getSunColor = (altitude: number): { body: string; glow: string; rays: string } => {
  if (altitude < 0) {
    // Below horizon - shouldn't happen but safety
    return { body: '#FF6B35', glow: 'rgba(255,80,30,0.4)', rays: 'rgba(255,100,50,0.6)' };
  } else if (altitude < 10) {
    // Golden hour - deep orange/red
    return { body: '#FF7043', glow: 'rgba(255,100,50,0.5)', rays: 'rgba(255,120,60,0.7)' };
  } else if (altitude < 20) {
    // Morning/evening - orange
    return { body: '#FF9800', glow: 'rgba(255,150,0,0.45)', rays: 'rgba(255,180,50,0.65)' };
  } else if (altitude < 40) {
    // Mid-morning/afternoon - yellow-orange
    return { body: '#FFB300', glow: 'rgba(255,180,0,0.4)', rays: 'rgba(255,200,50,0.6)' };
  } else {
    // Midday - bright yellow
    return { body: '#FFD54F', glow: 'rgba(255,220,100,0.35)', rays: 'rgba(255,230,100,0.55)' };
  }
};

/**
 * Calculate apparent sun size based on altitude
 * Sun appears larger near horizon due to atmospheric magnification illusion
 */
const getSunScale = (altitude: number): number => {
  if (altitude < 5) return 1.25; // Near horizon - appears larger
  if (altitude < 15) return 1.15;
  if (altitude < 30) return 1.05;
  return 1.0; // High in sky - normal size
};

/**
 * Easing function for smoother position transitions
 */
const easeInOutSine = (t: number): number => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

/**
 * SunArcAnimation Component
 *
 * Shows an animated sun/moon traveling across the sky in an accurate arc
 * - Sun rises from RIGHT (East) in morning
 * - Peaks at top (South) at solar noon
 * - Sets on LEFT (West) in evening
 * - Moon follows East to West path at night
 * - Arc height and timing vary with season and latitude
 *
 * Map orientation: North is UP, East is RIGHT, West is LEFT
 */
const SunArcAnimation: React.FC<SunArcAnimationProps> = ({
  hour,
  enabled,
  isNightMode,
  longitude = 23, // Default to Greece/Balkans longitude
  latitude = 40, // Default to Greece/Balkans latitude (around Thessaloniki)
  useRealTime = true,
}) => {
  // Track real-time updates
  const [realTimeHour, setRealTimeHour] = useState<number>(() =>
    calculateLocalSolarTime(longitude)
  );
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Update real time every 30 seconds for smoother movement
  useEffect(() => {
    if (!useRealTime || !enabled) return;

    const updateTime = () => {
      setRealTimeHour(calculateLocalSolarTime(longitude));
      setCurrentDate(new Date());
    };

    updateTime();
    const interval = setInterval(updateTime, 30000); // Update every 30s for smoother animation

    return () => clearInterval(interval);
  }, [longitude, useRealTime, enabled]);

  const effectiveHour = useRealTime ? realTimeHour : hour;
  const dayOfYear = getDayOfYear(currentDate);

  // Calculate sun/moon position with seasonal accuracy
  const celestialBody = useMemo(() => {
    const { sunrise, sunset } = calculateSunriseSunset(latitude, dayOfYear);
    const isDay = effectiveHour >= sunrise && effectiveHour < sunset;
    const daylightHours = sunset - sunrise;
    const nightHours = 24 - daylightHours;

    if (isDay) {
      // Calculate day progress (0 to 1)
      const dayProgress = (effectiveHour - sunrise) / daylightHours;
      const easedProgress = easeInOutSine(dayProgress);

      // X position: 92% at sunrise (east/right), 8% at sunset (west/left)
      const x = 92 - (easedProgress * 84);

      // Calculate actual solar altitude for accurate Y position
      const altitude = getSunAltitude(effectiveHour, latitude, dayOfYear);

      // Get maximum altitude at solar noon for this day
      const maxAltitude = getSunAltitude(12, latitude, dayOfYear);

      // Y position based on actual altitude
      // Map altitude (0-maxAltitude) to Y position (85% at horizon, 8% at peak)
      const normalizedAltitude = Math.max(0, altitude) / Math.max(1, maxAltitude);
      const y = 85 - (normalizedAltitude * 77);

      // Get color and size based on altitude
      const colors = getSunColor(altitude);
      const scale = getSunScale(altitude);

      // Glow intensity varies with altitude (stronger when high)
      const glowIntensity = 0.4 + (normalizedAltitude * 0.4);

      return {
        x,
        y,
        isSun: true,
        visible: true,
        scale,
        colors,
        glowIntensity,
        altitude,
        isGoldenHour: altitude < 15,
      };
    } else {
      // Night time - moon position
      let nightProgress: number;

      if (effectiveHour >= sunset) {
        // Evening after sunset
        nightProgress = (effectiveHour - sunset) / nightHours;
      } else {
        // Early morning before sunrise
        nightProgress = (effectiveHour + (24 - sunset)) / nightHours;
      }

      // Smoother moon arc with easing
      const easedProgress = easeInOutSine(nightProgress);

      // Moon arc - East to West (right to left)
      const x = 88 - (easedProgress * 76);

      // Moon doesn't go as high as sun, and has a gentler arc
      const y = 75 - (Math.sin(nightProgress * Math.PI) * 45);

      return {
        x,
        y,
        isSun: false,
        visible: true,
        scale: 0.85,
        colors: null,
        glowIntensity: 0.5,
        altitude: 30, // Approximate
        isGoldenHour: false,
      };
    }
  }, [effectiveHour, latitude, dayOfYear]);

  if (!enabled) return null;

  return (
    <>
      {/* Sun/Moon element */}
      <div
        className="absolute pointer-events-none z-[401]"
        style={{
          left: `${celestialBody.x}%`,
          top: `${celestialBody.y}%`,
          transform: `translate(-50%, -50%) scale(${celestialBody.scale})`,
          transition: 'left 2s cubic-bezier(0.4, 0, 0.2, 1), top 2s cubic-bezier(0.4, 0, 0.2, 1), transform 1s ease-out',
        }}
      >
        {celestialBody.isSun && celestialBody.colors ? (
          // Sun with dynamic colors based on altitude
          <div className="relative">
            {/* Outer atmospheric glow - larger near horizon */}
            <div
              className="absolute inset-0 rounded-full animate-sun-glow"
              style={{
                width: celestialBody.isGoldenHour ? '80px' : '60px',
                height: celestialBody.isGoldenHour ? '80px' : '60px',
                background: `radial-gradient(circle, ${celestialBody.colors.glow} 0%, transparent 70%)`,
                transform: `translate(-50%, -50%) scale(${celestialBody.isGoldenHour ? 2.5 : 2})`,
                left: '50%',
                top: '50%',
                opacity: celestialBody.glowIntensity,
              }}
            />

            {/* Sun rays - more visible during golden hour */}
            <div
              className="absolute inset-0 animate-sun-rays"
              style={{ opacity: celestialBody.isGoldenHour ? 1 : 0.7 }}
            >
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    width: '3px',
                    height: celestialBody.isGoldenHour ? '28px' : '20px',
                    left: '50%',
                    top: '50%',
                    background: `linear-gradient(to top, ${celestialBody.colors?.rays} 0%, transparent 100%)`,
                    transform: `translate(-50%, -100%) rotate(${i * 30}deg)`,
                    transformOrigin: 'center bottom',
                  }}
                />
              ))}
            </div>

            {/* Sun body with altitude-based coloring */}
            <div
              className="relative rounded-full shadow-lg animate-sun-pulse"
              style={{
                width: '36px',
                height: '36px',
                background: `radial-gradient(circle at 30% 30%,
                  ${celestialBody.colors.body} 0%,
                  ${celestialBody.colors.body}dd 50%,
                  ${celestialBody.colors.body}aa 100%)`,
                boxShadow: `
                  0 0 30px ${celestialBody.colors.glow},
                  0 0 60px ${celestialBody.colors.glow.replace('0.', '0.2')}
                `,
              }}
            />

            {/* Golden hour lens flare effect */}
            {celestialBody.isGoldenHour && (
              <div
                className="absolute pointer-events-none"
                style={{
                  width: '120px',
                  height: '4px',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: `linear-gradient(90deg,
                    transparent 0%,
                    ${celestialBody.colors.rays} 30%,
                    transparent 50%,
                    ${celestialBody.colors.rays} 70%,
                    transparent 100%)`,
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
              className="absolute inset-0 rounded-full"
              style={{
                width: '50px',
                height: '50px',
                background: 'radial-gradient(circle, rgba(200,220,255,0.35) 0%, rgba(150,180,255,0.1) 50%, transparent 70%)',
                transform: 'translate(-50%, -50%) scale(1.5)',
                left: '50%',
                top: '50%',
              }}
            />

            {/* Moon body */}
            <div
              className="relative rounded-full animate-moon-glow"
              style={{
                width: '28px',
                height: '28px',
                background: 'radial-gradient(circle at 35% 35%, #F8FAFF 0%, #E2E8F0 40%, #CBD5E1 100%)',
                boxShadow: '0 0 20px rgba(200,220,255,0.5), inset -4px -4px 8px rgba(100,120,150,0.3)',
              }}
            >
              {/* Moon craters */}
              <div
                className="absolute rounded-full opacity-25"
                style={{
                  width: '6px',
                  height: '6px',
                  background: '#94A3B8',
                  top: '6px',
                  left: '5px',
                }}
              />
              <div
                className="absolute rounded-full opacity-20"
                style={{
                  width: '4px',
                  height: '4px',
                  background: '#94A3B8',
                  top: '14px',
                  left: '12px',
                }}
              />
              <div
                className="absolute rounded-full opacity-15"
                style={{
                  width: '3px',
                  height: '3px',
                  background: '#94A3B8',
                  top: '10px',
                  left: '18px',
                }}
              />
            </div>

            {/* Subtle moon halo */}
            <div
              className="absolute rounded-full"
              style={{
                width: '44px',
                height: '44px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                border: '1px solid rgba(200,220,255,0.15)',
              }}
            />
          </div>
        )}
      </div>

      {/* Light beam effect from sun - more prominent during golden hour */}
      {celestialBody.isSun && !isNightMode && celestialBody.colors && (
        <div
          className="absolute pointer-events-none z-[397]"
          style={{
            left: `${celestialBody.x}%`,
            top: `${celestialBody.y}%`,
            width: celestialBody.isGoldenHour ? '250px' : '180px',
            height: celestialBody.isGoldenHour ? '400px' : '280px',
            transform: 'translate(-50%, 0)',
            background: `linear-gradient(to bottom,
              ${celestialBody.colors.glow.replace(')', ', 0.2)')} 0%,
              ${celestialBody.colors.glow.replace(')', ', 0.05)')} 40%,
              transparent 100%)`,
            opacity: celestialBody.glowIntensity * 0.6,
            transition: 'all 2s ease-out',
          }}
        />
      )}

      {/* Horizon glow effect during golden hour */}
      {celestialBody.isSun && celestialBody.isGoldenHour && !isNightMode && celestialBody.colors && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-[396]"
          style={{
            height: '30%',
            background: `linear-gradient(to top,
              ${celestialBody.colors.glow.replace(')', ', 0.15)')} 0%,
              transparent 100%)`,
            opacity: Math.max(0, 1 - celestialBody.altitude / 15),
            transition: 'opacity 3s ease-out',
          }}
        />
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes sun-glow {
          0%, 100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0.85;
          }
          50% {
            transform: translate(-50%, -50%) scale(2.2);
            opacity: 1;
          }
        }

        .animate-sun-glow {
          animation: sun-glow 5s ease-in-out infinite;
        }

        @keyframes sun-rays {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .animate-sun-rays {
          animation: sun-rays 60s linear infinite;
        }

        @keyframes sun-pulse {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.03);
            filter: brightness(1.05);
          }
        }

        .animate-sun-pulse {
          animation: sun-pulse 4s ease-in-out infinite;
        }

        @keyframes moon-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(200,220,255,0.5), inset -4px -4px 8px rgba(100,120,150,0.3);
          }
          50% {
            box-shadow: 0 0 28px rgba(200,220,255,0.65), inset -4px -4px 8px rgba(100,120,150,0.3);
          }
        }

        .animate-moon-glow {
          animation: moon-glow 5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default SunArcAnimation;
