// SunArcAnimation Component
// Displays an animated sun/moon that circles around the map edges based on real time
// Features realistic motion effects with trails, particles, and dynamic glow

import React, { useMemo, useEffect, useState, useRef } from 'react';

interface SunArcAnimationProps {
  hour: number;
  enabled: boolean;
  isNightMode: boolean;
  longitude?: number;
  latitude?: number;
  useRealTime?: boolean;
}

interface Position {
  x: number;
  y: number;
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
const getSunColor = (progress: number): { body: string; glow: string; rays: string; trail: string } => {
  if (progress < 0.15 || progress > 0.85) {
    return {
      body: '#FF7043',
      glow: 'rgba(255,100,50,0.5)',
      rays: 'rgba(255,120,60,0.7)',
      trail: 'rgba(255,100,50,0.3)'
    };
  }
  if (progress < 0.3 || progress > 0.7) {
    return {
      body: '#FF9800',
      glow: 'rgba(255,150,0,0.45)',
      rays: 'rgba(255,180,50,0.65)',
      trail: 'rgba(255,150,0,0.25)'
    };
  }
  return {
    body: '#FFD54F',
    glow: 'rgba(255,220,100,0.35)',
    rays: 'rgba(255,230,100,0.55)',
    trail: 'rgba(255,220,100,0.2)'
  };
};

/**
 * Calculate position along a path around the map edges
 */
const getPositionOnPath = (progress: number, padding: number = 8): Position => {
  const p = ((progress % 1) + 1) % 1;

  const minX = padding;
  const maxX = 100 - padding;
  const minY = padding;
  const maxY = 100 - padding;

  if (p < 0.25) {
    const edgeProgress = p / 0.25;
    return { x: maxX, y: maxY - (edgeProgress * (maxY - minY)) };
  } else if (p < 0.5) {
    const edgeProgress = (p - 0.25) / 0.25;
    return { x: maxX - (edgeProgress * (maxX - minX)), y: minY };
  } else if (p < 0.75) {
    const edgeProgress = (p - 0.5) / 0.25;
    return { x: minX, y: minY + (edgeProgress * (maxY - minY)) };
  } else {
    const edgeProgress = (p - 0.75) / 0.25;
    return { x: minX + (edgeProgress * (maxX - minX)), y: maxY };
  }
};

/**
 * Map time of day to position on the path
 */
const getTimeToPathProgress = (
  hour: number,
  sunrise: number,
  sunset: number
): { progress: number; isSun: boolean } => {
  const daylightHours = sunset - sunrise;
  const nightHours = 24 - daylightHours;

  if (hour >= sunrise && hour < sunset) {
    const dayProgress = (hour - sunrise) / daylightHours;
    const pathProgress = dayProgress * 0.75;
    return { progress: pathProgress, isSun: true };
  } else {
    let nightProgress: number;
    if (hour >= sunset) {
      nightProgress = (hour - sunset) / nightHours;
    } else {
      nightProgress = (hour + (24 - sunset)) / nightHours;
    }
    const pathProgress = 0.75 + (nightProgress * 0.25);
    return { progress: pathProgress, isSun: false };
  }
};

/**
 * SunArcAnimation Component with realistic motion effects
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

  // Track previous positions for trail effect
  const [trailPositions, setTrailPositions] = useState<Position[]>([]);
  const lastUpdateRef = useRef<number>(Date.now());

  // Update every 2 seconds for smooth, visible movement
  useEffect(() => {
    if (!useRealTime || !enabled) return;

    const updateTime = () => {
      const newHour = calculateLocalSolarTime(longitude);
      setRealTimeHour(newHour);
      setCurrentDate(new Date());
      lastUpdateRef.current = Date.now();
    };

    updateTime();
    const interval = setInterval(updateTime, 2000); // Update every 2s for smoother motion

    return () => clearInterval(interval);
  }, [longitude, useRealTime, enabled]);

  const effectiveHour = useRealTime ? realTimeHour : hour;
  const dayOfYear = getDayOfYear(currentDate);

  // Calculate celestial body position
  const celestialBody = useMemo(() => {
    const { sunrise, sunset } = calculateSunriseSunset(latitude, dayOfYear);
    const { progress, isSun } = getTimeToPathProgress(effectiveHour, sunrise, sunset);
    const position = getPositionOnPath(progress);

    const daylightHours = sunset - sunrise;
    let dayProgress = 0;
    if (isSun) {
      dayProgress = (effectiveHour - sunrise) / daylightHours;
    }

    const colors = isSun ? getSunColor(dayProgress) : null;
    const isNearCorner =
      (position.x < 15 || position.x > 85) &&
      (position.y < 15 || position.y > 85);
    const scale = isNearCorner ? 1.15 : 1.0;
    const isGoldenHour = dayProgress < 0.15 || dayProgress > 0.85;

    return {
      x: position.x,
      y: position.y,
      isSun,
      visible: true,
      scale,
      colors,
      glowIntensity: isGoldenHour ? 0.85 : 0.55,
      isGoldenHour,
      progress,
      dayProgress,
    };
  }, [effectiveHour, latitude, dayOfYear]);

  // Update trail positions
  useEffect(() => {
    if (!enabled) return;

    setTrailPositions(prev => {
      const newTrail = [{ x: celestialBody.x, y: celestialBody.y }, ...prev.slice(0, 5)];
      return newTrail;
    });
  }, [celestialBody.x, celestialBody.y, enabled]);

  // Generate floating particles around sun - must be before early return to follow hooks rules
  const particles = useMemo(() => {
    return [...Array(8)].map((_, i) => ({
      id: i,
      angle: (i * 45),
      distance: 25 + (i % 3) * 8,
      size: 2 + (i % 3),
      opacity: 0.3 + (i % 4) * 0.15,
      speed: 1 + (i % 2) * 0.5,
    }));
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Motion trail effect */}
      {trailPositions.map((pos, index) => (
        <div
          key={index}
          className="absolute pointer-events-none z-[399] rounded-full"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            width: `${(6 - index) * 6}px`,
            height: `${(6 - index) * 6}px`,
            transform: 'translate(-50%, -50%)',
            background: celestialBody.isSun && celestialBody.colors
              ? `radial-gradient(circle, ${celestialBody.colors.trail} 0%, transparent 70%)`
              : 'radial-gradient(circle, rgba(200,220,255,0.15) 0%, transparent 70%)',
            opacity: (1 - index * 0.18),
            transition: 'opacity 0.5s ease-out',
          }}
        />
      ))}

      {/* Main Sun/Moon element */}
      <div
        className="absolute pointer-events-none z-[401]"
        style={{
          left: `${celestialBody.x}%`,
          top: `${celestialBody.y}%`,
          transform: `translate(-50%, -50%) scale(${celestialBody.scale})`,
          transition: 'left 0.8s cubic-bezier(0.25, 0.1, 0.25, 1), top 0.8s cubic-bezier(0.25, 0.1, 0.25, 1), transform 0.5s ease-out',
        }}
      >
        {celestialBody.isSun && celestialBody.colors ? (
          <div className="relative">
            {/* Outer heat shimmer effect */}
            <div
              className="absolute rounded-full animate-heat-shimmer"
              style={{
                width: '120px',
                height: '120px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(ellipse, ${celestialBody.colors.glow.replace(')', ', 0.1)')} 0%, transparent 60%)`,
                filter: 'blur(8px)',
              }}
            />

            {/* Atmospheric glow - pulsing */}
            <div
              className="absolute inset-0 rounded-full animate-sun-glow"
              style={{
                width: celestialBody.isGoldenHour ? '100px' : '80px',
                height: celestialBody.isGoldenHour ? '100px' : '80px',
                background: `radial-gradient(circle, ${celestialBody.colors.glow} 0%, transparent 65%)`,
                transform: 'translate(-50%, -50%)',
                left: '50%',
                top: '50%',
                opacity: celestialBody.glowIntensity,
              }}
            />

            {/* Floating particles */}
            {particles.map((particle) => (
              <div
                key={particle.id}
                className="absolute rounded-full animate-particle-float"
                style={{
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  left: '50%',
                  top: '50%',
                  background: celestialBody.colors?.rays || 'rgba(255,200,100,0.6)',
                  transform: `translate(-50%, -50%) rotate(${particle.angle}deg) translateX(${particle.distance}px)`,
                  opacity: particle.opacity,
                  boxShadow: `0 0 ${particle.size * 2}px ${celestialBody.colors?.glow}`,
                }}
              />
            ))}

            {/* Rotating sun rays */}
            <div className="absolute inset-0 animate-sun-rays">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    width: '3px',
                    height: celestialBody.isGoldenHour ? '35px' : '26px',
                    left: '50%',
                    top: '50%',
                    background: `linear-gradient(to top, ${celestialBody.colors?.rays} 0%, transparent 100%)`,
                    transform: `translate(-50%, -100%) rotate(${i * 30}deg)`,
                    transformOrigin: 'center bottom',
                    opacity: 0.6 + Math.sin((Date.now() / 500 + i) % Math.PI) * 0.4,
                  }}
                />
              ))}
            </div>

            {/* Inner corona */}
            <div
              className="absolute rounded-full animate-corona-pulse"
              style={{
                width: '52px',
                height: '52px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: `radial-gradient(circle, ${celestialBody.colors.body}66 0%, transparent 70%)`,
                filter: 'blur(4px)',
              }}
            />

            {/* Sun body with internal animation */}
            <div
              className="relative rounded-full shadow-lg animate-sun-body"
              style={{
                width: '42px',
                height: '42px',
                background: `
                  radial-gradient(circle at 35% 35%, #FFFFFF 0%, transparent 25%),
                  radial-gradient(circle at 30% 30%, ${celestialBody.colors.body} 0%, ${celestialBody.colors.body}dd 50%, ${celestialBody.colors.body}99 100%)
                `,
                boxShadow: `
                  0 0 20px ${celestialBody.colors.glow},
                  0 0 40px ${celestialBody.colors.glow},
                  0 0 60px ${celestialBody.colors.glow.replace('0.', '0.3')},
                  inset 0 0 20px rgba(255,255,255,0.3)
                `,
              }}
            >
              {/* Surface detail - sunspots */}
              <div
                className="absolute rounded-full opacity-20 animate-sunspot"
                style={{ width: '6px', height: '6px', background: '#CC7000', top: '12px', left: '18px' }}
              />
              <div
                className="absolute rounded-full opacity-15 animate-sunspot"
                style={{ width: '4px', height: '4px', background: '#CC7000', top: '22px', left: '10px', animationDelay: '0.5s' }}
              />
            </div>

            {/* Lens flare for golden hour */}
            {celestialBody.isGoldenHour && (
              <>
                <div
                  className="absolute pointer-events-none animate-lens-flare"
                  style={{
                    width: '180px',
                    height: '3px',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%) rotate(-15deg)',
                    background: `linear-gradient(90deg,
                      transparent 0%,
                      ${celestialBody.colors.rays} 15%,
                      transparent 30%,
                      ${celestialBody.colors.rays} 50%,
                      transparent 70%,
                      ${celestialBody.colors.rays} 85%,
                      transparent 100%)`,
                    opacity: 0.5,
                  }}
                />
                {/* Secondary flare */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    width: '60px',
                    height: '60px',
                    left: '120%',
                    top: '120%',
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${celestialBody.colors.glow.replace('0.5', '0.2')} 0%, transparent 70%)`,
                  }}
                />
              </>
            )}
          </div>
        ) : (
          // Moon with motion effects
          <div className="relative">
            {/* Moon trail glow */}
            <div
              className="absolute rounded-full animate-moon-trail"
              style={{
                width: '70px',
                height: '70px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'radial-gradient(circle, rgba(200,220,255,0.2) 0%, transparent 60%)',
                filter: 'blur(6px)',
              }}
            />

            {/* Moon glow */}
            <div
              className="absolute inset-0 rounded-full animate-moon-pulse"
              style={{
                width: '65px',
                height: '65px',
                background: 'radial-gradient(circle, rgba(200,220,255,0.35) 0%, rgba(150,180,255,0.12) 50%, transparent 70%)',
                transform: 'translate(-50%, -50%) scale(1.6)',
                left: '50%',
                top: '50%',
              }}
            />

            {/* Moon sparkles */}
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-star-twinkle"
                style={{
                  width: '2px',
                  height: '2px',
                  left: '50%',
                  top: '50%',
                  background: '#FFFFFF',
                  transform: `translate(-50%, -50%) rotate(${i * 72}deg) translateX(${35 + i * 5}px)`,
                  opacity: 0.6,
                  animationDelay: `${i * 0.3}s`,
                  boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                }}
              />
            ))}

            {/* Moon body */}
            <div
              className="relative rounded-full animate-moon-glow"
              style={{
                width: '34px',
                height: '34px',
                background: 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F0F4FF 30%, #E2E8F0 60%, #CBD5E1 100%)',
                boxShadow: '0 0 25px rgba(200,220,255,0.6), 0 0 50px rgba(200,220,255,0.3), inset -5px -5px 12px rgba(100,120,150,0.25)',
              }}
            >
              {/* Moon craters with subtle animation */}
              <div
                className="absolute rounded-full opacity-30"
                style={{ width: '8px', height: '8px', background: 'radial-gradient(circle, #94A3B8 0%, #A0AEC0 100%)', top: '6px', left: '6px' }}
              />
              <div
                className="absolute rounded-full opacity-20"
                style={{ width: '5px', height: '5px', background: 'radial-gradient(circle, #94A3B8 0%, #A0AEC0 100%)', top: '18px', left: '16px' }}
              />
              <div
                className="absolute rounded-full opacity-15"
                style={{ width: '4px', height: '4px', background: 'radial-gradient(circle, #94A3B8 0%, #A0AEC0 100%)', top: '12px', left: '22px' }}
              />
            </div>

            {/* Subtle moon halo */}
            <div
              className="absolute rounded-full animate-halo-rotate"
              style={{
                width: '54px',
                height: '54px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                border: '1px solid rgba(200,220,255,0.25)',
                background: 'transparent',
              }}
            />
          </div>
        )}
      </div>

      {/* Light beam from sun - animated */}
      {celestialBody.isSun && !isNightMode && celestialBody.colors && (
        <div
          className="absolute pointer-events-none z-[397] animate-light-beam"
          style={{
            left: `${celestialBody.x}%`,
            top: `${celestialBody.y}%`,
            width: celestialBody.isGoldenHour ? '280px' : '180px',
            height: celestialBody.isGoldenHour ? '450px' : '320px',
            transform: 'translate(-50%, 0)',
            background: `linear-gradient(to bottom,
              ${celestialBody.colors.glow.replace(')', ', 0.3)')} 0%,
              ${celestialBody.colors.glow.replace(')', ', 0.1)')} 35%,
              transparent 100%)`,
            opacity: celestialBody.glowIntensity * 0.4,
            transition: 'left 0.8s ease-out, top 0.8s ease-out, width 1s ease, height 1s ease',
            filter: 'blur(2px)',
          }}
        />
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes sun-glow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
        }
        .animate-sun-glow { animation: sun-glow 3s ease-in-out infinite; }

        @keyframes sun-rays {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-sun-rays { animation: sun-rays 30s linear infinite; }

        @keyframes sun-body {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.02); filter: brightness(1.05); }
        }
        .animate-sun-body { animation: sun-body 2s ease-in-out infinite; }

        @keyframes corona-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.8; }
        }
        .animate-corona-pulse { animation: corona-pulse 2.5s ease-in-out infinite; }

        @keyframes heat-shimmer {
          0%, 100% { transform: translate(-50%, -50%) scale(1) skewX(0deg); opacity: 0.3; }
          25% { transform: translate(-50%, -50%) scale(1.05) skewX(2deg); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.1) skewX(0deg); opacity: 0.5; }
          75% { transform: translate(-50%, -50%) scale(1.05) skewX(-2deg); opacity: 0.4; }
        }
        .animate-heat-shimmer { animation: heat-shimmer 4s ease-in-out infinite; }

        @keyframes particle-float {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--distance)) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) rotate(calc(var(--angle) + 180deg)) translateX(calc(var(--distance) + 5px)) scale(1.2); }
        }
        .animate-particle-float { animation: particle-float 3s ease-in-out infinite; }

        @keyframes sunspot {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.1; transform: scale(0.8); }
        }
        .animate-sunspot { animation: sunspot 5s ease-in-out infinite; }

        @keyframes lens-flare {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) rotate(-15deg) scaleX(1); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) rotate(-15deg) scaleX(1.3); }
        }
        .animate-lens-flare { animation: lens-flare 2s ease-in-out infinite; }

        @keyframes moon-glow {
          0%, 100% { box-shadow: 0 0 25px rgba(200,220,255,0.6), 0 0 50px rgba(200,220,255,0.3), inset -5px -5px 12px rgba(100,120,150,0.25); }
          50% { box-shadow: 0 0 35px rgba(200,220,255,0.8), 0 0 70px rgba(200,220,255,0.4), inset -5px -5px 12px rgba(100,120,150,0.25); }
        }
        .animate-moon-glow { animation: moon-glow 4s ease-in-out infinite; }

        @keyframes moon-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.8); opacity: 0.7; }
        }
        .animate-moon-pulse { animation: moon-pulse 4s ease-in-out infinite; }

        @keyframes moon-trail {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.5; }
        }
        .animate-moon-trail { animation: moon-trail 3s ease-in-out infinite; }

        @keyframes star-twinkle {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--dist)) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--dist)) scale(1.5); }
        }
        .animate-star-twinkle { animation: star-twinkle 2s ease-in-out infinite; }

        @keyframes halo-rotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); border-color: rgba(200,220,255,0.25); }
          50% { border-color: rgba(200,220,255,0.4); }
          100% { transform: translate(-50%, -50%) rotate(360deg); border-color: rgba(200,220,255,0.25); }
        }
        .animate-halo-rotate { animation: halo-rotate 20s linear infinite; }

        @keyframes light-beam {
          0%, 100% { opacity: 0.3; filter: blur(2px); }
          50% { opacity: 0.5; filter: blur(4px); }
        }
        .animate-light-beam { animation: light-beam 4s ease-in-out infinite; }
      `}</style>
    </>
  );
};

export default SunArcAnimation;
