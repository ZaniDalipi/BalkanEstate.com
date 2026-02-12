import React from 'react';
import { buildAvatarUrl, getDefaultAvatarOptions, parseAvatarOptions, type AvatarOptions } from './AvatarCustomizer';

interface DefaultAvatarProps {
  gender?: 'male' | 'female' | 'other';
  seed?: string;
  avatarOptions?: string; // JSON string of AvatarOptions (stored in user profile)
  className?: string;
  show3d?: boolean; // Enable 3D depth effects
}

// Simple deterministic hash from a string
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Available option pools for deterministic random generation
const SKIN_COLORS = ['f8d5c0', 'edb98a', 'd08b5b', 'ae5d29', 'ffdbb4'];
const HAIR_COLORS = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370', 'c93305'];
const MALE_HAIRS = ['shortFlat', 'shortRound', 'shortWaved', 'shortCurly', 'theCaesar', 'theCaesarAndSidePart', 'sides'];
const FEMALE_HAIRS = ['longButNotTooLong', 'straight01', 'straight02', 'bob', 'bun', 'curly', 'curvy', 'miaWallace'];
const CLOTHING_OPTS = ['blazerAndShirt', 'blazerAndShirt', 'blazerAndSweater', 'blazerAndSweater', 'collarAndSweater'];
const CLOTHES_COLORS = ['262e33', '1a1a2e', '2d2d2d', '3c4f5c', '25557c', '4a3728', '2e3d30'];
const ACCESSORIES_OPTS = ['', '', '', 'prescription01', 'prescription02', 'round', 'wayfarers'];
const FACIAL_HAIR_OPTS = ['', '', '', '', 'beardLight', 'beardMedium'];
const FACIAL_HAIR_COLOR_OPTS = ['2c1b18', '4a312c', '724133', 'a55728', 'b58143', 'd6b370'];
const EYES_OPTS = ['default', 'happy', 'wink'];
const MOUTH_OPTS = ['smile', 'twinkle', 'default'];
const EYEBROW_OPTS = ['defaultNatural', 'flatNatural', 'raisedExcitedNatural'];

function deterministicPick<T>(arr: T[], seed: number, offset: number): T {
  return arr[(seed + offset * 7919) % arr.length]; // use a prime for better distribution
}

function generateFromSeed(seed: string, gender?: 'male' | 'female' | 'other'): AvatarOptions {
  const h = hashSeed(seed);
  const isFemale = gender === 'female';
  const facialHair = isFemale ? '' : deterministicPick(FACIAL_HAIR_OPTS, h, 7);
  return {
    skinColor: deterministicPick(SKIN_COLORS, h, 1),
    hairColor: deterministicPick(HAIR_COLORS, h, 2),
    top: deterministicPick(isFemale ? FEMALE_HAIRS : MALE_HAIRS, h, 3),
    clothing: deterministicPick(CLOTHING_OPTS, h, 4),
    clothesColor: deterministicPick(CLOTHES_COLORS, h, 5),
    accessories: deterministicPick(ACCESSORIES_OPTS, h, 6),
    facialHair,
    facialHairColor: facialHair ? deterministicPick(FACIAL_HAIR_COLOR_OPTS, h, 11) : '2c1b18',
    eyes: deterministicPick(EYES_OPTS, h, 8),
    mouth: deterministicPick(MOUTH_OPTS, h, 9),
    eyebrows: deterministicPick(EYEBROW_OPTS, h, 10),
  };
}

/**
 * Default avatar using DiceBear Avataaars style with 3D depth effects.
 *
 * Priority:
 * 1. If `avatarOptions` (JSON) is provided, use those exact customization settings
 * 2. If only `seed` is provided, generate a deterministic unique avatar from the seed
 * 3. Fallback to gender-based defaults
 */
const DefaultAvatar: React.FC<DefaultAvatarProps> = ({
  gender,
  seed = 'default',
  avatarOptions,
  className = 'w-full h-full',
  show3d = false,
}) => {
  // Determine which options to use
  const parsed = parseAvatarOptions(avatarOptions);
  const options: AvatarOptions = parsed
    || (seed !== 'default' ? generateFromSeed(seed, gender) : getDefaultAvatarOptions(gender));

  const url = buildAvatarUrl(options);

  if (show3d) {
    return (
      <div className={`relative ${className}`}>
        {/* Depth shadow beneath */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-b from-neutral-300/50 to-neutral-400/30 blur-xl translate-y-2 scale-95" />
        {/* Main avatar with 3D ring and glow */}
        <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-white/70 shadow-[0_6px_24px_rgba(0,0,0,0.18),inset_0_-2px_6px_rgba(0,0,0,0.08)] bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
          <img
            src={url}
            alt="Avatar"
            className="w-full h-full"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          {/* Glossy highlight overlay */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/35 via-transparent to-transparent pointer-events-none" />
          {/* Bottom ambient */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Avatar"
      className={className}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
};

export default React.memo(DefaultAvatar);
