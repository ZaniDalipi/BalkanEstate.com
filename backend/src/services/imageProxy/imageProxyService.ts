import http from 'http';
import https from 'https';
import axios from 'axios';
import sharp from 'sharp';
import { mediaLogger } from '../../utils/logger';
import { resolvePublicUrl, SsrfError } from '../../utils/ssrfGuard';
import { ImageProxyCache } from './imageProxyCache';

/**
 * Resizing image proxy for external (feed) photos.
 *
 * Feed images are never stored on Cloudinary. The browser asks
 *   GET /api/image-proxy?url=<source>&w=<width>
 * and gets a WebP resized on this server, so the cost is our CPU once per
 * (url, width) and then cache hits — zero Cloudinary credits.
 *
 * Cache layers: in-memory LRU → disk → CDN/browser (long Cache-Control).
 * Concurrent requests for the same image share one fetch.
 */

export class ImageProxyError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ImageProxyError';
  }
}

/** Same widths the frontend snaps to, so any size maps to a handful of cache entries. */
export const PROXY_WIDTHS = [64, 128, 240, 320, 480, 640, 800, 1080, 1280, 1600, 1920] as const;
export const DEFAULT_PROXY_WIDTH = 800;

const MAX_URL_LENGTH = 2048;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_INPUT_PIXELS = 50_000_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const WEBP_QUALITY = 72;

/** Raster types we will decode. SVG is excluded: it can carry script. */
const ACCEPTED_SOURCE_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp', 'image/tiff',
]);

export interface ProxyRequest {
  url: string;
  width: number;
}

export interface ProxyValidation {
  isValid: boolean;
  error?: string;
  value?: ProxyRequest;
}

export const snapProxyWidth = (width: number): number => {
  for (const w of PROXY_WIDTHS) if (width <= w) return w;
  return PROXY_WIDTHS[PROXY_WIDTHS.length - 1];
};

/** Validate the raw query string values. Never throws. */
export const validateProxyRequest = (query: { url?: unknown; w?: unknown }): ProxyValidation => {
  const { url, w } = query;
  if (typeof url !== 'string' || url.trim() === '') {
    return { isValid: false, error: 'Missing url parameter' };
  }
  const trimmed = url.trim();
  if (trimmed.length > MAX_URL_LENGTH) return { isValid: false, error: 'URL is too long' };
  if (/[\u0000-\u001f\s]/.test(trimmed)) return { isValid: false, error: 'URL contains invalid characters' };
  if (!/^https?:\/\//i.test(trimmed)) return { isValid: false, error: 'Only http/https URLs are allowed' };

  let width = DEFAULT_PROXY_WIDTH;
  if (w !== undefined && w !== '') {
    if (typeof w !== 'string' || !/^\d{1,5}$/.test(w)) {
      return { isValid: false, error: 'w must be a positive whole number' };
    }
    const parsed = Number(w);
    if (parsed < 1) return { isValid: false, error: 'w must be a positive whole number' };
    width = snapProxyWidth(parsed);
  }

  return { isValid: true, value: { url: trimmed, width } };
};

const cache = new ImageProxyCache();
const inFlight = new Map<string, Promise<Buffer>>();

const cacheKey = (req: ProxyRequest): string => `${req.width}|${req.url}`;

/** Fetch the source, re-validating every redirect hop against the SSRF guard. */
const fetchSource = async (rawUrl: string): Promise<Buffer> => {
  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const vetted = await resolvePublicUrl(current);
    const agentOptions = { lookup: vetted.lookup, keepAlive: false };

    const response = await axios.get<ArrayBuffer>(vetted.url.toString(), {
      responseType: 'arraybuffer',
      timeout: FETCH_TIMEOUT_MS,
      maxContentLength: MAX_SOURCE_BYTES,
      maxBodyLength: MAX_SOURCE_BYTES,
      maxRedirects: 0,
      // Connect directly: an HTTP(S)_PROXY env var would resolve DNS itself
      // and bypass the address we just vetted and pinned.
      proxy: false,
      httpAgent: new http.Agent(agentOptions),
      httpsAgent: new https.Agent(agentOptions),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BalkanEstate/1.0; +https://balkanestate.com)',
        Accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8',
      },
      validateStatus: () => true,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (typeof location !== 'string' || location === '') {
        throw new ImageProxyError(502, 'Source redirected without a location');
      }
      current = new URL(location, vetted.url).toString();
      continue;
    }
    if (response.status === 404 || response.status === 410) {
      throw new ImageProxyError(404, 'Source image not found');
    }
    if (response.status < 200 || response.status >= 300) {
      throw new ImageProxyError(502, `Source responded ${response.status}`);
    }

    const contentType = String(response.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (!ACCEPTED_SOURCE_TYPES.has(contentType)) {
      throw new ImageProxyError(415, 'URL does not point to a supported image');
    }
    return Buffer.from(response.data);
  }

  throw new ImageProxyError(502, 'Too many redirects');
};

const transform = async (source: Buffer, width: number): Promise<Buffer> => {
  try {
    return await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS, animated: false })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
  } catch {
    throw new ImageProxyError(422, 'Source is not a decodable image');
  }
};

const produce = async (req: ProxyRequest): Promise<Buffer> => {
  try {
    const source = await fetchSource(req.url);
    return await transform(source, req.width);
  } catch (error) {
    if (error instanceof ImageProxyError) throw error;
    if (error instanceof SsrfError) throw new ImageProxyError(400, error.message);
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new ImageProxyError(504, 'Source timed out');
      }
      if (error.message.includes('maxContentLength')) {
        throw new ImageProxyError(413, 'Source image is too large');
      }
    }
    throw new ImageProxyError(502, 'Failed to fetch image');
  }
};

/**
 * Return the resized WebP for `req`, from cache when possible.
 * Throws ImageProxyError with an HTTP status on failure; failures are
 * remembered briefly so a broken source isn't re-fetched on every view.
 */
export const getProxiedImage = async (req: ProxyRequest): Promise<{ body: Buffer; etag: string; fromCache: boolean }> => {
  const key = cacheKey(req);

  const failure = cache.getFailure(key);
  if (failure) throw new ImageProxyError(failure.status, failure.message);

  const cached = await cache.get(key);
  if (cached) return { body: cached, etag: cache.etag(key), fromCache: true };

  let pending = inFlight.get(key);
  if (!pending) {
    pending = produce(req)
      .then(async (body) => {
        await cache.set(key, body);
        return body;
      })
      .catch((error) => {
        if (error instanceof ImageProxyError) cache.setFailure(key, error.status, error.message);
        throw error;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }

  const body = await pending;
  return { body, etag: cache.etag(key), fromCache: false };
};

/** Periodic disk-cache sweep; called from the proxy module's timer. */
export const sweepImageProxyCache = async (): Promise<void> => {
  try {
    await cache.sweepDisk();
  } catch (error) {
    mediaLogger.warn(`⚠️  Image proxy cache sweep failed: ${(error as Error).message}`);
  }
};
