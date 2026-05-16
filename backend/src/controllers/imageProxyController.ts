import type { Request, Response } from 'express';
import axios from 'axios';

// Only allow http/https image URLs; block redirects to internal addresses.
const ALLOWED_PROTOCOLS = /^https?:\/\//i;
const BLOCKED_HOSTS = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'image/svg+xml', 'image/bmp', 'image/tiff',
]);

export const proxyExternalImage = async (req: Request, res: Response): Promise<void> => {
  const raw = req.query.url;
  if (!raw || typeof raw !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw).trim();
  } catch {
    res.status(400).json({ error: 'Invalid url encoding' });
    return;
  }

  // Security: only allow http/https
  if (!ALLOWED_PROTOCOLS.test(decoded)) {
    res.status(400).json({ error: 'Only http/https URLs are allowed' });
    return;
  }

  // Security: block SSRF to internal/loopback addresses
  let hostname: string;
  try {
    hostname = new URL(decoded).hostname;
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }
  if (BLOCKED_HOSTS.test(hostname)) {
    res.status(400).json({ error: 'Blocked URL' });
    return;
  }

  try {
    const upstream = await axios.get<Buffer>(decoded, {
      responseType: 'arraybuffer',
      timeout: 10_000,
      maxContentLength: 20 * 1024 * 1024, // 20 MB max
      maxRedirects: 3,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BalkanEstate/1.0; +https://balkanestate.com)',
        'Accept': 'image/webp,image/avif,image/*,*/*;q=0.8',
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const contentType = (upstream.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (!IMAGE_MIME_TYPES.has(contentType) && !contentType.startsWith('image/')) {
      res.status(400).json({ error: 'URL does not point to an image' });
      return;
    }

    res.set('Content-Type', contentType);
    // Cache images for 7 days on the CDN / browser
    res.set('Cache-Control', 'public, max-age=604800, immutable');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(upstream.data);
  } catch (err) {
    const status = axios.isAxiosError(err) ? (err.response?.status ?? 502) : 502;
    res.status(status).json({ error: 'Failed to fetch image' });
  }
};
