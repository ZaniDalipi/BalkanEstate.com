import { MAX_PROPERTY_IMAGES } from '../config/uploadLimits';

/**
 * Photo hygiene for listings fetched from external feeds.
 *
 * Detail pages are scraped broadly (every <img>, gallery data attribute and
 * script-embedded URL), which also sweeps up language flags, agency logos,
 * agent headshots, social icons, map tiles and theme decorations. This module
 * drops those and caps a listing at the same photo count a user can upload.
 *
 * Kept free of I/O so it can be unit tested on its own.
 */

/** Imported listings carry at most as many photos as a manual upload allows. */
export const MAX_IMPORTED_IMAGES = MAX_PROPERTY_IMAGES;

/** Path/filename words that mark an image as site chrome rather than a property photo. */
const JUNK_TOKENS = new Set([
  'flag', 'flags', 'lang', 'language', 'languages', 'wpml', 'sitepress',
  'icon', 'icons', 'logo', 'logos', 'favicon', 'sprite', 'sprites', 'emoji', 'smilies',
  'avatar', 'avatars', 'gravatar',
  'placeholder', 'noimage', 'spinner', 'loader', 'loading', 'blank', 'pixel', 'spacer', 'transparent',
  'banner', 'banners', 'badge', 'badges', 'watermark', 'qr', 'qrcode', 'marker', 'markers',
  'arrow', 'arrows', 'button', 'btn', 'rating', 'stars',
  'social', 'facebook', 'instagram', 'whatsapp', 'twitter', 'youtube', 'linkedin', 'tiktok',
  'viber', 'telegram', 'pinterest', 'appstore', 'playstore', 'paypal', 'visa', 'mastercard',
]);

/** Substrings that are junk even when glued to other words (e.g. "companylogo.png"). */
const JUNK_SUBSTRINGS = ['logo', 'favicon', 'gravatar', 'sprite', 'placeholder', 'watermark', 'no-image', 'noimage'];

/** Hosts that only ever serve trackers, maps or avatars. */
const JUNK_HOST_RE =
  /(doubleclick|google-analytics|googletagmanager|facebook\.(net|com)|gravatar\.com|maps\.googleapis\.com|maps\.gstatic\.com|tile\.openstreetmap|api\.mapbox\.com|flagcdn\.com|flagsapi|countryflags)/i;

/** Asset folders of CMS themes/plugins hold decorations, never listing photos. */
const JUNK_PATH_RE = /\/(wp-content\/(themes|plugins)|wp-includes)\//i;

/** WordPress-style resized thumbnails: "photo-150x150.jpg". */
const SMALL_SIZE_SUFFIX_RE = /[-_](\d{1,4})x(\d{1,4})\.[a-z0-9]+$/i;
const SMALL_SIZE_MAX = 400;

/**
 * True when a URL clearly isn't a photo of the property: flags, logos, icons,
 * agent portraits, trackers, map tiles, vector/animated assets, thumbnails.
 */
export const isJunkImageUrl = (raw: string): boolean => {
  if (!raw) return true;
  const url = raw.trim();
  if (/^(data|blob):/i.test(url)) return true;

  let host = '';
  let path = url;
  let query = '';
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    path = decodeURIComponent(parsed.pathname);
    query = parsed.search;
  } catch {
    /* relative or malformed — inspect as a path */
  }
  const lowerPath = path.toLowerCase();

  if (JUNK_HOST_RE.test(host)) return true;
  if (JUNK_PATH_RE.test(lowerPath)) return true;
  if (/\.(svg|gif|ico|bmp)$/i.test(lowerPath)) return true;

  // 1x1 tracking pixels and tiny resize hints in the query string.
  if (/[?&](w|width|h|height)=1\b/i.test(query)) return true;
  if (/[?&](size|dim|thumb|resize|w|width)=\d{1,2}\b/i.test(query)) return true;

  const size = lowerPath.match(SMALL_SIZE_SUFFIX_RE);
  if (size && Number(size[1]) <= SMALL_SIZE_MAX && Number(size[2]) <= SMALL_SIZE_MAX) return true;

  const tokens = lowerPath.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.some((t) => JUNK_TOKENS.has(t))) return true;
  const fileName = lowerPath.slice(lowerPath.lastIndexOf('/') + 1);
  if (JUNK_SUBSTRINGS.some((s) => fileName.includes(s))) return true;

  return false;
};

/** Drop junk and duplicate URLs, then keep at most `MAX_IMPORTED_IMAGES`. */
export const cleanImportedImageUrls = (urls: string[], max = MAX_IMPORTED_IMAGES): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (typeof u !== 'string' || !u || seen.has(u)) continue;
    seen.add(u);
    if (isJunkImageUrl(u)) continue;
    out.push(u);
    if (out.length >= max) break;
  }
  return out;
};
