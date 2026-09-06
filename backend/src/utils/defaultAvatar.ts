/**
 * The generated character a person gets before they ever open the avatar
 * customiser.
 *
 * This mirrors `components/shared/DefaultAvatar.tsx` on the frontend, byte for
 * byte, so the options this file persists produce exactly the face the person
 * already sees on their own profile. It is duplicated rather than imported
 * because the backend builds and deploys on its own; `src/tests/avatar-parity.test.ts`
 * imports both and fails the build if they ever drift apart.
 *
 * Why persist at all: a payload's id is not one thing. A property's seller
 * arrives with an obfuscated id, an agent with their user id, the signed-in
 * user with a raw ObjectId — so a face derived from "the id" came out
 * different on every surface for the same person. A saved `avatarOptions` is
 * the same JSON everywhere, which is what the cards, the inbox, the profile
 * and the admin lists all read.
 */

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

/** The face for `seed` — same input, same character, on the server or in the browser. */
export function generateAvatarOptionsFromSeed(
  seed: string,
  gender?: 'male' | 'female' | 'other'
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
 * The options to store for a user who has neither an uploaded photo nor a
 * customised avatar, as a JSON string ready for `user.avatarOptions`.
 *
 * Seeded with the raw ObjectId, which is what the signed-in user's own
 * surfaces have always generated from — so persisting this does not change
 * the face anybody is already used to seeing on their profile; it just makes
 * every other surface show the same one.
 */
export function defaultAvatarOptionsForUser(
  userId: string,
  gender?: 'male' | 'female' | 'other'
): string {
  return JSON.stringify(generateAvatarOptionsFromSeed(userId, gender));
}
