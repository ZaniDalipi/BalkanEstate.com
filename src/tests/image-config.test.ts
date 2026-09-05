/**
 * Frontend image URL building.
 *
 * Mirrors `backend/src/utils/bunnyUrl.ts`: the backend builds the URLs it
 * stores, this builds the ones the browser requests, and the two have to agree
 * on the parameter names and the quality ladder or images come back at the
 * wrong size. It is also the single funnel every `<img>` on the site passes
 * through, so a mistake here is site-wide and silent.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

const CDN = 'test-zone.b-cdn.net';

// `CDN_HOST` is read from import.meta.env at module load, so it has to be
// stubbed before the module is first imported.
vi.stubEnv('VITE_CDN_HOST', CDN);

let optimizeImageUrl: typeof import('@/config/imageConfig').optimizeImageUrl;
let imageSrcSet: typeof import('@/config/imageConfig').imageSrcSet;
let getPropertyImagePlaceholder: typeof import('@/config/imageConfig').getPropertyImagePlaceholder;
let getCityImageUrl: typeof import('@/config/imageConfig').getCityImageUrl;
let isCdnUrl: typeof import('@/config/imageConfig').isCdnUrl;

beforeAll(async () => {
  const mod = await import('@/config/imageConfig');
  ({ optimizeImageUrl, imageSrcSet, getPropertyImagePlaceholder, getCityImageUrl, isCdnUrl } = mod);
});

const own = (path = 'balkan-estate/users/1/photos/a.webp') => `https://${CDN}/${path}`;

describe('optimizeImageUrl — security', () => {
  it('refuses anything that is not http(s)', () => {
    for (const url of ['javascript:alert(1)', 'data:image/png;base64,AAA', 'file:///etc/passwd']) {
      expect(optimizeImageUrl(url, { width: 100 })).toBe('');
    }
  });

  it('refuses a URL carrying newlines or control characters', () => {
    const injected = `https://${CDN}/a.webp` + String.fromCharCode(10) + 'X-Injected: 1';
    expect(optimizeImageUrl(injected, { width: 100 })).toBe('');
  });

  it('returns empty for a missing or non-string value', () => {
    expect(optimizeImageUrl(undefined)).toBe('');
    expect(optimizeImageUrl(null as any)).toBe('');
    expect(optimizeImageUrl(123 as any)).toBe('');
  });
});

describe('optimizeImageUrl — our own CDN', () => {
  it('sets the transforms it was asked for', () => {
    const url = new URL(optimizeImageUrl(own(), { width: 640, quality: 'auto:eco' }));
    expect(url.searchParams.get('width')).toBe('640');
    expect(url.searchParams.get('quality')).toBe('58');
  });

  it('replaces transforms already on the URL instead of merging them', () => {
    // A URL that has been through here once — as stored URLs have — must come
    // back with exactly the transforms just asked for. Merging would let an
    // earlier square crop silently survive into a wide card.
    const once = optimizeImageUrl(own(), { width: 800, height: 800, crop: 'fill' });
    const twice = new URL(optimizeImageUrl(once, { width: 1200, crop: 'limit' }));

    expect(twice.searchParams.get('width')).toBe('1200');
    expect(twice.searchParams.get('aspect_ratio')).toBeNull();
    expect(twice.searchParams.getAll('width')).toHaveLength(1);
  });

  it('expresses a fill crop as an aspect ratio, matching the backend', () => {
    const url = new URL(optimizeImageUrl(own(), { width: 400, height: 300, crop: 'fill' }));
    expect(url.searchParams.get('aspect_ratio')).toBe('400:300');
    expect(url.searchParams.get('width')).toBe('400');
    expect(url.searchParams.get('height')).toBeNull();
  });

  it('leaves a signed document URL untouched', () => {
    // The token covers the query string. Re-writing the transforms would
    // invalidate the signature and the CDN would refuse the document outright.
    const signed = `https://${CDN}/docs/license.webp?expires=999&token=abc123&width=400`;
    expect(optimizeImageUrl(signed, { width: 1200 })).toBe(signed);
  });

  it('drops a non-positive dimension rather than rendering one pixel', () => {
    const url = new URL(optimizeImageUrl(own(), { width: 0 }));
    expect(url.searchParams.get('width')).toBeNull();
  });

  it('caps an absurd width', () => {
    const url = new URL(optimizeImageUrl(own(), { width: 99999 }));
    expect(url.searchParams.get('width')).toBe('4096');
  });
});

describe('optimizeImageUrl — other hosts', () => {
  it('sizes a Google avatar through its own parameter', () => {
    expect(optimizeImageUrl('https://lh3.googleusercontent.com/a/abc123=s96-c', { width: 200 }))
      .toBe('https://lh3.googleusercontent.com/a/abc123=s200');
  });

  it('caps a Google avatar at the size Google will serve', () => {
    expect(optimizeImageUrl('https://lh3.googleusercontent.com/a/abc', { width: 5000 }))
      .toBe('https://lh3.googleusercontent.com/a/abc=s512');
  });

  it('passes an unrelated host through untouched', () => {
    const external = 'https://images.unsplash.com/photo-123?w=400';
    expect(optimizeImageUrl(external, { width: 800 })).toBe(external);
  });

  it('does not treat a lookalike host as ours', () => {
    const lookalike = `https://${CDN}.attacker.example/a.webp`;
    expect(optimizeImageUrl(lookalike, { width: 800 })).toBe(lookalike);
    expect(isCdnUrl(lookalike)).toBe(false);
  });
});

describe('imageSrcSet', () => {
  it('emits one candidate per width, each with its descriptor', () => {
    const set = imageSrcSet(own(), [400, 800]);
    const entries = set.split(', ');

    expect(entries).toHaveLength(2);
    expect(entries[0]).toContain('width=400');
    expect(entries[0].endsWith(' 400w')).toBe(true);
    expect(entries[1].endsWith(' 800w')).toBe(true);
  });

  it('is empty for a URL we cannot resize', () => {
    expect(imageSrcSet('https://images.unsplash.com/photo-123')).toBe('');
    expect(imageSrcSet(undefined)).toBe('');
  });
});

describe('getPropertyImagePlaceholder', () => {
  it('produces a tiny blurred stand-in', () => {
    const url = new URL(getPropertyImagePlaceholder(own()));
    expect(url.searchParams.get('width')).toBe('20');
    expect(Number(url.searchParams.get('blur'))).toBeGreaterThan(0);
    expect(Number(url.searchParams.get('quality'))).toBeLessThan(30);
  });

  it('is empty for a URL that cannot produce one', () => {
    expect(getPropertyImagePlaceholder('https://images.unsplash.com/photo-1')).toBe('');
    expect(getPropertyImagePlaceholder(undefined)).toBe('');
  });
});

describe('getCityImageUrl', () => {
  it('builds the path the backend seeder writes to', () => {
    const url = new URL(getCityImageUrl('Skopje', { country: 'North Macedonia' }));
    expect(url.pathname).toBe('/balkan-estate/cities/city-north-macedonia-skopje.jpg');
  });

  it('defaults an unknown country rather than emitting an empty segment', () => {
    expect(new URL(getCityImageUrl('Tirana')).pathname)
      .toBe('/balkan-estate/cities/city-unknown-tirana.jpg');
  });
});
