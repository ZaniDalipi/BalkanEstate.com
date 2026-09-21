/**
 * Reading the file an Instagram embed would play.
 *
 * Instagram's embed iframe never autoplays — its page waits for a tap — so a
 * reel used as a property tour opens as a still frame. Pulling out the media URL
 * lets the gallery play it inline instead. Nothing is downloaded or stored here:
 * this only reads a URL out of markup that has already been fetched.
 */

/** Instagram serves the media from these two CDNs and nowhere else. */
const INSTAGRAM_CDN_HOST = /(^|\.)(cdninstagram\.com|fbcdn\.net)$/;

/** Undoes the JSON and HTML escaping the URL picks up from whichever blob it was read out of. */
const decodeEmbeddedUrl = (raw: string): string =>
  raw
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#38;/g, '&');

/**
 * Instagram has moved this between a few shapes over the years and serves
 * different ones to different clients, so every known carrier is tried rather
 * than betting on one.
 */
const VIDEO_URL_PATTERNS: RegExp[] = [
  /"video_url"\s*:\s*"([^"]+)"/,
  /"video_versions"\s*:\s*\[\s*\{[^}]*?"url"\s*:\s*"([^"]+)"/,
  /<meta[^>]+property=["']og:video(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:video(?::secure_url)?["']/i,
  /<video[^>]*\ssrc=["']([^"']+)["']/i,
];

/**
 * Returns the playable URL an embed page carries, or null when it carries none —
 * which is an ordinary outcome, not a failure: the caller keeps Instagram's embed.
 *
 * The result becomes the `src` of a video element, so a URL is only ever returned
 * once it is confirmed to be https on Instagram's own CDN. Anything else in the
 * markup is ignored rather than trusted.
 */
export const extractInstagramVideoUrl = (html: string): string | null => {
  for (const pattern of VIDEO_URL_PATTERNS) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;

    let parsed: URL;
    try {
      parsed = new URL(decodeEmbeddedUrl(match[1]));
    } catch {
      continue;
    }

    if (parsed.protocol !== 'https:') continue;
    if (!INSTAGRAM_CDN_HOST.test(parsed.hostname)) continue;

    return parsed.toString();
  }

  return null;
};
