import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

/**
 * Photos on our R2 media CDN: the database stores `…/original.jpg` and every
 * display helper swaps in a stored size from the same folder — never one
 * larger than the photo has (the folder's `_w…` cap). A size that fails falls
 * back to the JPEG master.
 */
const MEDIA = 'https://media.example.com';
const KEY = 'users/zani-dalipi_64a1b2c3d4e5f6a7b8c9d0e1/listings/house-in-split_6650aa11bb22cc33dd44ee55/photos/0abc123';
const MASTER = `${MEDIA}/${KEY}/original.jpg`;
const AVATAR_KEY = 'users/zani-dalipi_64a1b2c3d4e5f6a7b8c9d0e1/avatar/0mv436obnb88a74cc_w640';

type Config = typeof import('../../config/mediaConfig');
let cfg: Config;

beforeAll(async () => {
  vi.stubEnv('VITE_MEDIA_CDN_URL', `${MEDIA}/`);
  vi.resetModules();
  cfg = await import('../../config/mediaConfig');
  const { installCdnImageFallback } = await import('../shared/utils/cdnImageFallback');
  installCdnImageFallback();
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

  it('picks a stored width for each request', () => {
    expect(cfg.optimizeImageUrl(MASTER, { width: 600 })).toBe(`${MEDIA}/${KEY}/w640.webp`);
    expect(cfg.optimizeImageUrl(MASTER, { width: 1000 })).toBe(`${MEDIA}/${KEY}/w1280.webp`);
    expect(cfg.optimizeImageUrl(MASTER, { width: 5000 })).toBe(`${MEDIA}/${KEY}/w1920.webp`);
    // a box: wide enough that a 16:9 photo covers it with object-fit: cover
    expect(cfg.optimizeImageUrl(MASTER, { width: 300, height: 300 })).toBe(`${MEDIA}/${KEY}/w640.webp`);
    expect(cfg.optimizeImageUrl(MASTER, { width: 40, blur: 400 })).toBe(`${MEDIA}/${KEY}/lqip.webp`);
    // share cards get the JPEG master
    expect(cfg.optimizeImageUrl(MASTER, { width: 1200, height: 630, format: 'jpg' })).toBe(MASTER);
    // already a size → resized from the same folder, never stacked
    expect(cfg.optimizeImageUrl(`${MEDIA}/${KEY}/w320.webp`, { width: 1600 })).toBe(`${MEDIA}/${KEY}/w1920.webp`);
  });

  it('never asks for a size larger than the photo has', () => {
    const avatar = `${MEDIA}/${AVATAR_KEY}/original.jpg`;
    expect(cfg.optimizeImageUrl(avatar, { width: 96 })).toBe(`${MEDIA}/${AVATAR_KEY}/w160.webp`);
    expect(cfg.optimizeImageUrl(avatar, { width: 1600 })).toBe(`${MEDIA}/${AVATAR_KEY}/w640.webp`);
    expect(cfg.imageSrcSet(avatar, [320, 800, 1920])).toBe(
      `${MEDIA}/${AVATAR_KEY}/w320.webp 320w, ${MEDIA}/${AVATAR_KEY}/w640.webp 640w`
    );
  });

  it('serves photos on an R2 public bucket address from their stored sizes too', () => {
    const R2 = 'https://pub-85ad6e6f9bd346a89e1a2f78704b85b0.r2.dev';
    const photo = `${R2}/users/u/listings/l/photos/p1/original.jpg`;
    expect(cfg.isMediaCdnUrl(photo)).toBe(true);
    expect(cfg.optimizeImageUrl(photo, { width: 600 })).toBe(`${R2}/users/u/listings/l/photos/p1/w640.webp`);
    expect(cfg.getPropertyImagePlaceholder(photo)).toBe(`${R2}/users/u/listings/l/photos/p1/lqip.webp`);
    // anything else on r2.dev (not our layout) is just an external image
    expect(cfg.isMediaCdnUrl(`${R2}/random/file.png`)).toBe(false);
  });

  it('never sends our photos through the image proxy', () => {
    expect(cfg.shouldProxyImage(MASTER)).toBe(false);
  });

  it('builds a srcset of distinct stored widths', () => {
    expect(cfg.imageSrcSet(MASTER, [300, 320, 800])).toBe(
      `${MEDIA}/${KEY}/w320.webp 320w, ${MEDIA}/${KEY}/w1280.webp 1280w`
    );
  });

  it('gives the blurred placeholder and falls back to the master', () => {
    expect(cfg.getPropertyImagePlaceholder(MASTER)).toBe(`${MEDIA}/${KEY}/lqip.webp`);
    expect(cfg.originalImageUrl(`${MEDIA}/${KEY}/w640.webp`)).toBe(MASTER);

    const img = document.createElement('img');
    const componentOnError = vi.fn();
    img.addEventListener('error', componentOnError);
    img.src = `${MEDIA}/${KEY}/w640.webp`;
    document.body.appendChild(img);
    img.dispatchEvent(new Event('error'));
    expect(img.src).toBe(MASTER);
    expect(componentOnError).not.toHaveBeenCalled();
    img.dispatchEvent(new Event('error'));
    expect(componentOnError).toHaveBeenCalledTimes(1);
    img.remove();
  });

  it('finds curated city photos in their R2 folder', () => {
    expect(cfg.getCityImageUrl('Novi Sad', { country: 'Serbia', width: 400, height: 300 })).toBe(
      `${MEDIA}/cities/convention/city-serbia-novi-sad/w640.webp`
    );
    expect(cfg.getCityImagePlaceholder('Novi Sad', 'Serbia')).toBe(`${MEDIA}/cities/convention/city-serbia-novi-sad/lqip.webp`);
  });

});

describe('images still on Cloudinary', () => {
  const CLD = 'https://res.cloudinary.com/dh8tbq8wy/image/upload';
  const PHOTO = `${CLD}/t_be_w1080/v17/balkan-estate/users/z/listings/p/photos/ph1.jpg`;

  it('are served from Cloudinary through its named presets, never our proxy', () => {
    expect(cfg.shouldProxyImage(PHOTO)).toBe(false);
    expect(cfg.optimizeImageUrl(PHOTO, { width: 600 })).toBe(`${CLD}/t_be_w640/v17/balkan-estate/users/z/listings/p/photos/ph1.jpg`);
    expect(cfg.optimizeImageUrl(PHOTO, { width: 400, height: 300 })).toBe(`${CLD}/t_be_r4x3_w480/v17/balkan-estate/users/z/listings/p/photos/ph1.jpg`);
    expect(cfg.optimizeImageUrl(PHOTO, { width: 1200, height: 630, format: 'jpg' })).toBe(`${CLD}/t_be_og/v17/balkan-estate/users/z/listings/p/photos/ph1.jpg`);
    expect(cfg.getPropertyImagePlaceholder(PHOTO)).toBe(`${CLD}/t_be_lqip/v17/balkan-estate/users/z/listings/p/photos/ph1.jpg`);
  });

  it('get a srcset of preset widths and fall back to the original', () => {
    expect(cfg.imageSrcSet(PHOTO, [300, 320, 800])).toBe(
      `${CLD}/t_be_w320/v17/balkan-estate/users/z/listings/p/photos/ph1.jpg 320w, ${CLD}/t_be_w800/v17/balkan-estate/users/z/listings/p/photos/ph1.jpg 800w`
    );
    expect(cfg.originalImageUrl(PHOTO)).toBe(`${CLD}/v17/balkan-estate/users/z/listings/p/photos/ph1.jpg`);
  });

  it('leaves private Cloudinary documents untouched', () => {
    const doc = 'https://res.cloudinary.com/dh8tbq8wy/image/authenticated/s--abc--/v1/balkan-estate/doc.jpg';
    expect(cfg.optimizeImageUrl(doc, { width: 400 })).toBe(doc);
  });
});

describe('other hosts', () => {
  it('treats any other image host as external (resized by our proxy)', () => {
    expect(cfg.optimizeImageUrl('https://feeds.example.com/a.jpg', { width: 480 })).toContain('/image-proxy?url=');
  });
});
