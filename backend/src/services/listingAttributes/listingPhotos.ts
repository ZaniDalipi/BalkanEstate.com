import { MAX_PROPERTY_IMAGES } from '../../config/uploadLimits';

/**
 * Choosing a listing's photos from what a source offers: only real photos
 * (no icons, flags, map markers, theme graphics or small thumbnails), each
 * photo once in its largest size, and never more than a listing may have.
 */

/** A listing has at most as many photos as the listing form allows. */
export const MAX_LISTING_PHOTOS = MAX_PROPERTY_IMAGES;

const JUNK_PATH_RE = new RegExp(
  [
    String.raw`\/(icons?|logos?|avatars?|sprites?|flags?|markers?|pins?|badges?|emoji|placeholders?|spinners?|loaders?|blank|pixel|spacer)[\/_.-]`,
    String.raw`[\/_-](icon|logo|avatar|flag|marker|sprite|placeholder|watermark|favicon)s?[\/_.-]`,
    String.raw`\/(wp-content\/)?(plugins|themes)\/[^?]*\/(img|image|images|assets)\/`,
    String.raw`\/(tiles?|rastertiles|vectortiles)\/`,
    String.raw`\{[xyzr]\}`,
    String.raw`(doubleclick|google-analytics|facebook\.(com|net)\/tr|\/pixel\.|gravatar\.com)`,
  ].join('|'),
  'i'
);
const NON_PHOTO_EXT_RE = /\.(svg|gif|ico|bmp)(\?|#|$)/i;

/** Width × height written in a URL ("770x483", "-150x150."), or 0 when none. */
const sizeInUrl = (url: string): number => {
  const name = url.split(/[?#]/)[0].split('/').pop() ?? '';
  const m = name.match(/(?:^|[-_.])(\d{2,4})x(\d{2,4})(?:[-_.]|$)/i) ?? name.match(/^(\d{3,4})x(\d{3})(?=\D|\d)/i);
  if (m) return Number(m[1]) * Number(m[2]);
  try {
    const q = new URL(url).searchParams;
    const w = Number(q.get('w') ?? q.get('width') ?? 0);
    const h = Number(q.get('h') ?? q.get('height') ?? 0);
    return w && h ? w * h : (w || h) ** 2;
  } catch {
    return 0;
  }
};

/** Small images are thumbnails of a photo shown elsewhere, or decoration. */
const MIN_PIXELS = 320 * 240;

/** True for an image that is not a listing photo. */
export const isJunkPhotoUrl = (url: string): boolean => {
  if (!url || url.startsWith('data:') || !/^https?:\/\//i.test(url)) return true;
  if (NON_PHOTO_EXT_RE.test(url) || JUNK_PATH_RE.test(url)) return true;
  if (/[?&](w|width|h|height)=1\b/i.test(url)) return true;
  const px = sizeInUrl(url);
  return px > 0 && px < MIN_PIXELS;
};

/**
 * One key for every size of the same photo: "1040x660224018383.jpg",
 * "770x483224018383.jpg" and "photo-1024x768.jpg" / "photo.jpg" each share a key.
 */
export const photoKey = (url: string): string => {
  let path = url.split('#')[0];
  let query = '';
  try {
    const u = new URL(url);
    ['w', 'width', 'h', 'height', 'size', 'thumb', 'resize', 'dim', 'q', 'quality', 'fit', 'crop', 'auto', 'fm', 'format'].forEach((p) => u.searchParams.delete(p));
    path = `${u.host}${u.pathname}`;
    query = u.searchParams.toString();
  } catch {
    // keep as is
  }
  const slash = path.lastIndexOf('/');
  const dir = path.slice(0, slash + 1).replace(/\/(\d{2,4}x\d{2,4}|thumbs?|small|medium|large|big|original|full|w\d{2,4})\//gi, '/');
  const name = path
    .slice(slash + 1)
    .toLowerCase()
    .replace(/^\d{3,4}x\d{3}(?=\w)/, '') // size glued in front: "770x483224018383.jpg"
    .replace(/[-_.]?\d{2,4}x\d{2,4}(?=[-_.])/g, '') // WordPress style: "photo-1024x768.jpg"
    .replace(/[-_.@](scaled|thumb|thumbnail|small|medium|large|big|2x|3x)(?=[-_.])/g, '')
    .replace(/\.(jpe?g|png|webp|avif)$/, '');
  return `${dir.toLowerCase()}${name}?${query}`;
};

const folderOf = (url: string): string => url.split(/[?#]/)[0].replace(/\/[^/]*$/, '/');

/** A folder named after one listing ("/source/Vlore-ALVS1455/"), not a date folder ("/uploads/2024/05/"). */
const isListingFolder = (folder: string): boolean => {
  const last = folder.split('/').filter(Boolean).pop() ?? '';
  return /\d/.test(last) && /\p{L}/u.test(last) && last.length >= 4;
};

/**
 * When a site keeps each listing's photos in its own folder and most photos
 * come from one of them, the odd ones from other listing folders are photos
 * of other listings shown on the page ("similar listings").
 */
export const keepListingFolder = (urls: string[]): string[] => {
  const counts = new Map<string, number>();
  for (const u of urls) counts.set(folderOf(u), (counts.get(folderOf(u)) ?? 0) + 1);
  if (counts.size < 2) return urls;
  const [top, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const othersSmall = [...counts.entries()].every(([f, n]) => f === top || n <= 2);
  if (!isListingFolder(top) || topCount < 3 || !othersSmall) return urls;
  return urls.filter((u) => folderOf(u) === top || !isListingFolder(folderOf(u)));
};

/**
 * The listing's photos from candidate URLs in page order: real photos only,
 * each once (its largest size, kept at its first position), at most
 * MAX_LISTING_PHOTOS.
 */
export const selectListingPhotos = (urls: string[], max = MAX_LISTING_PHOTOS): string[] => {
  const byKey = new Map<string, { url: string; size: number; order: number }>();
  urls.forEach((url, order) => {
    if (isJunkPhotoUrl(url)) return;
    const key = photoKey(url);
    const size = sizeInUrl(url);
    const seen = byKey.get(key);
    if (!seen) byKey.set(key, { url, size, order });
    else if (size > seen.size) byKey.set(key, { url, size, order: seen.order });
  });
  const unique = [...byKey.values()].sort((a, b) => a.order - b.order).map((p) => p.url);
  return keepListingFolder(unique).slice(0, max);
};
