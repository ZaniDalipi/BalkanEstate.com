import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

/**
 * Photos on our R2 media CDN: the database stores `…/original.jpg` and every
 * display helper swaps in a pre-generated size from the same folder — no
 * resizing service involved. A size that fails falls back to the JPEG master.
 */
const MEDIA = 'https://media.example.com';
const KEY = 'users/64a1b2c3d4e5f6a7b8c9d0e1/listings/6650aa11bb22cc33dd44ee55/photos/0abc123';
const MASTER = `${MEDIA}/${KEY}/original.jpg`;

type Config = typeof import('../../config/cloudinaryConfig');
let cfg: Config;

beforeAll(async () => {
  vi.stubEnv('VITE_MEDIA_CDN_URL', `${MEDIA}/`);
  vi.resetModules();
  cfg = await import('../../config/cloudinaryConfig');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('media CDN URLs', () => {
  it('recognises our photos and nothing else', () => {
    expect(cfg.MEDIA_CDN_URL).toBe(MEDIA);
    expect(cfg.isMediaCdnUrl(MASTER)).toBe(true);
    expect(cfg.isMediaCdnUrl(`${MEDIA}/${KEY}/w640.webp`)).toBe(true);
    expect(cfg.isMediaCdnUrl(`https://other.example.com/${KEY}/original.jpg`)).toBe(false);
    expect(cfg.isMediaCdnUrl(`${MEDIA}/${KEY}/random.png`)).toBe(false);
  });

  it('picks the pre-generated size for each request', () => {
    expect(cfg.optimizeCloudinaryUrl(MASTER, { width: 600 })).toBe(`${MEDIA}/${KEY}/w640.webp`);
    expect(cfg.optimizeCloudinaryUrl(MASTER, { width: 400, height: 300 })).toBe(`${MEDIA}/${KEY}/c640.webp`);
    expect(cfg.optimizeCloudinaryUrl(MASTER, { width: 40, blur: 400 })).toBe(`${MEDIA}/${KEY}/lqip.webp`);
    expect(cfg.optimizeCloudinaryUrl(MASTER, { width: 1200, height: 630, format: 'jpg', crop: 'pad' })).toBe(`${MEDIA}/${KEY}/og.jpg`);
    // already a size → resized from the same folder, never stacked
    expect(cfg.optimizeCloudinaryUrl(`${MEDIA}/${KEY}/c320.webp`, { width: 1600 })).toBe(`${MEDIA}/${KEY}/w1920.webp`);
  });

  it('never sends our photos through the image proxy', () => {
    expect(cfg.shouldProxyImage(MASTER)).toBe(false);
  });

  it('builds a srcset of distinct generated widths', () => {
    expect(cfg.cloudinarySrcSet(MASTER, [300, 320, 800])).toBe(
      `${MEDIA}/${KEY}/w320.webp 320w, ${MEDIA}/${KEY}/w960.webp 960w`
    );
  });

  it('gives the blurred placeholder and the master as fallback', () => {
    expect(cfg.getPropertyImagePlaceholder(MASTER)).toBe(`${MEDIA}/${KEY}/lqip.webp`);
    expect(cfg.originalImageUrl(`${MEDIA}/${KEY}/c640.webp`)).toBe(MASTER);

    const img = document.createElement('img');
    img.src = `${MEDIA}/${KEY}/w640.webp`;
    expect(cfg.retryWithOriginalImage(img)).toBe(true);
    expect(img.src).toBe(MASTER);
    expect(cfg.retryWithOriginalImage(img)).toBe(false);
  });

  it('finds convention city photos in their migrated folder', () => {
    expect(cfg.getCityImageUrl('Novi Sad', { country: 'Serbia', width: 400, height: 300 })).toBe(
      `${MEDIA}/cities/convention/city-serbia-novi-sad/c640.webp`
    );
  });

  it('still handles legacy Cloudinary photos', () => {
    expect(cfg.optimizeCloudinaryUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg', { width: 480 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/t_be_w480/v1/a.jpg'
    );
  });
});
