import { describe, it, expect, beforeAll, vi } from 'vitest';
import { originalImageUrl, originalProxiedUrl } from '../../config/mediaConfig';
import { installCdnImageFallback } from '../shared/utils/cdnImageFallback';

describe('image proxy fallback', () => {
  beforeAll(() => installCdnImageFallback());

  const SOURCE = 'https://feeds.example.com/agency/logo.jpg';
  const PROXIED = `http://localhost:5001/api/image-proxy?url=${encodeURIComponent(SOURCE)}&w=240`;

  it('maps a proxy URL back to the image it wraps, and only to http(s)', () => {
    expect(originalImageUrl(PROXIED)).toBe(SOURCE);
    expect(originalProxiedUrl('http://localhost:5001/api/image-proxy?url=javascript%3Aalert(1)')).toBeNull();
    expect(originalProxiedUrl('https://example.com/a.jpg')).toBeNull();
  });

  it('shows the source image when the proxy fails (API down, host refused)', () => {
    const img = document.createElement('img');
    const componentOnError = vi.fn();
    img.addEventListener('error', componentOnError);
    img.src = PROXIED;
    document.body.appendChild(img);

    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe(SOURCE);
    expect(componentOnError).not.toHaveBeenCalled();

    img.dispatchEvent(new Event('error'));
    expect(componentOnError).toHaveBeenCalledTimes(1);
    img.remove();
  });
});
