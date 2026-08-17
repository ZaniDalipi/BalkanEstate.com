import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getCityImageUrl, getCityFallbackGradient } from '@/config/cloudinaryConfig';
import { decorativeMotionEnabled } from '../../src/utils/perfMode';

// Types for random bubble positioning
interface BubblePosition {
  id: string;
  cityName: string;
  country: string;
  x: number;
  y: number;
  size: 'sm' | 'md' | 'lg' | 'xl';
  opacity: number;
  delay: number;
  isSplitting?: boolean;
  splitBubbles?: SplitBubble[];
}

interface SplitBubble {
  id: string;
  x: number;
  y: number;
  size: 'sm' | 'md';
  opacity: number;
  direction: { x: number; y: number };
}

// City data for random bubbles
const BALKAN_CITIES = [
  { cityName: 'Dubrovnik', country: 'Croatia' },
  { cityName: 'Tirana', country: 'Albania' },
  { cityName: 'Ohrid', country: 'North Macedonia' },
  { cityName: 'Belgrade', country: 'Serbia' },
  { cityName: 'Kotor', country: 'Montenegro' },
  { cityName: 'Sarajevo', country: 'Bosnia and Herzegovina' },
  { cityName: 'Split', country: 'Croatia' },
  { cityName: 'Podgorica', country: 'Montenegro' },
  { cityName: 'Skopje', country: 'North Macedonia' },
  { cityName: 'Pristina', country: 'Kosovo' },
  { cityName: 'Zagreb', country: 'Croatia' },
  { cityName: 'Bucharest', country: 'Romania' },
];

// Random City Bubbles - displays city bubbles at random positions with split animation
export const RandomCityBubbles: React.FC<{
  count?: number;
  className?: string;
}> = ({ count = 8, className = '' }) => {
  const [bubbles, setBubbles] = useState<BubblePosition[]>([]);
  const [splitAnimations, setSplitAnimations] = useState<Map<string, SplitBubble[]>>(new Map());

  // Generate random positions ensuring no overlap
  const generateRandomPosition = useCallback((existingPositions: { x: number; y: number }[]) => {
    let attempts = 0;
    let x: number, y: number;

    do {
      x = 5 + Math.random() * 85; // 5% to 90% of screen width
      y = 5 + Math.random() * 85; // 5% to 90% of screen height
      attempts++;
    } while (
      attempts < 50 &&
      existingPositions.some(
        pos => Math.abs(pos.x - x) < 15 && Math.abs(pos.y - y) < 15
      )
    );

    return { x, y };
  }, []);

  // Initialize bubbles
  useEffect(() => {
    const sizes: Array<'sm' | 'md' | 'lg' | 'xl'> = ['sm', 'md', 'lg', 'xl'];
    const positions: { x: number; y: number }[] = [];
    const shuffledCities = [...BALKAN_CITIES].sort(() => Math.random() - 0.5);

    const initialBubbles: BubblePosition[] = shuffledCities.slice(0, count).map((city, index) => {
      const pos = generateRandomPosition(positions);
      positions.push(pos);

      // Larger bubbles are less common
      const sizeIndex = Math.floor(Math.random() * 10);
      const size = sizeIndex < 3 ? 'xl' : sizeIndex < 6 ? 'lg' : sizeIndex < 8 ? 'md' : 'sm';

      return {
        id: `bubble-${index}-${Date.now()}`,
        cityName: city.cityName,
        country: city.country,
        x: pos.x,
        y: pos.y,
        size,
        opacity: 0.25 + Math.random() * 0.25, // 0.25 to 0.5
        delay: Math.random() * 2,
      };
    });

    setBubbles(initialBubbles);
  }, [count, generateRandomPosition]);

  // Split animation effect - randomly split a bubble every 6-12 seconds
  // Deferred to avoid blocking main thread during initial load
  useEffect(() => {
    // Skip the timer entirely on reduced-motion / power-saving (mobile) — the
    // bubbles are `hidden lg:block` so they don't even render there, yet the
    // interval would keep firing React re-renders. Pure wasted work.
    if (!decorativeMotionEnabled()) return;
    let splitInterval: ReturnType<typeof setInterval>;
    const startAnimations = () => {
      splitInterval = setInterval(() => {
        if (bubbles.length === 0) return;

        // Pick a random bubble to split
        const randomIndex = Math.floor(Math.random() * bubbles.length);
        const bubbleToSplit = bubbles[randomIndex];

        if (!bubbleToSplit || bubbleToSplit.isSplitting) return;

        // Create 2-3 small split bubbles
        const splitCount = 2 + Math.floor(Math.random() * 2);
        const newSplitBubbles: SplitBubble[] = Array.from({ length: splitCount }, (_, i) => ({
          id: `split-${bubbleToSplit.id}-${i}-${Date.now()}`,
          x: bubbleToSplit.x,
          y: bubbleToSplit.y,
          size: Math.random() > 0.5 ? 'sm' : 'md',
          opacity: 0.4,
          direction: {
            x: (Math.random() - 0.5) * 30,
            y: (Math.random() - 0.5) * 30,
          },
        }));

        setSplitAnimations(prev => {
          const newMap = new Map(prev);
          newMap.set(bubbleToSplit.id, newSplitBubbles);
          return newMap;
        });

        // Remove split animations after animation completes
        setTimeout(() => {
          setSplitAnimations(prev => {
            const newMap = new Map(prev);
            newMap.delete(bubbleToSplit.id);
            return newMap;
          });
        }, 2000);
      }, 6000 + Math.random() * 6000);
    };

    // Defer animation start to avoid blocking initial render
    if ('requestIdleCallback' in window) {
      const idleId = requestIdleCallback(startAnimations);
      return () => { cancelIdleCallback(idleId); clearInterval(splitInterval); };
    } else {
      const timeoutId = setTimeout(startAnimations, 3000);
      return () => { clearTimeout(timeoutId); clearInterval(splitInterval); };
    }
  }, [bubbles]);

  // Periodically reposition a random bubble (deferred to avoid blocking main thread)
  useEffect(() => {
    if (!decorativeMotionEnabled()) return;
    let repositionInterval: ReturnType<typeof setInterval>;
    const startRepositioning = () => {
      repositionInterval = setInterval(() => {
        setBubbles(prev => {
          if (prev.length === 0) return prev;

          const randomIndex = Math.floor(Math.random() * prev.length);
          const newBubbles = [...prev];
          const existingPositions = prev.filter((_, i) => i !== randomIndex).map(b => ({ x: b.x, y: b.y }));
          const newPos = generateRandomPosition(existingPositions);

          newBubbles[randomIndex] = {
            ...newBubbles[randomIndex],
            x: newPos.x,
            y: newPos.y,
          };

          return newBubbles;
        });
      }, 10000 + Math.random() * 5000);
    };

    if ('requestIdleCallback' in window) {
      const idleId = requestIdleCallback(startRepositioning);
      return () => { cancelIdleCallback(idleId); clearInterval(repositionInterval); };
    } else {
      const timeoutId = setTimeout(startRepositioning, 4000);
      return () => { clearTimeout(timeoutId); clearInterval(repositionInterval); };
    }
  }, [generateRandomPosition]);

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${className}`}>
      {/* Main bubbles */}
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute transition-all duration-[3000ms] ease-in-out hidden lg:block"
          style={{
            left: `${bubble.x}%`,
            top: `${bubble.y}%`,
            opacity: bubble.opacity,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <CityImageOrb
            cityName={bubble.cityName}
            country={bubble.country}
            size={bubble.size}
            className={`animate-float`}
            animate={true}
          />

          {/* Split bubbles animation */}
          {splitAnimations.has(bubble.id) && (
            <>
              {splitAnimations.get(bubble.id)?.map((splitBubble) => (
                <div
                  key={splitBubble.id}
                  className="absolute animate-split-bubble"
                  style={{
                    '--split-x': `${splitBubble.direction.x}vw`,
                    '--split-y': `${splitBubble.direction.y}vh`,
                  } as React.CSSProperties}
                >
                  <CityImageOrb
                    cityName={bubble.cityName}
                    country={bubble.country}
                    size={splitBubble.size}
                    animate={false}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      ))}

      {/* Gradient overlays */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/15 via-purple-200/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-pink-200/10 via-rose-200/5 to-transparent rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
    </div>
  );
};

// City Image Orb - displays city photos inside 3D bubbles
export const CityImageOrb: React.FC<{
  cityName: string;
  country: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}> = ({ cityName, country, size = 'md', className = '', animate = true }) => {
  const [imageError, setImageError] = useState(false);

  const sizeMap = {
    sm: { container: 'w-16 h-16', imageSize: 64 },
    md: { container: 'w-24 h-24', imageSize: 96 },
    lg: { container: 'w-32 h-32', imageSize: 128 },
    xl: { container: 'w-48 h-48', imageSize: 192 },
  };

  const { container, imageSize } = sizeMap[size];
  const imageUrl = getCityImageUrl(cityName, { country, width: imageSize * 2, height: imageSize * 2 });
  const fallbackGradient = getCityFallbackGradient(cityName);

  return (
    <div
      className={`${container} rounded-full overflow-hidden relative ${
        animate ? 'animate-float' : ''
      } ${className}`}
      style={{
        boxShadow: `
          inset -8px -8px 20px rgba(255, 255, 255, 0.4),
          inset 8px 8px 20px rgba(0, 0, 0, 0.15),
          0 20px 40px rgba(0, 0, 0, 0.2)
        `,
      }}
    >
      {!imageError ? (
        <img
          src={imageUrl}
          alt={cityName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className="w-full h-full"
          style={{ background: fallbackGradient }}
        />
      )}
      {/* Glossy overlay effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
        }}
      />
      {/* City name label */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
        <p className="text-white text-[8px] font-medium text-center truncate leading-tight">
          {cityName}
        </p>
      </div>
    </div>
  );
};

// Real Estate Icons for use in decorative elements
const HouseIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const KeyIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
  </svg>
);

const BuildingIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </svg>
);

const MapPinIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

const HeartHomeIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const DoorIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 19V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v14H3v2h18v-2h-2zm-6 0H7V5h10v14h-4zm-2-8h2v2h-2z" />
  </svg>
);

// Floating Sphere with Real Estate Icon inside
export const RealEstateOrb: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'pink' | 'purple' | 'cyan' | 'peach' | 'green';
  icon?: 'house' | 'key' | 'building' | 'pin' | 'heart' | 'door';
  className?: string;
  animate?: boolean;
}> = ({ size = 'md', color = 'blue', icon = 'house', className = '', animate = true }) => {
  const sizeMap = {
    sm: { container: 'w-16 h-16', icon: 'w-6 h-6' },
    md: { container: 'w-24 h-24', icon: 'w-10 h-10' },
    lg: { container: 'w-32 h-32', icon: 'w-14 h-14' },
    xl: { container: 'w-48 h-48', icon: 'w-20 h-20' },
  };

  const gradientMap = {
    blue: { bg: 'from-blue-200 via-blue-300 to-indigo-400', iconColor: 'text-blue-600/60' },
    pink: { bg: 'from-pink-200 via-rose-300 to-pink-400', iconColor: 'text-pink-600/60' },
    purple: { bg: 'from-purple-200 via-violet-300 to-purple-400', iconColor: 'text-purple-600/60' },
    cyan: { bg: 'from-cyan-200 via-sky-300 to-blue-400', iconColor: 'text-cyan-600/60' },
    peach: { bg: 'from-orange-100 via-pink-200 to-rose-300', iconColor: 'text-orange-600/60' },
    green: { bg: 'from-green-200 via-emerald-300 to-teal-400', iconColor: 'text-green-600/60' },
  };

  const IconComponent = {
    house: HouseIcon,
    key: KeyIcon,
    building: BuildingIcon,
    pin: MapPinIcon,
    heart: HeartHomeIcon,
    door: DoorIcon,
  }[icon];

  const { container, icon: iconSize } = sizeMap[size];
  const { bg, iconColor } = gradientMap[color];

  return (
    <div
      className={`${container} rounded-full bg-gradient-to-br ${bg} shadow-2xl relative flex items-center justify-center ${
        animate ? 'animate-float' : ''
      } ${className}`}
      style={{
        boxShadow: `
          inset -8px -8px 20px rgba(255, 255, 255, 0.6),
          inset 8px 8px 20px rgba(0, 0, 0, 0.1),
          0 20px 40px rgba(0, 0, 0, 0.15)
        `,
      }}
    >
      <IconComponent className={`${iconSize} ${iconColor}`} />
    </div>
  );
};

// Floating 3D Sphere with gradient
export const FloatingSphere: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'pink' | 'purple' | 'cyan' | 'peach';
  className?: string;
  animate?: boolean;
}> = ({ size = 'md', color = 'blue', className = '', animate = true }) => {
  const sizeMap = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  };

  const gradientMap = {
    blue: 'from-blue-200 via-blue-300 to-indigo-400',
    pink: 'from-pink-200 via-rose-300 to-pink-400',
    purple: 'from-purple-200 via-violet-300 to-purple-400',
    cyan: 'from-cyan-200 via-sky-300 to-blue-400',
    peach: 'from-orange-100 via-pink-200 to-rose-300',
  };

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${gradientMap[color]} shadow-2xl ${
        animate ? 'animate-float' : ''
      } ${className}`}
      style={{
        boxShadow: `
          inset -8px -8px 20px rgba(255, 255, 255, 0.6),
          inset 8px 8px 20px rgba(0, 0, 0, 0.1),
          0 20px 40px rgba(0, 0, 0, 0.15)
        `,
      }}
    />
  );
};

// Glossy 3D Pill/Capsule shape
export const GlossyPill: React.FC<{
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'pink' | 'purple' | 'cyan';
  className?: string;
}> = ({ orientation = 'vertical', size = 'md', color = 'blue', className = '' }) => {
  const sizeMap = {
    sm: orientation === 'vertical' ? 'w-8 h-20' : 'w-20 h-8',
    md: orientation === 'vertical' ? 'w-12 h-32' : 'w-32 h-12',
    lg: orientation === 'vertical' ? 'w-16 h-44' : 'w-44 h-16',
  };

  const gradientMap = {
    blue: 'from-blue-300 via-blue-400 to-indigo-500',
    pink: 'from-pink-300 via-rose-400 to-pink-500',
    purple: 'from-purple-300 via-violet-400 to-purple-500',
    cyan: 'from-cyan-300 via-sky-400 to-blue-500',
  };

  return (
    <div
      className={`${sizeMap[size]} rounded-full bg-gradient-to-br ${gradientMap[color]} ${className}`}
      style={{
        boxShadow: `
          inset -4px -4px 15px rgba(255, 255, 255, 0.5),
          inset 4px 4px 15px rgba(0, 0, 0, 0.1),
          0 15px 30px rgba(0, 0, 0, 0.2)
        `,
      }}
    />
  );
};

// Soft 3D Cone
export const SoftCone: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  color?: 'pink' | 'blue' | 'purple' | 'peach';
  className?: string;
}> = ({ size = 'md', color = 'pink', className = '' }) => {
  const sizeMap = {
    sm: { width: 40, height: 60 },
    md: { width: 60, height: 90 },
    lg: { width: 80, height: 120 },
  };

  const colorMap = {
    pink: { base: '#fbb6ce', tip: '#f687b3' },
    blue: { base: '#90cdf4', tip: '#63b3ed' },
    purple: { base: '#d6bcfa', tip: '#b794f4' },
    peach: { base: '#fbd38d', tip: '#f6ad55' },
  };

  const { width, height } = sizeMap[size];
  const colors = colorMap[color];

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 60 90"
      className={className}
      style={{ filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.15))' }}
    >
      <defs>
        <linearGradient id={`coneGrad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.base} />
          <stop offset="100%" stopColor={colors.tip} />
        </linearGradient>
      </defs>
      <ellipse cx="30" cy="80" rx="28" ry="8" fill={colors.base} opacity="0.6" />
      <path
        d="M30 5 L55 80 Q30 90 5 80 Z"
        fill={`url(#coneGrad-${color})`}
      />
      <ellipse cx="30" cy="80" rx="25" ry="6" fill={colors.tip} opacity="0.3" />
    </svg>
  );
};

// Abstract Wave/Ribbon shape
export const WaveRibbon: React.FC<{
  color?: 'blue-pink' | 'purple-cyan' | 'pink-peach';
  className?: string;
}> = ({ color = 'blue-pink', className = '' }) => {
  const gradientMap = {
    'blue-pink': { start: '#93c5fd', mid: '#c4b5fd', end: '#fbcfe8' },
    'purple-cyan': { start: '#c4b5fd', mid: '#a5f3fc', end: '#6ee7b7' },
    'pink-peach': { start: '#fda4af', mid: '#fdba74', end: '#fde68a' },
  };

  const colors = gradientMap[color];

  return (
    <svg
      viewBox="0 0 200 100"
      className={`w-48 h-24 ${className}`}
      style={{ filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.1))' }}
    >
      <defs>
        <linearGradient id={`waveGrad-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.start} />
          <stop offset="50%" stopColor={colors.mid} />
          <stop offset="100%" stopColor={colors.end} />
        </linearGradient>
      </defs>
      <path
        d="M0 50 Q25 20, 50 50 T100 50 T150 50 T200 50 L200 70 Q175 100, 150 70 T100 70 T50 70 T0 70 Z"
        fill={`url(#waveGrad-${color})`}
        opacity="0.9"
      />
    </svg>
  );
};

// Donut/Torus shape
export const GlassyDonut: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  color?: 'pink' | 'blue' | 'purple';
  className?: string;
}> = ({ size = 'md', color = 'pink', className = '' }) => {
  const sizeMap = {
    sm: 60,
    md: 100,
    lg: 140,
  };

  const colorMap = {
    pink: { outer: '#fbb6ce', inner: '#f687b3', shadow: '#be185d' },
    blue: { outer: '#93c5fd', inner: '#60a5fa', shadow: '#1e40af' },
    purple: { outer: '#c4b5fd', inner: '#a78bfa', shadow: '#5b21b6' },
  };

  const dim = sizeMap[size];
  const colors = colorMap[color];

  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 100 100"
      className={className}
      style={{ filter: 'drop-shadow(0 10px 25px rgba(0, 0, 0, 0.15))' }}
    >
      <defs>
        <radialGradient id={`donutGrad-${color}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor="white" stopOpacity="0.6" />
          <stop offset="50%" stopColor={colors.outer} />
          <stop offset="100%" stopColor={colors.inner} />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="45" fill={`url(#donutGrad-${color})`} />
      <circle cx="50" cy="50" r="20" fill="#fafafa" />
      <ellipse cx="35" cy="35" rx="8" ry="5" fill="white" opacity="0.5" />
    </svg>
  );
};

// Floating Abstract Blob
export const AbstractBlob: React.FC<{
  variant?: 1 | 2 | 3;
  color?: 'blue' | 'pink' | 'purple' | 'multi';
  className?: string;
  animate?: boolean;
}> = ({ variant = 1, color = 'multi', className = '', animate = true }) => {
  const colorMap = {
    blue: { primary: '#93c5fd', secondary: '#3b82f6' },
    pink: { primary: '#fda4af', secondary: '#ec4899' },
    purple: { primary: '#c4b5fd', secondary: '#8b5cf6' },
    multi: { primary: '#c4b5fd', secondary: '#93c5fd' },
  };

  const colors = colorMap[color];
  const paths = {
    1: 'M44.4,-62.7C57.1,-53.6,66.8,-39.4,72.3,-23.4C77.8,-7.3,79.2,10.5,73.3,25.4C67.4,40.2,54.2,52.1,39.3,60.5C24.5,68.9,8,73.9,-8.5,73.8C-25,73.7,-41.5,68.6,-54.4,58.2C-67.2,47.8,-76.4,32.1,-79.2,15.2C-82,-1.8,-78.3,-20,-69.1,-33.7C-59.9,-47.4,-45.1,-56.7,-30.1,-64.6C-15.1,-72.5,0.1,-79,14.8,-77.6C29.5,-76.2,43.6,-66.9,44.4,-62.7Z',
    2: 'M47.5,-67.8C60.5,-56.8,69.2,-40.5,74.1,-23.1C79,-5.7,80.1,12.9,73.8,28.7C67.5,44.6,53.8,57.8,38.1,66.2C22.5,74.7,4.8,78.5,-12.7,76.5C-30.3,74.5,-47.7,66.7,-60.2,53.8C-72.7,40.9,-80.4,22.9,-81.3,4.4C-82.2,-14.1,-76.3,-33.1,-64.5,-46.5C-52.7,-59.9,-35,-67.8,-17.5,-72.2C0,-76.5,17.4,-77.4,32.4,-71.8C47.5,-66.1,60.1,-54,47.5,-67.8Z',
    3: 'M39.5,-52.3C52.1,-44.9,64.4,-34.3,70.3,-20.6C76.2,-6.9,75.7,9.8,69.5,24.1C63.2,38.4,51.2,50.2,37.3,57.8C23.4,65.3,7.6,68.6,-8.2,68.1C-24,67.5,-39.9,63.1,-52.5,53.7C-65.1,44.2,-74.5,29.8,-77.6,13.8C-80.7,-2.2,-77.6,-19.8,-69,-33.4C-60.3,-47,-46.2,-56.6,-31.7,-62.7C-17.3,-68.9,-2.5,-71.7,10.5,-69.1C23.6,-66.5,35.1,-58.6,39.5,-52.3Z',
  };

  return (
    <svg
      viewBox="0 0 200 200"
      className={`w-40 h-40 ${animate ? 'animate-morph' : ''} ${className}`}
      style={{ filter: 'drop-shadow(0 15px 30px rgba(0, 0, 0, 0.1))' }}
    >
      <defs>
        <linearGradient id={`blobGrad-${color}-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.primary} />
          <stop offset="100%" stopColor={colors.secondary} />
        </linearGradient>
      </defs>
      <g transform="translate(100 100)">
        <path d={paths[variant]} fill={`url(#blobGrad-${color}-${variant})`} />
      </g>
    </svg>
  );
};

// Glass morphism floating card with 3D effect
export const GlassCard3D: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div
      className={`backdrop-blur-xl bg-white/30 rounded-3xl border border-white/50 p-6 ${className}`}
      style={{
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.1),
          inset 0 -2px 6px rgba(255, 255, 255, 0.4),
          inset 0 2px 6px rgba(255, 255, 255, 0.8)
        `,
        transform: 'perspective(1000px) rotateX(2deg)',
      }}
    >
      {children}
    </div>
  );
};

// Decorative 3D Scene - combines multiple elements
export const Decorative3DScene: React.FC<{
  variant?: 'hero' | 'pricing' | 'minimal';
  className?: string;
}> = ({ variant = 'hero', className = '' }) => {
  if (variant === 'hero') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <FloatingSphere
          size="xl"
          color="blue"
          className="absolute -top-10 -right-10 opacity-60"
        />
        <FloatingSphere
          size="lg"
          color="pink"
          className="absolute top-1/3 -left-16 opacity-50"
          animate={false}
        />
        <GlossyPill
          orientation="vertical"
          size="lg"
          color="purple"
          className="absolute bottom-20 right-1/4 opacity-40 rotate-12"
        />
        <AbstractBlob
          variant={2}
          color="multi"
          className="absolute -bottom-20 left-1/4 opacity-30"
        />
        <WaveRibbon
          color="blue-pink"
          className="absolute top-1/2 right-10 opacity-40 rotate-[-15deg]"
        />
      </div>
    );
  }

  if (variant === 'pricing') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <FloatingSphere
          size="lg"
          color="cyan"
          className="absolute -top-16 left-1/4 opacity-40"
        />
        <FloatingSphere
          size="md"
          color="peach"
          className="absolute bottom-10 right-10 opacity-50"
        />
        <GlassyDonut
          size="lg"
          color="purple"
          className="absolute top-1/3 -right-10 opacity-30"
        />
        <SoftCone
          size="lg"
          color="pink"
          className="absolute bottom-1/4 left-10 opacity-40"
        />
      </div>
    );
  }

  // minimal variant
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <FloatingSphere
        size="md"
        color="blue"
        className="absolute top-10 right-10 opacity-30"
      />
      <FloatingSphere
        size="sm"
        color="pink"
        className="absolute bottom-10 left-10 opacity-30"
      />
    </div>
  );
};

// 3D Loading Spinner - Beautiful animated loading state
export const Loader3D: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}> = ({ size = 'md', text }) => {
  const sizeMap = {
    sm: { container: 'w-16 h-16', orb: 'w-3 h-3' },
    md: { container: 'w-24 h-24', orb: 'w-4 h-4' },
    lg: { container: 'w-32 h-32', orb: 'w-5 h-5' },
  };

  const { container, orb } = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${container} relative`}>
        {/* Central glowing sphere */}
        <div
          className="absolute inset-0 m-auto w-1/2 h-1/2 rounded-full bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300"
          style={{
            boxShadow: `
              0 0 20px rgba(147, 197, 253, 0.5),
              0 0 40px rgba(196, 181, 253, 0.3),
              inset -3px -3px 10px rgba(255, 255, 255, 0.6)
            `,
            animation: 'pulse-glow-center 2s ease-in-out infinite',
          }}
        />

        {/* Orbiting spheres */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              animation: `orbit-3d 2s linear infinite`,
              animationDelay: `${i * 0.67}s`,
            }}
          >
            <div
              className={`${orb} rounded-full absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2`}
              style={{
                background: i === 0
                  ? 'linear-gradient(135deg, #93c5fd, #3b82f6)'
                  : i === 1
                  ? 'linear-gradient(135deg, #c4b5fd, #8b5cf6)'
                  : 'linear-gradient(135deg, #fda4af, #ec4899)',
                boxShadow: `
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset -1px -1px 3px rgba(255, 255, 255, 0.4)
                `,
              }}
            />
          </div>
        ))}
      </div>

      {text && (
        <p className="mt-4 text-gray-500 text-sm font-medium animate-pulse">{text}</p>
      )}

      <style>{`
        @keyframes orbit-3d {
          0% {
            transform: rotateX(60deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(60deg) rotateZ(360deg);
          }
        }

        @keyframes pulse-glow-center {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

// Empty State 3D Illustration
export const EmptyState3D: React.FC<{
  variant?: 'search' | 'saved' | 'inbox' | 'general';
  title?: string;
  description?: string;
  className?: string;
}> = ({ variant = 'general', title, description, className = '' }) => {
  const variants = {
    search: { color1: 'blue', color2: 'cyan', icon: '🔍' },
    saved: { color1: 'pink', color2: 'purple', icon: '💜' },
    inbox: { color1: 'purple', color2: 'blue', icon: '📬' },
    general: { color1: 'blue', color2: 'pink', icon: '✨' },
  };

  const { color1, color2, icon } = variants[variant];

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="relative w-40 h-40 mb-6">
        {/* Background blobs */}
        <div className="absolute inset-0 opacity-30">
          <AbstractBlob variant={1} color={color1 as any} animate />
        </div>

        {/* Main floating shapes */}
        <div className="absolute top-4 left-4 animate-float">
          <FloatingSphere size="md" color={color1 as any} />
        </div>
        <div className="absolute bottom-4 right-4 animate-float" style={{ animationDelay: '1s' }}>
          <FloatingSphere size="sm" color={color2 as any} />
        </div>

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center text-5xl">
          {icon}
        </div>
      </div>

      {title && (
        <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
      )}
      {description && (
        <p className="text-gray-500 text-center max-w-sm">{description}</p>
      )}
    </div>
  );
};

// CSS Keyframes (add to global styles or inject via styled-jsx)
export const Decorative3DStyles: React.FC = () => (
  <style>{`
    @keyframes float {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      25% {
        transform: translateY(-10px) rotate(2deg);
      }
      50% {
        transform: translateY(-5px) rotate(-1deg);
      }
      75% {
        transform: translateY(-15px) rotate(1deg);
      }
    }

    @keyframes morph {
      0%, 100% {
        transform: scale(1) rotate(0deg);
      }
      25% {
        transform: scale(1.05) rotate(2deg);
      }
      50% {
        transform: scale(0.98) rotate(-2deg);
      }
      75% {
        transform: scale(1.02) rotate(1deg);
      }
    }

    @keyframes float-slow {
      0%, 100% {
        transform: translateY(0px) translateX(0px);
      }
      33% {
        transform: translateY(-20px) translateX(10px);
      }
      66% {
        transform: translateY(-10px) translateX(-5px);
      }
    }

    @keyframes pulse-glow {
      0%, 100% {
        opacity: 0.4;
        filter: blur(40px);
      }
      50% {
        opacity: 0.6;
        filter: blur(50px);
      }
    }

    .animate-float {
      animation: float 6s ease-in-out infinite;
    }

    .animate-float-slow {
      animation: float-slow 8s ease-in-out infinite;
    }

    .animate-morph {
      animation: morph 10s ease-in-out infinite;
    }

    .animate-pulse-glow {
      animation: pulse-glow 4s ease-in-out infinite;
    }

    /* Split bubble animation */
    @keyframes split-bubble {
      0% {
        transform: translate(0, 0) scale(1);
        opacity: 0.6;
      }
      20% {
        transform: translate(calc(var(--split-x) * 0.2), calc(var(--split-y) * 0.2)) scale(1.1);
        opacity: 0.5;
      }
      100% {
        transform: translate(var(--split-x), var(--split-y)) scale(0.3);
        opacity: 0;
      }
    }

    .animate-split-bubble {
      animation: split-bubble 2s ease-out forwards;
    }

    /* Gradient text animation */
    @keyframes gradient-shift {
      0%, 100% {
        background-position: 0% 50%;
      }
      50% {
        background-position: 100% 50%;
      }
    }

    .animate-gradient-text {
      background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899, #3b82f6);
      background-size: 300% 100%;
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: gradient-shift 5s ease infinite;
    }
  `}</style>
);

export default {
  RandomCityBubbles,
  CityImageOrb,
  RealEstateOrb,
  FloatingSphere,
  GlossyPill,
  SoftCone,
  WaveRibbon,
  GlassyDonut,
  AbstractBlob,
  GlassCard3D,
  Decorative3DScene,
  Decorative3DStyles,
  Loader3D,
  EmptyState3D,
};
