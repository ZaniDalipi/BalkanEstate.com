import { describe, it, expect, beforeAll, vi } from 'vitest';
import { originalCloudinaryUrl, originalImageUrl, originalProxiedUrl, retryWithOriginalImage } from '../../config/cloudinaryConfig';
import { installCdnImageFallback } from '../shared/utils/cdnImageFallback';

const PRESET = 'https://res.cloudinary.com/demo/image/upload/t_be_w64/v1/agencies/a/acme_1/logo/logo.png';
const ORIGINAL = 'https://res.cloudinary.com/demo/image/upload/v1/agencies/a/acme_1/logo/logo.png';

/**
 * A preset that fails (missing, or an error the CDN cached from before it was
 * registered) must fall back to the original — which strict transformations
 * always allow — instead of leaving a broken image with its alt text.
 */
describe('Cloudinary image fallback', () => {
  beforeAll(() => installCdnImageFallback());

  it('maps a preset URL back to the original', () => {
    expect(originalCloudinaryUrl(PRESET)).toBe(ORIGINAL);
    expect(originalCloudinaryUrl('https://example.com/a.jpg')).toBeNull();
  });

  it('retries a failed preset once with the original, then gives up', () => {
    const img = document.createElement('img');
    img.src = PRESET;
    img.setAttribute('srcset', `${PRESET} 64w`);

    expect(retryWithOriginalImage(img)).toBe(true);
    expect(img.src).toBe(ORIGINAL);
    expect(img.hasAttribute('srcset')).toBe(false);
    expect(retryWithOriginalImage(img)).toBe(false);
  });

  it('handles any failing <img> on the page without the component knowing', () => {
    const img = document.createElement('img');
    const componentOnError = vi.fn();
    img.addEventListener('error', componentOnError);
    img.src = PRESET;
    document.body.appendChild(img);

    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe(ORIGINAL);
    // Handled globally, so the component's own fallback isn't triggered yet.
    expect(componentOnError).not.toHaveBeenCalled();

    // The original failing too reaches the component (icon / generated avatar).
    img.dispatchEvent(new Event('error'));
    expect(componentOnError).toHaveBeenCalledTimes(1);
    img.remove();
  });
});

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
