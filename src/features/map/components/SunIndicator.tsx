// SunIndicator
// The sun in the 3D map's sky, travelling a straight horizontal track from
// sunrise (left) to sunset (right) as the simulated time advances. Its colour
// follows the real solar altitude: white-yellow at midday, orange near the
// horizon.

import React from 'react';

interface SunIndicatorProps {
  /** Degrees above the horizon. */
  altitude: number;
  /** Simulated local clock time, decimal hours. */
  hour: number;
  /** Sunrise / sunset for the simulated day, decimal hours. */
  sunrise: number;
  sunset: number;
}

// Track spans 12–84% of the width: clear of the title card on the left and
// the control column on the right
const TRACK_LEFT = 12;
const TRACK_WIDTH = 72;
const TRACK_TOP = 13;
const SIZE = 60;

export const SunIndicator: React.FC<SunIndicatorProps> = ({ altitude, hour, sunrise, sunset }) => {
  if (!(altitude > 0) || !(sunset > sunrise)) return null;

  const fraction = Math.max(0, Math.min(1, (hour - sunrise) / (sunset - sunrise)));

  // Golden hour: warm orange below ~12°, white-yellow at midday
  const warmth = Math.max(0, Math.min(1, (12 - altitude) / 12));
  const core = warmth > 0.5 ? '#ffd9a0' : '#fffbe8';
  const mid = `rgba(255, ${Math.round(225 - warmth * 95)}, ${Math.round(110 - warmth * 70)}, 0.95)`;
  const glow = `rgba(255, ${Math.round(200 - warmth * 90)}, ${Math.round(90 - warmth * 50)}, 0.55)`;

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none z-[1]"
      style={{ left: `${TRACK_LEFT}%`, width: `${TRACK_WIDTH}%`, top: `${TRACK_TOP}%` }}
    >
      {/* The day's path: a faint horizontal line from sunrise to sunset */}
      <div
        className="absolute left-0 right-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, rgba(255,200,120,0) 0%, rgba(255,215,150,0.55) 12%, rgba(255,235,190,0.7) 50%, rgba(255,215,150,0.55) 88%, rgba(255,200,120,0) 100%)' }}
      />
      <span className="absolute -left-1 -top-2.5 text-sm leading-none opacity-80">{'\u{1F305}'}</span>
      <span className="absolute -right-1 -top-2.5 text-sm leading-none opacity-80">{'\u{1F307}'}</span>

      {/* Full-width carrier moved with a transform (GPU-composited, no layout),
          so the sun glides in a straight line frame by frame */}
      <div
        className="absolute left-0 top-0 w-full transition-transform duration-150 ease-linear motion-reduce:transition-none"
        style={{ transform: `translateX(${fraction * 100}%)`, willChange: 'transform' }}
      >
        <div className="absolute" style={{ width: SIZE, height: SIZE, left: -SIZE / 2, top: -SIZE / 2 }}>
          {/* Wide atmospheric halo */}
          <div
            className="absolute rounded-full"
            style={{
              inset: -SIZE * 1.4,
              background: `radial-gradient(circle, ${glow} 0%, rgba(255,220,150,0.18) 35%, rgba(255,220,150,0) 70%)`,
            }}
          />
          {/* Rays */}
          <div
            className="absolute rounded-full animate-[spin_40s_linear_infinite] motion-reduce:animate-none"
            style={{
              inset: -SIZE * 0.55,
              background: `repeating-conic-gradient(from 0deg, ${glow} 0deg 4deg, rgba(255,255,255,0) 4deg 22.5deg)`,
              maskImage: 'radial-gradient(circle, transparent 38%, black 45%, transparent 72%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 38%, black 45%, transparent 72%)',
            }}
          />
          {/* Disc */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 45% 42%, #ffffff 0%, ${core} 35%, ${mid} 75%, rgba(255,190,90,0.9) 100%)`,
              boxShadow: `0 0 ${SIZE * 0.5}px ${SIZE * 0.2}px ${glow}, 0 0 ${SIZE}px ${SIZE * 0.4}px rgba(255,210,120,0.35)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SunIndicator;
