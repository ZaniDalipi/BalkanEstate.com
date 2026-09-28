/**
 * Videos on the site are always links to a hosting platform — never files we
 * store. Uploading video to Cloudinary is billed per second of processing and
 * per GB delivered, which a free plan can't absorb.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extract the video id from any common YouTube URL form (watch, youtu.be,
 * shorts, live, embed). Returns null for anything that isn't YouTube.
 */
export const extractYouTubeId = (raw: string): string | null => {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, '');

  let id: string | null = null;
  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0] || null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [first, second] = url.pathname.split('/').filter(Boolean);
    if (first === 'watch') id = url.searchParams.get('v');
    else if (first === 'embed' || first === 'shorts' || first === 'live') id = second || null;
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
};

/** Canonical embed URL for a YouTube link, or null if it isn't one. */
export const toYouTubeEmbedUrl = (raw: string): string | null => {
  const id = extractYouTubeId(raw);
  return id ? `https://www.youtube.com/embed/${id}` : null;
};

export const validateYouTubeLink = (raw: unknown): ValidationResult => {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { isValid: false, error: 'A YouTube link is required' };
  }
  if (raw.length > 2048) return { isValid: false, error: 'Link is too long' };
  if (!extractYouTubeId(raw)) {
    return { isValid: false, error: 'Only YouTube links are supported — video files are not uploaded' };
  }
  return { isValid: true };
};
