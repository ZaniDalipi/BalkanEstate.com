// SunArcAnimation Component
// Displays an animated sun/moon that circles around the map edges based on real time
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

  if (cosHourAngle < -1) {
    return { sunrise: 0, sunset: 24 };
  } else if (cosHourAngle > 1) {
    return { sunrise: 12, sunset: 12 };
  }

  const hourAngle = Math.acos(cosHourAngle) * (180 / Math.PI);
  const daylightHours = (2 * hourAngle) / 15;

  const sunrise = 12 - (daylightHours / 2);
  const sunset = 12 + (daylightHours / 2);

  return { sunrise, sunset };
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
 * Calculate sun color based on progress through day
 */
const getSunColor = (progress: number, isRising: boolean): { body: string; glow: string; rays: string } => {
  // Near sunrise/sunset (0-0.15 or 0.85-1.0)
  if (progress < 0.15 || progress > 0.85) {
    return { body: '#FF7043', glow: 'rgba(255,100,50,0.5)', rays: 'rgba(255,120,60,0.7)' };
  }
  // Morning/evening (0.15-0.3 or 0.7-0.85)
  if (progress < 0.3 || progress > 0.7) {
    return { body: '#FF9800', glow: 'rgba(255,150,0,0.45)', rays: 'rgba(255,180,50,0.65)' };
  }
  // Mid-day (0.3-0.7)
  return { body: '#FFD54F', glow: 'rgba(255,220,100,0.35)', rays: 'rgba(255,230,100,0.55)' };
};

/**
 * Calculate position along a rounded rectangle path around the map edges
 * Progress 0-1 maps to a full circuit around the map
 *
 * Path:
 * - 0.00-0.25: Right edge (bottom to top) - SUNRISE/MORNING
 * - 0.25-0.50: Top edge (right to left) - MIDDAY
 * - 0.50-0.75: Left edge (top to bottom) - AFTERNOON/SUNSET
 * - 0.75-1.00: Bottom edge (left to right) - NIGHT
 */
const getPositionOnPath = (progress: number, padding: number = 8): { x: number; y: number } => {
  // Normalize progress to 0-1
  const p = ((progress % 1) + 1) % 1;

  const minX = padding;
  const maxX = 100 - padding;
  const minY = padding;
  const maxY = 100 - padding;

  // Corner radius for smooth corners
  const cornerSize = 15;

  if (p < 0.25) {
    // Right edge: bottom-right corner to top-right corner
    const edgeProgress = p / 0.25;
    const x = maxX;
    const y = maxY - (edgeProgress * (maxY - minY));
    return { x, y };
  } else if (p < 0.5) {
    // Top edge: top-right to top-left
    const edgeProgress = (p - 0.25) / 0.25;
    const x = maxX - (edgeProgress * (maxX - minX));
    const y = minY;
    return { x, y };
  } else if (p < 0.75) {
    // Left edge: top-left to bottom-left
    const edgeProgress = (p - 0.5) / 0.25;
    const x = minX;
    const y = minY + (edgeProgress * (maxY - minY));
    return { x, y };
  } else {
    // Bottom edge: bottom-left to bottom-right
    const edgeProgress = (p - 0.75) / 0.25;
    const x = minX + (edgeProgress * (maxX - minX));
    const y = maxY;
    return { x, y };
  }
};

/**
 * Map time of day to position on the path
 * Sunrise starts at bottom-right, noon at top-center, sunset at bottom-left
 */
const getTimeToPathProgress = (
  hour: number,
  sunrise: number,
  sunset: number
): { progress: number; isSun: boolean } => {
  const daylightHours = sunset - sunrise;
  const nightHours = 24 - daylightHours;

  if (hour >= sunrise && hour < sunset) {
    // Daytime: Sun travels from right edge (0) -> top (0.25-0.5) -> left edge (0.75)
    const dayProgress = (hour - sunrise) / daylightHours;
    // Map 0-1 day progress to 0-0.75 path progress (right -> top -> left)
    const pathProgress = dayProgress * 0.75;
    return { progress: pathProgress, isSun: true };
  } else {
    // Nighttime: Moon travels along bottom edge (0.75 -> 1.0/0)
    let nightProgress: number;
    if (hour >= sunset) {
      nightProgress = (hour - sunset) / nightHours;
    } else {
      nightProgress = (hour + (24 - sunset)) / nightHours;
    }
    // Map night progress to 0.75-1.0 (bottom edge, left to right)
    const pathProgress = 0.75 + (nightProgress * 0.25);
    return { progress: pathProgress, isSun: false };
  }
};

/**
 * SunArcAnimation Component
 *
 * Shows an animated sun/moon circling around the map edges
 * - Sun rises from bottom-right corner (East)
 * - Travels up right edge in morning
 * - Crosses top of map at midday
 * - Descends left edge in afternoon
 * - Sets at bottom-left corner (West)
 * - Moon travels along bottom edge at night
 */
const SunArcAnimation: React.FC<SunArcAnimationProps> = ({
  hour,
  enabled,
  isNightMode,
  longitude = 23,
  latitude = 40,
  useRealTime = true,
}) => {
  // Real-time tracking with frequent updates
  const [realTimeHour, setRealTimeHour] = useState<number>(() =>
    calculateLocalSolarTime(longitude)
  );
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Update every 10 seconds for smooth real-time movement
  useEffect(() => {
    if (!useRealTime || !enabled) return;

    const updateTime = () => {
      setRealTimeHour(calculateLocalSolarTime(longitude));
      setCurrentDate(new Date());
    };

    updateTime();
    const interval = setInterval(updateTime, 10000); // Update every 10s

    return () => clearInterval(interval);
  }, [longitude, useRealTime, enabled]);

  const effectiveHour = useRealTime ? realTimeHour : hour;
  const dayOfYear = getDayOfYear(currentDate);

  // Calculate celestial body position
  const celestialBody = useMemo(() => {
    const { sunrise, sunset } = calculateSunriseSunset(latitude, dayOfYear);
    const { progress, isSun } = getTimeToPathProgress(effectiveHour, sunrise, sunset);
    const position = getPositionOnPath(progress);

    // Calculate day progress for color
    const daylightHours = sunset - sunrise;
    let dayProgress = 0;
    if (isSun) {
      dayProgress = (effectiveHour - sunrise) / daylightHours;
    }

    const colors = isSun ? getSunColor(dayProgress, dayProgress < 0.5) : null;

    // Scale based on position (larger near edges/corners)
    const isNearCorner =
      (position.x < 15 || position.x > 85) &&
      (position.y < 15 || position.y > 85);
    const scale = isNearCorner ? 1.2 : 1.0;

    // Glow intensity based on position
    const isGoldenHour = dayProgress < 0.15 || dayProgress > 0.85;

    return {
      x: position.x,
      y: position.y,
      isSun,
      visible: true,
      scale,
      colors,
      glowIntensity: isGoldenHour ? 0.8 : 0.5,
      isGoldenHour,
      progress,
    };
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
          transition: 'left 1.5s cubic-bezier(0.4, 0, 0.2, 1), top 1.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s ease-out',
        }}
      >
        {celestialBody.isSun && celestialBody.colors ? (
          // Sun with dynamic colors
          <div className="relative">
            {/* Outer atmospheric glow */}
            <div
              className="absolute inset-0 rounded-full animate-sun-glow"
              style={{
                width: celestialBody.isGoldenHour ? '90px' : '70px',
                height: celestialBody.isGoldenHour ? '90px' : '70px',
                background: `radial-gradient(circle, ${celestialBody.colors.glow} 0%, transparent 70%)`,
                transform: `translate(-50%, -50%) scale(${celestialBody.isGoldenHour ? 2.5 : 2})`,
                left: '50%',
                top: '50%',
                opacity: celestialBody.glowIntensity,
              }}
            />

            {/* Sun rays */}
            <div
              className="absolute inset-0 animate-sun-rays"
              style={{ opacity: celestialBody.isGoldenHour ? 1 : 0.7 }}
            >
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    width: '4px',
                    height: celestialBody.isGoldenHour ? '32px' : '24px',
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
              className="relative rounded-full shadow-lg animate-sun-pulse"
              style={{
                width: '40px',
                height: '40px',
                background: `radial-gradient(circle at 30% 30%,
                  ${celestialBody.colors.body} 0%,
                  ${celestialBody.colors.body}dd 50%,
                  ${celestialBody.colors.body}aa 100%)`,
                boxShadow: `
                  0 0 40px ${celestialBody.colors.glow},
                  0 0 80px ${celestialBody.colors.glow.replace('0.', '0.2')}
                `,
              }}
            />

            {/* Golden hour lens flare */}
            {celestialBody.isGoldenHour && (
              <div
                className="absolute pointer-events-none animate-flare"
                style={{
                  width: '150px',
                  height: '6px',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: `linear-gradient(90deg,
                    transparent 0%,
                    ${celestialBody.colors.rays} 20%,
                    transparent 40%,
                    ${celestialBody.colors.rays} 60%,
                    transparent 80%,
                    ${celestialBody.colors.rays} 100%)`,
                  opacity: 0.5,
                }}
              />
            )}
          </div>
        ) : (
          // Moon
          <div className="relative">
            {/* Moon glow */}
            <div
              className="absolute inset-0 rounded-full animate-moon-pulse"
              style={{
                width: '60px',
                height: '60px',
                background: 'radial-gradient(circle, rgba(200,220,255,0.4) 0%, rgba(150,180,255,0.15) 50%, transparent 70%)',
                transform: 'translate(-50%, -50%) scale(1.8)',
                left: '50%',
                top: '50%',
              }}
            />

            {/* Moon body */}
            <div
              className="relative rounded-full animate-moon-glow"
              style={{
                width: '32px',
                height: '32px',
                background: 'radial-gradient(circle at 35% 35%, #F8FAFF 0%, #E2E8F0 40%, #CBD5E1 100%)',
                boxShadow: '0 0 25px rgba(200,220,255,0.6), inset -5px -5px 10px rgba(100,120,150,0.3)',
              }}
            >
              {/* Moon craters */}
              <div
                className="absolute rounded-full opacity-25"
                style={{ width: '7px', height: '7px', background: '#94A3B8', top: '6px', left: '5px' }}
              />
              <div
                className="absolute rounded-full opacity-20"
                style={{ width: '5px', height: '5px', background: '#94A3B8', top: '16px', left: '14px' }}
              />
              <div
                className="absolute rounded-full opacity-15"
                style={{ width: '4px', height: '4px', background: '#94A3B8', top: '11px', left: '20px' }}
              />
            </div>

            {/* Moon halo */}
            <div
              className="absolute rounded-full"
              style={{
                width: '50px',
                height: '50px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                border: '2px solid rgba(200,220,255,0.2)',
              }}
            />
          </div>
        )}
      </div>

      {/* Trail/path indicator - subtle line showing the orbit path */}
      <div
        className="absolute inset-0 pointer-events-none z-[400]"
        style={{ padding: '8%' }}
      >
        <div
          className="w-full h-full border-2 border-dashed rounded-lg opacity-10"
          style={{
            borderColor: celestialBody.isSun ? 'rgba(255,200,100,0.3)' : 'rgba(200,220,255,0.3)',
          }}
        />
      </div>

      {/* Light beam from sun */}
      {celestialBody.isSun && !isNightMode && celestialBody.colors && (
        <div
          className="absolute pointer-events-none z-[397]"
          style={{
            left: `${celestialBody.x}%`,
            top: `${celestialBody.y}%`,
            width: celestialBody.isGoldenHour ? '300px' : '200px',
            height: celestialBody.isGoldenHour ? '500px' : '350px',
            transform: 'translate(-50%, 0)',
            background: `linear-gradient(to bottom,
              ${celestialBody.colors.glow.replace(')', ', 0.25)')} 0%,
              ${celestialBody.colors.glow.replace(')', ', 0.08)')} 40%,
              transparent 100%)`,
            opacity: celestialBody.glowIntensity * 0.5,
            transition: 'all 1.5s ease-out',
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
            transform: translate(-50%, -50%) scale(2.3);
            opacity: 1;
          }
        }

        .animate-sun-glow {
          animation: sun-glow 4s ease-in-out infinite;
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
          animation: sun-rays 45s linear infinite;
        }

        @keyframes sun-pulse {
          0%, 100% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.05);
            filter: brightness(1.08);
          }
        }

        .animate-sun-pulse {
          animation: sun-pulse 3s ease-in-out infinite;
        }

        @keyframes moon-glow {
          0%, 100% {
            box-shadow: 0 0 25px rgba(200,220,255,0.6), inset -5px -5px 10px rgba(100,120,150,0.3);
          }
          50% {
            box-shadow: 0 0 35px rgba(200,220,255,0.8), inset -5px -5px 10px rgba(100,120,150,0.3);
          }
        }

        .animate-moon-glow {
          animation: moon-glow 4s ease-in-out infinite;
        }

        @keyframes moon-pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1.8);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0.8;
          }
        }

        .animate-moon-pulse {
          animation: moon-pulse 5s ease-in-out infinite;
        }

        @keyframes flare {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scaleX(1);
          }
          50% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scaleX(1.2);
          }
        }

        .animate-flare {
          animation: flare 3s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default SunArcAnimation;
