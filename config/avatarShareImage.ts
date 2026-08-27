/**
 * Generated (DiceBear) avatars as shareable images.
 *
 * The app draws a user's generated avatar client-side with `@dicebear/core`,
 * which produces an inline SVG data URI — invisible to a social media crawler,
 * and SVG is not an image format Facebook or LinkedIn accept for `og:image`
 * anyway. For share cards we ask DiceBear's HTTP API for the same avatar as a
 * PNG, so an agent with no uploaded photo still shares the face their profile
 * page shows instead of the generic site image.
 *
 * Framework-free on purpose: this module is imported by the React UI, by the
 * Cloudflare Pages Functions that serve crawler HTML, and (mirrored) by the
 * Express OG middleware. Keep it free of React and of `@dicebear/*`.
 */

/** DiceBear avatar customization, as stored on the user profile. */
export interface AvatarOptions {
  skinColor: string;
  hairColor: string;
  top: string;
  clothing: string;
  clothesColor: string;
  accessories: string;
  facialHair: string;
  facialHairColor: string;
  eyes: string;
  mouth: string;
  eyebrows: string;
}

/** Matches the `@dicebear/core` major version in package.json. */
const DICEBEAR_AVATAAARS_PNG = 'https://api.dicebear.com/9.x/avataaars/png';

/**
 * DiceBear caps `size` at 256. That clears Facebook's 200×200 minimum for a
 * link-preview image, so the avatar renders as a square thumbnail.
 */
export const AVATAR_SHARE_SIZE = 256;

/** Background the app renders generated avatars on (see `buildAvatarUrl`). */
const AVATAR_BACKGROUND = 'b6e3f4';

/**
 * DiceBear option values are style keywords (`shortFlat`) or bare hex colours
 * (`f8d5c0`). `avatarOptions` is user-supplied JSON out of the database, so
 * anything that isn't one of those is dropped rather than pasted into a URL.
 */
function isSafeOptionValue(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9]{1,32}$/.test(value);
}

/**
 * Build the DiceBear HTTP URL for a set of avatar options, mirroring the
 * parameters `buildAvatarUrl` passes to `createAvatar` so the shared card shows
 * the same face as the profile page.
 */
export function buildAvatarShareUrl(
  options: AvatarOptions,
  size: number = AVATAR_SHARE_SIZE,
): string {
  const params = new URLSearchParams();
  params.set('size', String(Math.max(1, Math.min(Math.round(size), AVATAR_SHARE_SIZE))));
  params.set('backgroundColor', AVATAR_BACKGROUND);

  const set = (key: string, value: unknown) => {
    if (isSafeOptionValue(value)) params.set(key, value);
  };

  set('skinColor', options.skinColor);
  set('hairColor', options.hairColor);
  set('top', options.top);
  set('clothing', options.clothing);
  set('clothesColor', options.clothesColor);
  set('eyes', options.eyes);
  set('mouth', options.mouth);
  set('eyebrows', options.eyebrows);

  // Optional features are switched on with a probability, exactly as the
  // client-side builder does — omitting the probability would let DiceBear
  // randomly add glasses or a beard the user never chose.
  if (isSafeOptionValue(options.accessories)) {
    params.set('accessories', options.accessories);
    params.set('accessoriesProbability', '100');
  } else {
    params.set('accessoriesProbability', '0');
  }

  if (isSafeOptionValue(options.facialHair)) {
    params.set('facialHair', options.facialHair);
    params.set('facialHairProbability', '100');
    set('facialHairColor', options.facialHairColor);
  } else {
    params.set('facialHairProbability', '0');
  }

  return `${DICEBEAR_AVATAAARS_PNG}?${params.toString()}`;
}

/** Parse the JSON blob stored on the user profile, or null if unusable. */
export function parseAvatarOptions(json: string | undefined | null): AvatarOptions | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && parsed.skinColor) return parsed as AvatarOptions;
    return null;
  } catch {
    return null;
  }
}

// ─── Deterministic avatar from a seed ─────────────────────────────────────────

// Option pools for users who never customized their avatar. The profile page
// picks from these too, so a share card built from the same seed shows the
// same face.
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

/** Simple deterministic hash from a string. */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function deterministicPick<T>(arr: T[], seed: number, offset: number): T {
  return arr[(seed + offset * 7919) % arr.length]; // use a prime for better distribution
}

/**
 * The avatar shown for a user who never customized one — derived from a stable
 * seed (agent id, user id or name) so it never changes between visits.
 */
export function generateAvatarOptionsFromSeed(
  seed: string,
  gender?: 'male' | 'female' | 'other',
): AvatarOptions {
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
 * The share image for someone with no uploaded photo: their saved avatar if
 * they customized one, otherwise the deterministic avatar their profile page
 * already shows. Returns null when there is no seed to build one from.
 */
export function resolveAvatarShareUrl(input: {
  avatarOptions?: string | null;
  seed?: string;
  gender?: 'male' | 'female' | 'other';
}): string | null {
  const saved = parseAvatarOptions(input.avatarOptions);
  if (saved) return buildAvatarShareUrl(saved);

  const seed = input.seed?.trim();
  if (!seed) return null;

  return buildAvatarShareUrl(generateAvatarOptionsFromSeed(seed, input.gender));
}
