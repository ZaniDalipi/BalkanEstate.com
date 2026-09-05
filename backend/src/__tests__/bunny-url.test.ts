/**
 * Bunny delivery URL building and signing.
 *
 * This is the translation layer between the transform vocabulary the app has
 * always spoken (Cloudinary's `c_fill`, `q_auto:eco`, `f_auto`) and the query
 * parameters Bunny Optimizer actually takes. Every image on the site is
 * addressed through it, and a wrong parameter here does not throw — it returns
 * a URL that quietly serves the wrong picture, or a signature the CDN rejects.
 */

// No collection is touched here — see `usesDatabase` in setup.ts.
process.env.SKIP_TEST_DB = 'true';

// Read at import time by `config/bunny`, so they must be set first.
process.env.BUNNY_PULL_ZONE_HOST = 'test-zone.b-cdn.net';
process.env.BUNNY_PRIVATE_PULL_ZONE_HOST = 'test-private.b-cdn.net';
process.env.BUNNY_TOKEN_AUTH_KEY = 'test-token-key';

import crypto from 'crypto';
import {
  QUALITY_PRESETS,
  MASTER_QUALITY,
  MASTER_QUALITY_LARGE,
  buildTransformQuery,
  buildBunnyUrl,
  signBunnyUrl,
  isBunnyUrl,
  storagePathFromUrl,
  cityImageStoragePath,
  normalizeCityToken,
  toCdnPath,
} from '../utils/bunnyUrl';

const query = (options: Parameters<typeof buildTransformQuery>[0]) =>
  buildTransformQuery(options).toString();

describe('crop translation', () => {
  it('expresses `fill` as an aspect ratio, not a height', () => {
    // Bunny letterboxes when given both dimensions. Asking for width+height on
    // a 4:3 photo cropped to a square would return it squashed rather than
    // cropped, which is the one failure mode that looks like a design choice.
    const params = buildTransformQuery({ width: 800, height: 800, crop: 'fill' });
    expect(params.get('aspect_ratio')).toBe('800:800');
    expect(params.get('width')).toBe('800');
    expect(params.get('height')).toBeNull();
  });

  it('treats `thumb` as `fill` — both crop to the box', () => {
    expect(query({ width: 400, height: 300, crop: 'thumb' }))
      .toBe(query({ width: 400, height: 300, crop: 'fill' }));
  });

  it('keeps both dimensions for the modes that must not crop', () => {
    for (const crop of ['fit', 'limit', 'scale'] as const) {
      const params = buildTransformQuery({ width: 800, height: 600, crop });
      expect(params.get('width')).toBe('800');
      expect(params.get('height')).toBe('600');
      expect(params.get('aspect_ratio')).toBeNull();
    }
  });

  it('does not invent an aspect ratio from a width alone', () => {
    const params = buildTransformQuery({ width: 800, crop: 'fill' });
    expect(params.get('aspect_ratio')).toBeNull();
    expect(params.get('width')).toBe('800');
  });
});

describe('quality', () => {
  it('maps every preset on the auto ladder to a real number', () => {
    const expected: Record<string, string> = {
      auto: '75',
      'auto:low': '45',
      'auto:eco': '58',
      'auto:good': '70',
      'auto:best': '82',
    };
    for (const [preset, value] of Object.entries(expected)) {
      expect(buildTransformQuery({ quality: preset as any }).get('quality')).toBe(value);
    }
  });

  it('passes a numeric quality through, capped at 100', () => {
    expect(buildTransformQuery({ quality: 40 }).get('quality')).toBe('40');
    expect(buildTransformQuery({ quality: 500 }).get('quality')).toBe('100');
  });

  it('drops a non-positive quality, leaving the pull zone default', () => {
    // Quality 0 is not a picture. Omitting the parameter serves the zone's
    // own default, which is the useful reading of a caller passing nothing.
    expect(buildTransformQuery({ quality: 0 }).get('quality')).toBeNull();
  });

  it('falls back to the auto value for a preset it does not know', () => {
    expect(buildTransformQuery({ quality: 'q_nonsense' as any }).get('quality')).toBe('75');
  });

  it('omits quality entirely when none was asked for', () => {
    expect(buildTransformQuery({ width: 100 }).get('quality')).toBeNull();
  });
});

describe('the master/delivery quality relationship', () => {
  it('keeps every delivery rung at or below the stored master', () => {
    // The master is already a lossy WebP. A rung above it cannot recover
    // detail — it only pays, on every request forever, to reproduce the first
    // encode's artifacts faithfully. This is the invariant that makes the
    // whole ladder cost-sane, and nothing else would catch it breaking.
    const highest = Math.max(...Object.values(QUALITY_PRESETS));
    expect(highest).toBeLessThanOrEqual(MASTER_QUALITY);
  });

  it('stores large images at least as well as ordinary ones', () => {
    expect(MASTER_QUALITY_LARGE).toBeGreaterThanOrEqual(MASTER_QUALITY);
  });
});

describe('format', () => {
  it('omits `auto` so Bunny can negotiate WebP/AVIF from Accept', () => {
    expect(buildTransformQuery({ format: 'auto' }).get('format')).toBeNull();
    expect(buildTransformQuery({}).get('format')).toBeNull();
  });

  it('spells jpg the way Bunny does', () => {
    expect(buildTransformQuery({ format: 'jpg' }).get('format')).toBe('jpeg');
  });

  it('passes the other explicit formats through', () => {
    expect(buildTransformQuery({ format: 'webp' }).get('format')).toBe('webp');
    expect(buildTransformQuery({ format: 'avif' }).get('format')).toBe('avif');
  });
});

describe('dimensions', () => {
  it('caps a width the edge should never be asked to render', () => {
    expect(buildTransformQuery({ width: 99999 }).get('width')).toBe('4096');
  });

  it('drops a non-positive dimension rather than rendering one pixel', () => {
    // Raising 0 to the minimum would produce a 1px image: broken, but sized
    // like a deliberate choice, so nothing downstream would flag it.
    expect(buildTransformQuery({ width: 0 }).get('width')).toBeNull();
    expect(buildTransformQuery({ width: -50 }).get('width')).toBeNull();
  });

  it('rounds a fractional width rather than emitting a decimal', () => {
    expect(buildTransformQuery({ width: 320.6 }).get('width')).toBe('321');
  });

  it('ignores a non-finite dimension instead of emitting NaN', () => {
    expect(buildTransformQuery({ width: NaN }).get('width')).toBeNull();
    expect(buildTransformQuery({ width: Infinity }).get('width')).toBeNull();
  });
});

describe('blur and background', () => {
  it('emits blur only when non-zero', () => {
    expect(buildTransformQuery({ blur: 80 }).get('blur')).toBe('80');
    expect(buildTransformQuery({ blur: 0 }).get('blur')).toBeNull();
  });

  it('accepts a background only for `pad`, and only as bare hex', () => {
    expect(buildTransformQuery({ crop: 'pad', background: 'ffffff' }).get('background')).toBe('ffffff');
    // A colour name, a `#`, or anything else would be interpolated into a URL.
    expect(buildTransformQuery({ crop: 'pad', background: 'white' }).get('background')).toBeNull();
    expect(buildTransformQuery({ crop: 'pad', background: '#ffffff' }).get('background')).toBeNull();
    // Right shape, wrong crop mode.
    expect(buildTransformQuery({ crop: 'fill', background: 'ffffff' }).get('background')).toBeNull();
  });
});

describe('parameter ordering', () => {
  it('sorts keys alphabetically, because the token hash depends on it', () => {
    const params = buildTransformQuery({ width: 800, height: 600, quality: 'auto', crop: 'fill', blur: 5 });
    const keys = [...params.keys()];
    expect(keys).toEqual([...keys].sort());
  });
});

describe('buildBunnyUrl', () => {
  it('serves from the public pull zone', () => {
    expect(buildBunnyUrl('balkan-estate/a/b.webp')).toBe('https://test-zone.b-cdn.net/balkan-estate/a/b.webp');
  });

  it('adds no query string when there is nothing to transform', () => {
    expect(buildBunnyUrl('a/b.webp')).not.toContain('?');
  });

  it('normalises a leading slash rather than doubling it', () => {
    expect(buildBunnyUrl('/a/b.webp')).toBe('https://test-zone.b-cdn.net/a/b.webp');
    expect(toCdnPath('a/b.webp')).toBe('/a/b.webp');
  });

  it('appends the transforms it was given', () => {
    const url = buildBunnyUrl('a/b.webp', { width: 640, quality: 'auto:eco' });
    expect(url).toBe('https://test-zone.b-cdn.net/a/b.webp?quality=58&width=640');
  });
});

describe('signBunnyUrl', () => {
  it('issues against the private pull zone, not the public one', () => {
    const url = signBunnyUrl('docs/license.webp', 600);
    expect(url.startsWith('https://test-private.b-cdn.net/')).toBe(true);
  });

  it('carries a URL-safe token and an expiry', () => {
    const url = new URL(signBunnyUrl('docs/license.webp', 600));
    const token = url.searchParams.get('token')!;

    expect(token).toBeTruthy();
    // Standard base64 would break the query string.
    expect(token).not.toMatch(/[+/=]/);
    expect(Number(url.searchParams.get('expires'))).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('hashes exactly what Bunny will hash on its side', () => {
    const url = new URL(signBunnyUrl('docs/license.webp', 600, { width: 400, quality: 'auto:good' }));
    const expires = url.searchParams.get('expires')!;

    // Reproduce the documented scheme independently: key + path + expires +
    // the signed query string, sorted, with token/expires excluded.
    const signed = new URLSearchParams(url.searchParams);
    signed.delete('token');
    signed.delete('expires');

    const expected = crypto
      .createHash('sha256')
      .update(`test-token-key/docs/license.webp${expires}${signed.toString()}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    expect(url.searchParams.get('token')).toBe(expected);
  });

  it('keeps the transform parameters it signed', () => {
    const url = new URL(signBunnyUrl('docs/license.webp', 600, { width: 400 }));
    expect(url.searchParams.get('width')).toBe('400');
  });

  it('produces a different token for a different path', () => {
    const a = new URL(signBunnyUrl('docs/a.webp', 600)).searchParams.get('token');
    const b = new URL(signBunnyUrl('docs/b.webp', 600)).searchParams.get('token');
    expect(a).not.toBe(b);
  });
});

describe('isBunnyUrl', () => {
  it('matches the public host exactly, never as a suffix', () => {
    expect(isBunnyUrl('https://test-zone.b-cdn.net/a.webp')).toBe(true);
    expect(isBunnyUrl('https://test-zone.b-cdn.net.attacker.example/a.webp')).toBe(false);
    expect(isBunnyUrl('https://nottest-zone.b-cdn.net/a.webp')).toBe(false);
  });

  it('is case-insensitive on the host, as DNS is', () => {
    expect(isBunnyUrl('https://TEST-ZONE.B-CDN.NET/a.webp')).toBe(true);
  });

  it('returns false rather than throwing on a non-URL', () => {
    expect(isBunnyUrl('not a url')).toBe(false);
    expect(isBunnyUrl('')).toBe(false);
  });
});

describe('storagePathFromUrl', () => {
  it('is the inverse of buildBunnyUrl', () => {
    const path = 'balkan-estate/users/1/listings/abc/photos/x.webp';
    expect(storagePathFromUrl(buildBunnyUrl(path, { width: 800 }))).toBe(path);
  });

  it('decodes an escaped segment back to what was stored', () => {
    expect(storagePathFromUrl('https://test-zone.b-cdn.net/a/my%20photo.webp')).toBe('a/my photo.webp');
  });

  it('refuses a URL that is not ours', () => {
    expect(storagePathFromUrl('https://res.cloudinary.com/demo/image/upload/v1/x.jpg')).toBe('');
  });
});

describe('cityImageStoragePath', () => {
  it('matches the convention the frontend builds independently', () => {
    expect(cityImageStoragePath('Skopje', 'North Macedonia'))
      .toBe('balkan-estate/cities/city-north-macedonia-skopje.jpg');
  });

  it('defaults an unknown country rather than emitting an empty segment', () => {
    expect(cityImageStoragePath('Tirana')).toBe('balkan-estate/cities/city-unknown-tirana.jpg');
  });

  it('strips what the frontend strips', () => {
    expect(normalizeCityToken('  Novi Sad ')).toBe('novi-sad');
    expect(normalizeCityToken("Herceg-Novi!")).toBe('herceg-novi');
  });
});
