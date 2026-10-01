import { describe, it, expect } from 'vitest';
import {
  cloudinarySrcSet,
  optimizeCloudinaryUrl,
  snapCloudinaryWidth,
  CLOUDINARY_MAX_WIDTH,
  shouldProxyImage,
  getPropertyImagePlaceholder,
  getCityImageUrl,
  getCityImagePlaceholder,
} from '../../config/cloudinaryConfig';
import { buildPresetDefinitions } from '../../backend/src/config/cloudinaryPresets';

const SRC = 'https://res.cloudinary.com/demo/image/upload/v1/house.jpg';

/**
 * Cloudinary bills each distinct derivative, so the app must ask for a small,
 * fixed set of sizes rather than whatever width each component happens to want.
 */
describe('Cloudinary transformation budget', () => {
  it('rounds a width up to the next bucket', () => {
    expect(snapCloudinaryWidth(20)).toBe(32);
    expect(snapCloudinaryWidth(48)).toBe(64);
    expect(snapCloudinaryWidth(192)).toBe(240);
    expect(snapCloudinaryWidth(800)).toBe(800);
  });

  it('never asks for more than the stored master', () => {
    expect(snapCloudinaryWidth(2560)).toBe(CLOUDINARY_MAX_WIDTH);
    expect(optimizeCloudinaryUrl(SRC, { width: 2400 })).toContain(`t_be_w${CLOUDINARY_MAX_WIDTH}/`);
  });

  it('lets two components that want nearby sizes share one derivative', () => {
    expect(optimizeCloudinaryUrl(SRC, { width: 160, crop: 'fill' })).toBe(
      optimizeCloudinaryUrl(SRC, { width: 200, crop: 'fill' }),
    );
  });

  it('serves share cards (JPEG) through the 1200×630 preset', () => {
    expect(optimizeCloudinaryUrl(SRC, { width: 1200, height: 630, crop: 'pad', format: 'jpg' })).toContain('/t_be_og/');
  });

  it('lists each srcSet candidate once after snapping', () => {
    const set = cloudinarySrcSet(SRC, [300, 320, 480]);
    expect(set.split(', ')).toHaveLength(2);
    expect(set).toContain(' 320w');
    expect(set).toContain(' 480w');
  });
});

/**
 * With "Strict transformations" on, Cloudinary only serves named
 * transformations the backend registered. Any URL the app builds with a name
 * outside that set is a broken image.
 */
describe('strict-transformations compatibility', () => {
  const registered = new Set(Object.keys(buildPresetDefinitions()));
  const presetOf = (url: string): string => {
    const match = url.match(/\/image\/upload\/t_([a-z0-9_]+)\//i);
    if (!match) throw new Error(`no preset in ${url}`);
    return match[1];
  };

  it('only ever produces registered presets, for any width or box', () => {
    const urls: string[] = [];
    for (let w = 1; w <= 2600; w += 7) {
      urls.push(optimizeCloudinaryUrl(SRC, { width: w }));
      for (const h of [40, 128, 224, 300, 450, 630, 1080]) urls.push(optimizeCloudinaryUrl(SRC, { width: w, height: h, crop: 'fill' }));
    }
    urls.push(optimizeCloudinaryUrl(SRC), optimizeCloudinaryUrl(SRC, { blur: 400 }), optimizeCloudinaryUrl(SRC, { format: 'jpg', width: 1200, height: 630 }));
    urls.push(getPropertyImagePlaceholder(SRC), getCityImageUrl('Novi Sad', { country: 'Serbia', width: 400, height: 300 }), getCityImagePlaceholder('Tirana', 'Albania'));
    urls.push(...cloudinarySrcSet(SRC, [195, 390, 585, 2560]).split(', ').map((c) => c.split(' ')[0]));

    const unknown = [...new Set(urls.map(presetOf))].filter((name) => !registered.has(name));
    expect(unknown).toEqual([]);
  });

  it('strips transforms already in the URL instead of stacking ad-hoc ones', () => {
    const url = optimizeCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/c_fill,w_96,h_96/v1/a.jpg', { width: 300 });
    expect(url).toBe('https://res.cloudinary.com/demo/image/upload/t_be_w320/v1/a.jpg');
  });
});

describe('external images', () => {
  it('sends feed photos through the resizing proxy at a bucketed width', () => {
    const url = optimizeCloudinaryUrl('https://feed.example.com/photos/1.jpg', { width: 300 });
    expect(url).toContain('/image-proxy?url=https%3A%2F%2Ffeed.example.com%2Fphotos%2F1.jpg&w=320');
  });

  it('leaves hosts with their own CDN and SVGs alone', () => {
    expect(shouldProxyImage('https://upload.wikimedia.org/a.jpg')).toBe(false);
    expect(shouldProxyImage('https://images.unsplash.com/photo-1')).toBe(false);
    expect(shouldProxyImage('https://feed.example.com/logo.svg')).toBe(false);
    expect(shouldProxyImage('https://feed.example.com/a.jpg')).toBe(true);
  });
});
