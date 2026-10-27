/**
 * Client-side checks for scene view images and view-key slugs. The server
 * re-validates everything; these only give the owner fast, clear feedback.
 */
import { SCENE_VIEW_KEY_PATTERN } from '../../../types';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/** Below this width a facade render looks soft on large screens. */
export const RECOMMENDED_MIN_WIDTH = 1600;

export type ImageFileError = 'type' | 'size';

export const checkImageFile = (file: Pick<File, 'type' | 'size'>): ImageFileError | null => {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'type';
  if (file.size > MAX_IMAGE_BYTES) return 'size';
  return null;
};

/** Natural pixel size of an image file, or null if the browser cannot decode it. */
export const readImageDimensions = (file: File): Promise<{ width: number; height: number } | null> =>
  new Promise((resolve) => {
    if (typeof URL === 'undefined' || typeof Image === 'undefined') return resolve(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'gj', ђ: 'dj', е: 'e', ж: 'zh', з: 'z', ѕ: 'dz', и: 'i', ј: 'j',
  й: 'y', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ќ: 'kj',
  ћ: 'c', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', џ: 'dz', ш: 'sh', щ: 'sht', ъ: 'a', ь: '', ю: 'yu', я: 'ya',
};

/** URL-safe view key from a view name (Latin with diacritics stripped, Cyrillic transliterated). */
export const slugifyViewKey = (name: string): string => {
  const latin = name
    .toLowerCase()
    .replace(/[а-яѓђѕјљњќћџ]/g, (ch) => CYRILLIC[ch] ?? '')
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return latin
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
};

/** A view key for `name` that is valid and not already used by the target's views. */
export const uniqueViewKey = (name: string, taken: readonly string[]): string => {
  let base = slugifyViewKey(name);
  if (!base || !SCENE_VIEW_KEY_PATTERN.test(base)) base = taken.length === 0 ? 'main' : 'view';
  if (!taken.includes(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const suffix = `-${n}`;
    const key = `${base.slice(0, 40 - suffix.length)}${suffix}`;
    if (!taken.includes(key)) return key;
  }
  return `${base.slice(0, 30)}-${Date.now().toString(36)}`.slice(0, 40);
};
