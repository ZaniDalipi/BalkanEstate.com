// SunArcAnimation Component
// Displays an animated sun/moon that moves across the map based on time of day
// Calculates local solar time based on longitude for accurate sun position

import React, { useMemo, useEffect, useState } from 'react';

interface SunArcAnimationProps {
  hour: number; // 0-23 (can be overridden by manual control)
  enabled: boolean;
  isNightMode: boolean;
  longitude?: number; // Map center longitude for local solar time calculation
  useRealTime?: boolean; // If true, use current real time adjusted for location
}

/**
 * Calculate local solar time based on longitude
 * Solar noon occurs when the sun is at its highest point
 * For every 15° of longitude, there's a 1-hour difference in solar time
 *
 * @param longitude - The longitude of the location
 * @returns The local solar hour (0-24)
 */
const calculateLocalSolarTime = (longitude: number): number => {
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

  // Solar time offset: longitude / 15 gives hours offset from UTC
  // Positive longitude (East) = ahead of UTC
  // Negative longitude (West) = behind UTC
  const solarOffset = longitude / 15;

  let localSolarTime = utcHours + solarOffset;

  // Normalize to 0-24 range
  while (localSolarTime < 0) localSolarTime += 24;
  while (localSolarTime >= 24) localSolarTime -= 24;

  return localSolarTime;
};

/**
 * SunArcAnimation Component
 *
 * Shows an animated sun/moon traveling across the sky in an arc
 * - Sun rises from left (east) in morning
 * - Peaks at top (south) at noon
 * - Sets on right (west) in evening
 * - Moon appears at night
 *
 * For Greece (~23°E longitude):
 * - Solar time is ~1.5 hours ahead of UTC
 * - At UTC 12:00, Greece solar time is ~13:30
 */
const SunArcAnimation: React.FC<SunArcAnimationProps> = ({
  hour,
  enabled,
  isNightMode,
  longitude = 23, // Default to Greece/Balkans longitude
  useRealTime = true,
}) => {
  // Track real-time updates
  const [realTimeHour, setRealTimeHour] = useState<number>(() =>
    calculateLocalSolarTime(longitude)
  );

  // Update real time every minute
  useEffect(() => {
    if (!useRealTime || !enabled) return;

    const updateTime = () => {
      setRealTimeHour(calculateLocalSolarTime(longitude));
    };

    // Update immediately
    updateTime();

    // Update every minute
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [longitude, useRealTime, enabled]);

  // Use manual hour if provided and different from real time, otherwise use real time
  const effectiveHour = useRealTime ? realTimeHour : hour;

  // Calculate sun position along an arc
  const sunPosition = useMemo(() => {
    // Sun visible from 5am to 9pm (hours 5-21) - approximate for Balkans region
    const sunriseHour = 5;
    const sunsetHour = 21;

    const isDay = effectiveHour >= sunriseHour && effectiveHour < sunsetHour;

    if (isDay) {
      // Calculate position along arc (0 = sunrise, 1 = sunset)
      const dayProgress = (effectiveHour - sunriseHour) / (sunsetHour - sunriseHour);

      // Arc from left to right
      // X: 5% at sunrise, 50% at noon, 95% at sunset
      const x = 5 + (dayProgress * 90);

      // Y: Arc using sine wave - highest at noon
      // Y: 80% at sunrise/sunset (near bottom), 10% at noon (near top)
      const y = 80 - (Math.sin(dayProgress * Math.PI) * 70);

      return { x, y, isSun: true, visible: true, scale: 1 };
    } else {
      // Night time - moon position
      let nightProgress: number;

      if (effectiveHour >= sunsetHour) {
        // Evening (21-24)
        nightProgress = (effectiveHour - sunsetHour) / (24 - sunsetHour + sunriseHour);
      } else {
        // Early morning (0-5)
        nightProgress = (effectiveHour + (24 - sunsetHour)) / (24 - sunsetHour + sunriseHour);
      }

      // Moon arc (more subtle)
      const x = 10 + (nightProgress * 80);
      const y = 70 - (Math.sin(nightProgress * Math.PI) * 40);

      return { x, y, isSun: false, visible: true, scale: 0.8 };
    }
  }, [effectiveHour]);

  if (!enabled) return null;

  return (
    <>
      {/* Sun/Moon element */}
      <div
        className="absolute pointer-events-none z-[401] transition-all duration-1000 ease-out"
        style={{
          left: `${sunPosition.x}%`,
          top: `${sunPosition.y}%`,
          transform: `translate(-50%, -50%) scale(${sunPosition.scale})`,
        }}
      >
        {sunPosition.isSun ? (
          // Sun
          <div className="relative">
            {/* Sun glow */}
            <div
              className="absolute inset-0 rounded-full animate-sun-glow"
              style={{
                width: '60px',
                height: '60px',
                background: 'radial-gradient(circle, rgba(255,200,50,0.4) 0%, rgba(255,150,0,0.2) 50%, transparent 70%)',
                transform: 'translate(-50%, -50%) scale(2)',
                left: '50%',
                top: '50%',
              }}
            />
            {/* Sun rays */}
            <div className="absolute inset-0 animate-sun-rays">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute bg-gradient-to-t from-yellow-400/60 to-transparent"
                  style={{
                    width: '3px',
                    height: '20px',
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
                    transformOrigin: 'center bottom',
                  }}
                />
              ))}
            </div>
            {/* Sun body */}
            <div
              className="relative rounded-full shadow-lg animate-sun-pulse"
              style={{
                width: '36px',
                height: '36px',
                background: 'radial-gradient(circle at 30% 30%, #FFE066 0%, #FFB800 50%, #FF9500 100%)',
                boxShadow: '0 0 30px rgba(255,180,0,0.6), 0 0 60px rgba(255,150,0,0.3)',
              }}
            />
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
                background: 'radial-gradient(circle, rgba(200,220,255,0.3) 0%, rgba(150,180,255,0.1) 50%, transparent 70%)',
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
                className="absolute rounded-full opacity-20"
                style={{
                  width: '6px',
                  height: '6px',
                  background: '#94A3B8',
                  top: '8px',
                  left: '6px',
                }}
              />
              <div
                className="absolute rounded-full opacity-15"
                style={{
                  width: '4px',
                  height: '4px',
                  background: '#94A3B8',
                  top: '16px',
                  left: '14px',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Light beam effect from sun */}
      {sunPosition.isSun && !isNightMode && (
        <div
          className="absolute pointer-events-none z-[397] transition-opacity duration-1000"
          style={{
            left: `${sunPosition.x}%`,
            top: `${sunPosition.y}%`,
            width: '200px',
            height: '300px',
            transform: 'translate(-50%, 0)',
            background: `linear-gradient(to bottom, rgba(255,220,100,0.15) 0%, rgba(255,200,50,0.05) 30%, transparent 100%)`,
            opacity: Math.sin((effectiveHour - 5) / 16 * Math.PI) * 0.5,
          }}
        />
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes sun-glow {
          0%, 100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0.8;
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
          0%, 100% {
            transform: rotate(0deg);
            opacity: 0.7;
          }
          50% {
            transform: rotate(22.5deg);
            opacity: 1;
          }
        }

        .animate-sun-rays {
          animation: sun-rays 8s linear infinite;
        }

        @keyframes sun-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 30px rgba(255,180,0,0.6), 0 0 60px rgba(255,150,0,0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 40px rgba(255,180,0,0.8), 0 0 80px rgba(255,150,0,0.4);
          }
        }

        .animate-sun-pulse {
          animation: sun-pulse 3s ease-in-out infinite;
        }

        @keyframes moon-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(200,220,255,0.5), inset -4px -4px 8px rgba(100,120,150,0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(200,220,255,0.7), inset -4px -4px 8px rgba(100,120,150,0.3);
          }
        }

        .animate-moon-glow {
          animation: moon-glow 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default SunArcAnimation;
