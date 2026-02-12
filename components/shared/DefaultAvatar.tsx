import React from 'react';
import { buildAvatarUrl, getDefaultAvatarOptions, parseAvatarOptions, type AvatarOptions } from './AvatarCustomizer';

interface DefaultAvatarProps {
  gender?: 'male' | 'female' | 'other';
  seed?: string;
  avatarOptions?: string; // JSON string of AvatarOptions (stored in user profile)
  className?: string;
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
const CLOTHING_OPTS = ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'shirtCrewNeck', 'shirtVNeck'];
const CLOTHES_COLORS = ['262e33', '3c4f5c', '25557c', '929598', '5199e4'];
const ACCESSORIES_OPTS = ['', '', '', 'prescription01', 'prescription02', 'round', 'wayfarers'];
const FACIAL_HAIR_OPTS = ['', '', '', '', 'beardLight', 'beardMedium'];
const EYES_OPTS = ['default', 'happy', 'wink'];
const MOUTH_OPTS = ['smile', 'twinkle', 'default'];
const EYEBROW_OPTS = ['defaultNatural', 'flatNatural', 'raisedExcitedNatural'];

function deterministicPick<T>(arr: T[], seed: number, offset: number): T {
  return arr[(seed + offset * 7919) % arr.length]; // use a prime for better distribution
}

function generateFromSeed(seed: string, gender?: 'male' | 'female' | 'other'): AvatarOptions {
  const h = hashSeed(seed);
  const isFemale = gender === 'female';
  return {
    skinColor: deterministicPick(SKIN_COLORS, h, 1),
    hairColor: deterministicPick(HAIR_COLORS, h, 2),
    top: deterministicPick(isFemale ? FEMALE_HAIRS : MALE_HAIRS, h, 3),
    clothing: deterministicPick(CLOTHING_OPTS, h, 4),
    clothesColor: deterministicPick(CLOTHES_COLORS, h, 5),
    accessories: deterministicPick(ACCESSORIES_OPTS, h, 6),
    facialHair: isFemale ? '' : deterministicPick(FACIAL_HAIR_OPTS, h, 7),
    eyes: deterministicPick(EYES_OPTS, h, 8),
    mouth: deterministicPick(MOUTH_OPTS, h, 9),
    eyebrows: deterministicPick(EYEBROW_OPTS, h, 10),
  };
}

/**
 * Default avatar using DiceBear Avataaars style.
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
}) => {
  // Determine which options to use
  const parsed = parseAvatarOptions(avatarOptions);
  const options: AvatarOptions = parsed
    || (seed !== 'default' ? generateFromSeed(seed, gender) : getDefaultAvatarOptions(gender));

  const url = buildAvatarUrl(options);

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
