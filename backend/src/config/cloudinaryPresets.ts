/**
 * Cloudinary delivery presets — the ONLY transformations the site requests.
 *
 * With "Strict transformations" on (Cloudinary → Settings → Security), an
 * image URL can only use a named transformation that is "allowed for strict
 * mode"; any ad-hoc `w_480,c_limit,…` URL is refused. So every size the app
 * shows maps to one of the presets below, used as `t_<name>` in the URL, and
 * the backend registers them all at startup (services/media/cloudinaryPresetSync).
 *
 * This file is the single source of truth: the frontend imports it too
 * (config/cloudinaryConfig.ts) so URLs and registered presets can't drift.
 * Keep it pure — no imports — so both builds can load it.
 */

/** Width buckets; requests round UP to the next one. Masters are ≤1920px. */
export const PRESET_WIDTHS = [32, 64, 128, 240, 320, 480, 640, 800, 1080, 1280, 1600, 1920] as const;

/** Aspect ratios for fixed boxes (width × height requests), as `w:h`. */
export const PRESET_RATIOS = {
  '1x1': '1:1',
  '4x3': '4:3',
  '3x4': '3:4',
  '3x2': '3:2',
  '16x9': '16:9',
  '2x1': '2:1',
} as const;

export type PresetRatioKey = keyof typeof PRESET_RATIOS;

const PREFIX = 'be';

/** Blurred 32px placeholder shown while a photo loads. */
export const LQIP_PRESET = `${PREFIX}_lqip`;
/** 1200×630 share card, padded on white, JPEG (crawlers don't all read WebP). */
export const OG_PRESET = `${PREFIX}_og`;

export const widthPresetName = (width: number): string => `${PREFIX}_w${width}`;
export const boxPresetName = (ratio: PresetRatioKey, width: number): string => `${PREFIX}_r${ratio}_w${width}`;

/** Round a width up to the nearest preset width (capped at the largest). */
export const snapPresetWidth = (width: number): number => {
  for (const w of PRESET_WIDTHS) if (width <= w) return w;
  return PRESET_WIDTHS[PRESET_WIDTHS.length - 1];
};

/** The preset ratio closest to width/height (compared on a log scale, so 2:1 and 1:2 are equally far from 1:1). */
export const snapPresetRatio = (width: number, height: number): PresetRatioKey => {
  const target = Math.log(width / height);
  let best: PresetRatioKey = '1x1';
  let bestDistance = Infinity;
  for (const [key, ratio] of Object.entries(PRESET_RATIOS) as Array<[PresetRatioKey, string]>) {
    const [w, h] = ratio.split(':').map(Number);
    const distance = Math.abs(Math.log(w / h) - target);
    if (distance < bestDistance) {
      best = key;
      bestDistance = distance;
    }
  }
  return best;
};

/**
 * Every preset name → its Cloudinary transformation string. This is exactly
 * what gets registered, so every name the frontend can produce is in here.
 */
export const buildPresetDefinitions = (): Record<string, string> => {
  const presets: Record<string, string> = {
    [LQIP_PRESET]: 'f_auto,q_auto:eco,w_32,e_blur:400',
    [OG_PRESET]: 'f_jpg,q_auto,w_1200,h_630,c_pad,b_white',
  };
  for (const width of PRESET_WIDTHS) {
    // c_limit: shrink only, never upscale past the master.
    presets[widthPresetName(width)] = `f_auto,q_auto,c_limit,w_${width}`;
    for (const [key, ratio] of Object.entries(PRESET_RATIOS) as Array<[PresetRatioKey, string]>) {
      presets[boxPresetName(key, width)] = `f_auto,q_auto,c_fill,g_auto,ar_${ratio},w_${width}`;
    }
  }
  return presets;
};
