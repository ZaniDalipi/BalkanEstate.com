// SunIndicator
// The sun drawn in the sky of the 3D map, placed where the simulated sun really
// is relative to the camera so it visibly "casts" the shadows below it.

import React from 'react';

interface SunIndicatorProps {
  /** Degrees clockwise from north. */
  azimuth: number;
  /** Degrees above the horizon. */
  altitude: number;
  /** Map bearing: the compass direction the camera looks towards. */
  bearing: number;
}

// Half of the horizontal field of view we map onto the container width
const HALF_FOV = 60;

export const SunIndicator: React.FC<SunIndicatorProps> = ({ azimuth, altitude, bearing }) => {
  if (!(altitude > 0)) return null;

  // Sun direction relative to where the camera looks, in (-180, 180]
  const relative = ((azimuth - bearing + 540) % 360) - 180;
  // A sun behind the camera waits at the nearest edge, so the light source
  // is always findable, smaller and dimmer so it doesn't read as "in view"
  const inView = Math.abs(relative) <= HALF_FOV;
  // Kept inside 12–84% so it never sits under the title card or the right-hand controls
  const x = 48 + Math.max(-1, Math.min(1, relative / HALF_FOV)) * 36;
  // High sun near the top edge, low sun down towards the horizon
  const y = 9 + (1 - Math.min(altitude, 60) / 60) * 14;

  // Golden hour: warm orange below ~12°, white-yellow at midday
  const warmth = Math.max(0, Math.min(1, (12 - altitude) / 12));
  const core = warmth > 0.5 ? '#ffd9a0' : '#fffbe8';
  const mid = `rgba(255, ${Math.round(225 - warmth * 95)}, ${Math.round(110 - warmth * 70)}, 0.95)`;
  const glow = `rgba(255, ${Math.round(200 - warmth * 90)}, ${Math.round(90 - warmth * 50)}, 0.55)`;
  const size = inView ? 64 : 52;

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none z-[1] transition-[left,top,opacity] duration-500 ease-out motion-reduce:transition-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, transform: 'translate(-50%, -50%)', opacity: inView ? 1 : 0.85 }}
    >
      {/* Wide atmospheric halo */}
      <div
        className="absolute rounded-full"
        style={{
          inset: -size * 1.4,
          background: `radial-gradient(circle, ${glow} 0%, rgba(255,220,150,0.18) 35%, rgba(255,220,150,0) 70%)`,
        }}
      />
      {/* Rays */}
      <div
        className="absolute rounded-full animate-[spin_40s_linear_infinite] motion-reduce:animate-none"
        style={{
          inset: -size * 0.55,
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
          boxShadow: `0 0 ${size * 0.5}px ${size * 0.2}px ${glow}, 0 0 ${size}px ${size * 0.4}px rgba(255,210,120,0.35)`,
        }}
      />
    </div>
  );
};

export default SunIndicator;
