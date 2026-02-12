import React, { useState } from 'react';

interface DefaultAvatarProps {
  gender?: 'male' | 'female' | 'other';
  seed?: string;
  className?: string;
}

// ─── 3D Avatar image sets ────────────────────────────────────────────────────
// Professional 3D-rendered avatar illustrations via DiceBear Avatars API
// These generate unique, deterministic 3D-style avatars based on a seed string.

// Simple deterministic hash from a string
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Deterministic background colors — professional/muted tones
const BG_COLORS = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];

/**
 * 3D-style default avatar for agents/users without a profile photo.
 *
 * Uses the DiceBear "personas" style API to generate a unique, deterministic
 * 3D-look character based on the seed (agent id/name). Each agent always
 * gets the same avatar. The avatar renders as an <img> with an inline SVG
 * fallback while loading.
 *
 * Males default to a professional look, females get a distinct style.
 * If the external image fails to load, a clean gradient + initials fallback renders.
 */
const DefaultAvatar: React.FC<DefaultAvatarProps> = ({ gender, seed = 'default', className = 'w-full h-full' }) => {
  const [imgError, setImgError] = useState(false);

  const bgIdx = hashSeed(seed) % BG_COLORS.length;
  const bgColor = BG_COLORS[bgIdx];

  // DiceBear "notionists" style — clean 3D-like illustrated avatars
  // Deterministic: same seed always produces the same avatar
  const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bgColor}&gesture=hand&gestureProbability=10`;

  // Get initials for fallback
  const initials = seed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');

  const isFemale = gender === 'female';

  if (imgError) {
    // Fallback: gradient circle with initials
    return (
      <svg
        viewBox="0 0 200 200"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="fb-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isFemale ? '#E8D5F5' : '#D5E5F5'} />
            <stop offset="100%" stopColor={isFemale ? '#C4A8E0' : '#A8C4E0'} />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="100" fill="url(#fb-bg)" />
        <text
          x="100"
          y="108"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="64"
          fontWeight="600"
          fontFamily="Inter, system-ui, sans-serif"
          fill={isFemale ? '#7C3AED' : '#2563EB'}
          opacity="0.7"
        >
          {initials || '?'}
        </text>
      </svg>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt="Avatar"
      className={className}
      style={{ objectFit: 'cover', borderRadius: '50%' }}
      onError={() => setImgError(true)}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
};

export default React.memo(DefaultAvatar);
